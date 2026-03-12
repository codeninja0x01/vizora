import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';

/**
 * GET /api/v1/renders/:id - Poll render status
 * Returns current status with status-dependent response format
 */
async function getHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Extract render ID from URL path
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const renderId = segments[segments.length - 1];

    if (!renderId) {
      return Response.json(
        { error: 'Bad request', message: 'Render ID required' },
        { status: 400 }
      );
    }

    // Fetch render from database (DB is source of truth)
    const render = await prisma.render.findUnique({
      where: { id: renderId },
    });

    // Check existence and ownership
    if (!render) {
      return Response.json(
        { error: 'Not found', message: 'Render not found' },
        { status: 404 }
      );
    }

    if (render.organizationId !== context.organizationId) {
      // Don't leak existence - return 404 for unauthorized access
      return Response.json(
        { error: 'Not found', message: 'Render not found' },
        { status: 404 }
      );
    }

    // Build status-dependent response
    const response: any = {
      id: render.id,
      status: render.status,
      templateId: render.templateId,
      queuedAt: render.queuedAt.toISOString(),
    };

    // Add startedAt if available
    if (render.startedAt) {
      response.startedAt = render.startedAt.toISOString();
    }

    // Status-specific fields
    if (render.status === 'completed') {
      if (render.completedAt) {
        response.completedAt = render.completedAt.toISOString();
      }
      if (render.outputUrl) {
        response.outputUrl = render.outputUrl;
      }
      return Response.json(response, { status: 200 });
    }

    if (render.status === 'failed') {
      if (render.failedAt) {
        response.failedAt = render.failedAt.toISOString();
      }
      if (render.errorCategory || render.errorMessage) {
        response.error = {
          category: render.errorCategory,
          message: render.errorMessage,
        };
      }
      return Response.json(response, { status: 422 });
    }

    // For queued or active status, add Retry-After header
    if (render.status === 'queued' || render.status === 'active') {
      return Response.json(response, {
        status: 200,
        headers: {
          'Retry-After': '5',
        },
      });
    }

    // Default response for any other status
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/v1/renders/:id error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch render status',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handler
export const GET = withApiAuth(getHandler);
