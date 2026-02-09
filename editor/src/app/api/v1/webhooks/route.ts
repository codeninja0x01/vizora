import { z } from 'zod';
import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import { validateWebhookUrl } from '@/lib/webhooks/validator';
import { generateWebhookSecret } from '@/lib/webhooks/signature';

// Request validation schema for POST /api/v1/webhooks
const registerWebhookSchema = z.object({
  url: z.string().url(),
  enabled: z.boolean().optional().default(true),
});

/**
 * POST /api/v1/webhooks - Register a new webhook
 * Returns webhook config with secret (shown exactly once)
 */
async function postHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = registerWebhookSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { url, enabled } = validation.data;

    // Validate URL with SSRF protection
    const urlValidation = validateWebhookUrl(url);
    if (!urlValidation.valid) {
      return Response.json(
        {
          error: 'Invalid webhook URL',
          message: urlValidation.error || 'URL validation failed',
        },
        { status: 400 }
      );
    }

    // Check webhook limit per organization (max 5)
    const existingCount = await prisma.webhookConfig.count({
      where: { organizationId: context.organizationId },
    });

    if (existingCount >= 5) {
      return Response.json(
        {
          error: 'Webhook limit reached',
          message:
            'Maximum 5 webhooks allowed per organization. Delete an existing webhook to create a new one.',
          limit: 5,
          current: existingCount,
        },
        { status: 429 }
      );
    }

    // Generate secure webhook secret
    const secret = generateWebhookSecret();

    // Create webhook config
    const webhook = await prisma.webhookConfig.create({
      data: {
        organizationId: context.organizationId,
        url,
        secret,
        enabled,
      },
      select: {
        id: true,
        url: true,
        secret: true,
        enabled: true,
        createdAt: true,
      },
    });

    // Return webhook with secret (only time secret is exposed)
    return Response.json(
      {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        enabled: webhook.enabled,
        createdAt: webhook.createdAt.toISOString(),
        _note: 'Store this secret securely. It will not be shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/webhooks error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to register webhook',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/webhooks - List webhooks for authenticated organization
 * Returns webhooks WITHOUT secret field (for security)
 */
async function getHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Query webhooks scoped to organization
    const webhooks = await prisma.webhookConfig.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        enabled: true,
        lastDeliveryAt: true,
        lastSuccessAt: true,
        lastFailureAt: true,
        consecutiveFailures: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Map to response format with ISO timestamps
    const responseWebhooks = webhooks.map((webhook) => ({
      id: webhook.id,
      url: webhook.url,
      enabled: webhook.enabled,
      lastDeliveryAt: webhook.lastDeliveryAt?.toISOString() ?? null,
      lastSuccessAt: webhook.lastSuccessAt?.toISOString() ?? null,
      lastFailureAt: webhook.lastFailureAt?.toISOString() ?? null,
      consecutiveFailures: webhook.consecutiveFailures,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    }));

    return Response.json({ webhooks: responseWebhooks });
  } catch (error) {
    console.error('GET /api/v1/webhooks error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch webhooks',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handlers
export const POST = withApiAuth(postHandler);
export const GET = withApiAuth(getHandler);
