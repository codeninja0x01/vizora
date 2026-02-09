import { z } from 'zod';
import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import { validateWebhookUrl } from '@/lib/webhooks/validator';

// Extract webhook ID from URL path
function getWebhookIdFromUrl(url: string): string | null {
  const match = url.match(/\/api\/v1\/webhooks\/([^/?]+)(?:\/|$|\?)/);
  return match ? match[1] : null;
}

// Request validation schema for PATCH /api/v1/webhooks/:id
const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  enabled: z.boolean().optional(),
});

/**
 * GET /api/v1/webhooks/:id - Get a single webhook
 * Returns webhook WITHOUT secret field (for security)
 */
async function getHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    const webhookId = getWebhookIdFromUrl(request.url);

    if (!webhookId) {
      return Response.json(
        { error: 'Invalid request', message: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Find webhook by id AND organizationId (prevent cross-org access)
    const webhook = await prisma.webhookConfig.findFirst({
      where: {
        id: webhookId,
        organizationId: context.organizationId,
      },
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

    if (!webhook) {
      return Response.json(
        { error: 'Not found', message: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Return webhook with ISO timestamps
    return Response.json({
      id: webhook.id,
      url: webhook.url,
      enabled: webhook.enabled,
      lastDeliveryAt: webhook.lastDeliveryAt?.toISOString() ?? null,
      lastSuccessAt: webhook.lastSuccessAt?.toISOString() ?? null,
      lastFailureAt: webhook.lastFailureAt?.toISOString() ?? null,
      consecutiveFailures: webhook.consecutiveFailures,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/v1/webhooks/:id error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch webhook',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/webhooks/:id - Update webhook URL or enabled status
 * Returns updated webhook WITHOUT secret field
 */
async function patchHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    const webhookId = getWebhookIdFromUrl(request.url);

    if (!webhookId) {
      return Response.json(
        { error: 'Invalid request', message: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateWebhookSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { url, enabled } = validation.data;

    // If url provided, validate with SSRF protection
    if (url) {
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
    }

    // Find webhook by id AND organizationId (prevent cross-org access)
    const existingWebhook = await prisma.webhookConfig.findFirst({
      where: {
        id: webhookId,
        organizationId: context.organizationId,
      },
    });

    if (!existingWebhook) {
      return Response.json(
        { error: 'Not found', message: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Build update data with only provided fields
    const updateData: { url?: string; enabled?: boolean } = {};
    if (url !== undefined) updateData.url = url;
    if (enabled !== undefined) updateData.enabled = enabled;

    // Update webhook
    const updatedWebhook = await prisma.webhookConfig.update({
      where: { id: webhookId },
      data: updateData,
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

    // Return updated webhook with ISO timestamps
    return Response.json({
      id: updatedWebhook.id,
      url: updatedWebhook.url,
      enabled: updatedWebhook.enabled,
      lastDeliveryAt: updatedWebhook.lastDeliveryAt?.toISOString() ?? null,
      lastSuccessAt: updatedWebhook.lastSuccessAt?.toISOString() ?? null,
      lastFailureAt: updatedWebhook.lastFailureAt?.toISOString() ?? null,
      consecutiveFailures: updatedWebhook.consecutiveFailures,
      createdAt: updatedWebhook.createdAt.toISOString(),
      updatedAt: updatedWebhook.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PATCH /api/v1/webhooks/:id error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to update webhook',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/webhooks/:id - Delete a webhook
 * Returns 204 No Content on success
 */
async function deleteHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    const webhookId = getWebhookIdFromUrl(request.url);

    if (!webhookId) {
      return Response.json(
        { error: 'Invalid request', message: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Find webhook by id AND organizationId (prevent cross-org access)
    const existingWebhook = await prisma.webhookConfig.findFirst({
      where: {
        id: webhookId,
        organizationId: context.organizationId,
      },
    });

    if (!existingWebhook) {
      return Response.json(
        { error: 'Not found', message: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Delete webhook
    await prisma.webhookConfig.delete({
      where: { id: webhookId },
    });

    // Return 204 No Content (empty body)
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/v1/webhooks/:id error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to delete webhook',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handlers
export const GET = withApiAuth(getHandler);
export const PATCH = withApiAuth(patchHandler);
export const DELETE = withApiAuth(deleteHandler);
