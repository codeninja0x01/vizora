import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import { getBatchProgress } from '@/lib/batch/tracker';

/**
 * GET /api/v1/batches/:id - Get batch status and progress
 * Returns batch details with live progress aggregation
 */
async function getHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Extract batch ID from URL pathname
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const batchId = pathParts[pathParts.length - 1];

    // Fetch batch from database with organization scope
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        organizationId: context.organizationId,
      },
      include: {
        template: {
          select: {
            name: true,
          },
        },
      },
    });

    // Return 404 if not found (don't leak existence)
    if (!batch) {
      return Response.json(
        { error: 'Not found', message: 'Batch not found' },
        { status: 404 }
      );
    }

    // Get live progress from tracker
    const progress = await getBatchProgress(batchId);

    // Determine if batch is in terminal state
    const isTerminal = ['completed', 'failed', 'partial_failure'].includes(
      batch.status
    );

    // Build response
    const response: any = {
      id: batch.id,
      status: batch.status,
      templateId: batch.templateId,
      templateName: batch.template?.name || null,
      totalCount: batch.totalCount,
      progress: {
        queued: progress.queued,
        processing: progress.processing,
        completed: progress.completed,
        failed: progress.failed,
        percentComplete: progress.percentComplete,
      },
      createdAt: batch.createdAt.toISOString(),
      completedAt: batch.completedAt?.toISOString() || null,
    };

    // Add Retry-After header if batch is not in terminal state
    const headers: Record<string, string> = {};
    if (!isTerminal) {
      headers['Retry-After'] = '5';
    }

    return Response.json(response, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('GET /api/v1/batches/:id error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch batch status',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handler
export const GET = withApiAuth(getHandler);
