import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import { generateWebhookSecret } from '@/lib/webhooks/signature';

// Extract webhook ID from URL path (segment before "rotate-secret")
function getWebhookIdFromUrl(url: string): string | null {
  const match = url.match(/\/api\/v1\/webhooks\/([^/?]+)\/rotate-secret/);
  return match ? match[1] : null;
}

/**
 * POST /api/v1/webhooks/:id/rotate-secret - Rotate webhook secret
 * Generates new secret and returns it (shown exactly once)
 * Resets consecutiveFailures counter
 */
async function postHandler(
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

    // Generate new secure webhook secret
    const newSecret = generateWebhookSecret();

    // Update secret and reset failure counter
    await prisma.webhookConfig.update({
      where: { id: webhookId },
      data: {
        secret: newSecret,
        consecutiveFailures: 0,
      },
    });

    // Return webhook ID and new secret (only time new secret is exposed)
    return Response.json({
      id: webhookId,
      secret: newSecret,
      rotatedAt: new Date().toISOString(),
      _note: 'Store this secret securely. It will not be shown again.',
    });
  } catch (error) {
    console.error('POST /api/v1/webhooks/:id/rotate-secret error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to rotate webhook secret',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handler
export const POST = withApiAuth(postHandler);
