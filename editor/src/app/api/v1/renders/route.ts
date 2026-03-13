import { z } from 'zod';
import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { renderQueue } from '@/lib/queue';
import { validateMergeData } from '@/lib/template-schema';
import type { MergeField } from '@/types/template';
import { calculateCredits } from '@/lib/billing';
import {
  deductCreditsForRender,
  checkAndWarnLowCredits,
  getTemplateDuration,
} from '@/lib/credits';

// Request validation schema for POST /api/v1/renders
const submitRenderSchema = z.object({
  templateId: z.string().min(1),
  mergeData: z.record(z.string(), z.unknown()).default({}),
  options: z
    .object({
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      fps: z.number().int().min(1).max(120).optional(),
      quality: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

// Tier-based queue limits
const tierLimits: Record<string, number> = {
  free: 5,
  pro: 50,
  enterprise: Infinity,
};

/**
 * POST /api/v1/renders - Submit a render job
 * Returns 202 Accepted with render ID and Location header
 */
async function postHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = submitRenderSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { templateId, mergeData, options } = validation.data;

    // Fetch template and verify access
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        mergeFields: true,
        mergeSchema: true,
        organizationId: true,
        isPublic: true,
        projectData: true,
      },
    });

    if (!template) {
      return Response.json(
        { error: 'Not found', message: 'Template not found' },
        { status: 404 }
      );
    }

    // Check access: template must be public OR owned by same organization
    if (
      !template.isPublic &&
      template.organizationId !== context.organizationId
    ) {
      return Response.json(
        { error: 'Not found', message: 'Template not found' },
        { status: 404 }
      );
    }

    // Validate merge data eagerly (fail fast before queue)
    const mergeFields = template.mergeFields as unknown as MergeField[];
    const mergeValidation = validateMergeData(mergeFields, mergeData);

    if (!mergeValidation.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: mergeValidation.errors,
        },
        { status: 400 }
      );
    }

    // Enforce per-tier queue limits
    const maxQueued = tierLimits[context.tier] ?? 5;
    const activeCount = await prisma.render.count({
      where: {
        organizationId: context.organizationId,
        status: { in: ['queued', 'active'] },
      },
    });

    if (activeCount >= maxQueued) {
      return Response.json(
        {
          error: 'Queue limit reached',
          message: `Your ${context.tier} plan allows up to ${maxQueued} concurrent render jobs.`,
          limit: maxQueued,
          current: activeCount,
        },
        { status: 429 }
      );
    }

    // Check subscription status and credits BEFORE creating render record
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: context.organizationId },
      select: {
        subscriptionStatus: true,
        tier: true,
        creditBalance: true,
        monthlyAllotment: true,
      },
    });

    // Block renders if subscription is past_due
    if (org.subscriptionStatus === 'past_due') {
      return Response.json(
        {
          error: 'subscription_past_due',
          message:
            'Rendering suspended due to failed payment. Please update your payment method.',
          details: {
            action: {
              type: 'update_payment',
              url: '/dashboard/billing',
            },
          },
        },
        { status: 402 }
      );
    }

    // Calculate credits required based on template duration
    const durationSeconds = getTemplateDuration(
      template.projectData as Record<string, any>
    );
    const creditsRequired = calculateCredits(durationSeconds || 30);

    // Atomically deduct credits
    const deductResult = await deductCreditsForRender(
      context.organizationId,
      creditsRequired
    );

    if (!deductResult.success) {
      return Response.json(
        {
          error: 'insufficient_credits',
          code: 402,
          message: 'Not enough credits for this render',
          details: {
            required: deductResult.required,
            available: deductResult.available,
            shortfall: deductResult.required - deductResult.available,
            durationSeconds: durationSeconds || 30,
            actions: [
              {
                type: 'upgrade',
                label: 'Upgrade Plan',
                url: '/dashboard/billing',
              },
              {
                type: 'buy_credits',
                label: 'Buy Credit Pack',
                url: '/dashboard/billing?tab=credits',
              },
            ],
          },
        },
        { status: 402 }
      );
    }

    // Create render record in DB first (source of truth)
    const render = await prisma.render.create({
      data: {
        status: 'queued',
        templateId,
        userId: context.userId,
        organizationId: context.organizationId,
        mergeData: mergeData as any,
        queuedAt: new Date(),
      },
    });

    // Add job to BullMQ queue with render.id as jobId
    await renderQueue.add(
      'render-video',
      {
        renderId: render.id,
        templateId,
        mergeData,
        options: options || {},
        userId: context.userId,
        organizationId: context.organizationId,
        creditsDeducted: creditsRequired,
      },
      { jobId: render.id }
    );

    // Fire-and-forget low-credit warning check (don't block response)
    checkAndWarnLowCredits(context.organizationId).catch((error) => {
      console.error('Low-credit check failed:', error);
    });

    // Return 202 Accepted with Location header
    return Response.json(
      {
        id: render.id,
        status: 'queued',
        templateId: templateId,
        createdAt: render.queuedAt.toISOString(),
        creditsDeducted: creditsRequired,
        creditsRemaining: deductResult.newBalance,
      },
      {
        status: 202,
        headers: {
          Location: `/api/v1/renders/${render.id}`,
          'Retry-After': '5',
        },
      }
    );
  } catch (error) {
    console.error('POST /api/v1/renders error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to submit render job',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/renders - List renders with filtering and pagination
 */
async function getHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse query parameters
    const status = url.searchParams.get('status');
    const templateId = url.searchParams.get('templateId');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');
    const cursor = parseInt(url.searchParams.get('cursor') || '0', 10);
    const limitParam = parseInt(url.searchParams.get('limit') || '20', 10);
    const limit = Math.min(limitParam, 100); // Cap at 100

    // Build where clause with organization scope
    const where: Prisma.RenderWhereInput = {
      organizationId: context.organizationId,
    };

    // Apply optional filters
    if (
      status &&
      ['queued', 'active', 'completed', 'failed'].includes(status)
    ) {
      where.status = status;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    const queuedAtFilter: Prisma.DateTimeFilter<'Render'> = {};
    let hasQueuedAtFilter = false;

    if (fromDate) {
      const date = new Date(fromDate);
      if (!Number.isNaN(date.getTime())) {
        queuedAtFilter.gte = date;
        hasQueuedAtFilter = true;
      }
    }

    if (toDate) {
      const date = new Date(toDate);
      if (!Number.isNaN(date.getTime())) {
        queuedAtFilter.lte = date;
        hasQueuedAtFilter = true;
      }
    }

    if (hasQueuedAtFilter) {
      where.queuedAt = queuedAtFilter;
    }

    // Fetch renders with pagination
    const renders = await prisma.render.findMany({
      where,
      orderBy: { queuedAt: 'desc' },
      skip: cursor,
      take: limit + 1, // Fetch one extra to check for more
      select: {
        id: true,
        status: true,
        templateId: true,
        queuedAt: true,
        startedAt: true,
        completedAt: true,
        failedAt: true,
        outputUrl: true,
        errorCategory: true,
        errorMessage: true,
      },
    });

    // Check if there are more results
    const hasMore = renders.length > limit;
    const items = hasMore ? renders.slice(0, limit) : renders;
    const nextCursor = hasMore ? cursor + limit : null;

    // Map to response format (exclude mergeData)
    const responseItems = items.map((render) => {
      const item: Record<string, unknown> = {
        id: render.id,
        status: render.status,
        templateId: render.templateId,
        queuedAt: render.queuedAt.toISOString(),
      };

      if (render.startedAt) {
        item.startedAt = render.startedAt.toISOString();
      }

      if (render.status === 'completed' && render.completedAt) {
        item.completedAt = render.completedAt.toISOString();
        if (render.outputUrl) {
          item.outputUrl = render.outputUrl;
        }
      }

      if (render.status === 'failed' && render.failedAt) {
        item.failedAt = render.failedAt.toISOString();
        if (render.errorCategory || render.errorMessage) {
          item.error = {
            category: render.errorCategory,
            message: render.errorMessage,
          };
        }
      }

      return item;
    });

    return Response.json({
      items: responseItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
        limit,
      },
    });
  } catch (error) {
    console.error('GET /api/v1/renders error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch renders',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handlers
export const POST = withApiAuth(postHandler);
export const GET = withApiAuth(getHandler);
