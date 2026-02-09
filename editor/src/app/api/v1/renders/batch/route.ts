import { z } from 'zod';
import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import { validateMergeData } from '@/lib/template-schema';
import { queueBatchRenders } from '@/lib/batch/queue';
import { BATCH_SIZE_LIMITS } from '@/lib/batch/types';
import type { MergeField } from '@/types/template';

// Request validation schema for POST /api/v1/renders/batch
const batchRenderSchema = z.object({
  templateId: z.string().min(1),
  mergeDataArray: z.array(z.record(z.string(), z.unknown())).min(1),
  options: z
    .object({
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      fps: z.number().int().min(1).max(120).optional(),
      quality: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

// Tier-based queue limits (same as single renders)
const tierLimits: Record<string, number> = {
  free: 5,
  pro: 50,
  enterprise: Infinity,
};

/**
 * POST /api/v1/renders/batch - Submit a batch render job
 * Returns 202 Accepted with batch ID and Location header
 */
async function postHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = batchRenderSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { templateId, mergeDataArray, options } = validation.data;

    // Check batch size against tier limits
    const maxBatchSize =
      BATCH_SIZE_LIMITS[context.tier as keyof typeof BATCH_SIZE_LIMITS] ?? 10;
    if (mergeDataArray.length > maxBatchSize) {
      return Response.json(
        {
          error: 'Batch size limit exceeded',
          message: `Your ${context.tier} plan allows up to ${maxBatchSize} renders per batch.`,
          limit: maxBatchSize,
          submitted: mergeDataArray.length,
        },
        { status: 400 }
      );
    }

    // Fetch template and verify access
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        mergeFields: true,
        mergeSchema: true,
        organizationId: true,
        isPublic: true,
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

    // Eager validation of ALL merge data rows before queuing ANY renders
    const mergeFields = template.mergeFields as unknown as MergeField[];
    const invalidRows: Array<{ index: number; errors: any }> = [];

    for (let i = 0; i < mergeDataArray.length; i++) {
      const mergeValidation = validateMergeData(mergeFields, mergeDataArray[i]);
      if (!mergeValidation.success) {
        invalidRows.push({
          index: i,
          errors: mergeValidation.errors,
        });
      }
    }

    // If ANY row fails validation, reject the entire batch
    if (invalidRows.length > 0) {
      return Response.json(
        {
          error: 'Validation failed',
          message: `${invalidRows.length} row(s) failed validation`,
          invalidRows,
        },
        { status: 400 }
      );
    }

    // Enforce per-tier queue limits (check current active renders)
    const maxQueued = tierLimits[context.tier] ?? 5;
    const activeCount = await prisma.render.count({
      where: {
        organizationId: context.organizationId,
        status: { in: ['queued', 'processing'] },
      },
    });

    // Check if adding this batch would exceed the limit
    if (activeCount + mergeDataArray.length > maxQueued) {
      return Response.json(
        {
          error: 'Queue limit reached',
          message: `Your ${context.tier} plan allows up to ${maxQueued} concurrent render jobs. You currently have ${activeCount} active renders.`,
          limit: maxQueued,
          current: activeCount,
          wouldExceedBy: activeCount + mergeDataArray.length - maxQueued,
        },
        { status: 429 }
      );
    }

    // Create Batch record in database
    const batch = await prisma.batch.create({
      data: {
        organizationId: context.organizationId,
        templateId,
        totalCount: mergeDataArray.length,
        status: 'queued',
      },
    });

    // Create all Render records in database (source of truth, before queue)
    const renders = await Promise.all(
      mergeDataArray.map((mergeData, index) =>
        prisma.render.create({
          data: {
            status: 'queued',
            templateId,
            userId: context.userId,
            organizationId: context.organizationId,
            mergeData: mergeData as any,
            batchId: batch.id,
            batchIndex: index,
            queuedAt: new Date(),
          },
        })
      )
    );

    // Queue all renders via queueBatchRenders (uses chunked addBulk)
    try {
      await queueBatchRenders(
        renders.map((render, index) => ({
          id: render.id,
          mergeData: mergeDataArray[index],
          batchIndex: index,
        })),
        batch.id,
        templateId,
        context.userId,
        context.organizationId
      );
    } catch (queueError) {
      console.error('Failed to queue batch renders:', queueError);

      // Update batch and all renders to failed status
      await prisma.batch.update({
        where: { id: batch.id },
        data: { status: 'failed' },
      });

      await prisma.render.updateMany({
        where: { batchId: batch.id },
        data: {
          status: 'failed',
          errorCategory: 'INTERNAL_ERROR',
          errorMessage: 'Failed to queue batch renders',
          failedAt: new Date(),
        },
      });

      return Response.json(
        {
          error: 'Queue error',
          message: 'Failed to queue batch renders',
        },
        { status: 500 }
      );
    }

    // Return 202 Accepted with batch details
    return Response.json(
      {
        id: batch.id,
        status: 'queued',
        totalCount: mergeDataArray.length,
        templateId: templateId,
        createdAt: batch.createdAt.toISOString(),
      },
      {
        status: 202,
        headers: {
          Location: `/api/v1/batches/${batch.id}`,
          'Retry-After': '5',
        },
      }
    );
  } catch (error) {
    console.error('POST /api/v1/renders/batch error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to submit batch render job',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handler
export const POST = withApiAuth(postHandler);
