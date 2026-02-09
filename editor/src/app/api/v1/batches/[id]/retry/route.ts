import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import { queueBatchRenders } from '@/lib/batch/queue';
import { updateBatchStatus } from '@/lib/batch/tracker';

/**
 * POST /api/v1/batches/:id/retry - Retry failed renders in a batch
 * Re-queues only failed renders, returns 202 Accepted with retry count
 */
async function postHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Extract batch ID from URL pathname
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const batchId = pathParts[pathParts.length - 2]; // -2 because path ends with /retry

    // Fetch batch from database with organization scope
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        templateId: true,
        organizationId: true,
      },
    });

    // Return 404 if not found (don't leak existence)
    if (!batch) {
      return Response.json(
        { error: 'Not found', message: 'Batch not found' },
        { status: 404 }
      );
    }

    // Find all failed renders for this batch
    const failedRenders = await prisma.render.findMany({
      where: {
        batchId,
        status: 'failed',
      },
      select: {
        id: true,
        mergeData: true,
        batchIndex: true,
      },
    });

    // Return 400 if no failed renders to retry
    if (failedRenders.length === 0) {
      return Response.json(
        {
          error: 'Bad request',
          message: 'No failed renders to retry',
        },
        { status: 400 }
      );
    }

    // Reset failed renders to 'queued' status
    await prisma.render.updateMany({
      where: {
        batchId,
        status: 'failed',
      },
      data: {
        status: 'queued',
        errorCategory: null,
        errorMessage: null,
        failedAt: null,
        queuedAt: new Date(),
      },
    });

    // Re-queue failed renders via queueBatchRenders
    // Filter out any renders with null batchIndex (shouldn't exist in batches)
    const rendersToRetry = failedRenders
      .filter((render) => render.batchIndex !== null)
      .map((render) => ({
        id: render.id,
        mergeData: render.mergeData as Record<string, unknown>,
        batchIndex: render.batchIndex as number,
      }));

    try {
      await queueBatchRenders(
        rendersToRetry,
        batchId,
        batch.templateId,
        context.userId,
        context.organizationId
      );
    } catch (queueError) {
      console.error('Failed to re-queue failed renders:', queueError);

      // Reset renders back to failed status
      await prisma.render.updateMany({
        where: {
          id: { in: failedRenders.map((r) => r.id) },
        },
        data: {
          status: 'failed',
          errorCategory: 'INTERNAL_ERROR',
          errorMessage: 'Failed to re-queue renders',
          failedAt: new Date(),
        },
      });

      return Response.json(
        {
          error: 'Queue error',
          message: 'Failed to re-queue failed renders',
        },
        { status: 500 }
      );
    }

    // Update batch status back to 'processing'
    await updateBatchStatus(batchId);

    // Return 202 Accepted with retry count
    return Response.json(
      {
        batchId,
        retriedCount: failedRenders.length,
        status: 'processing',
      },
      {
        status: 202,
        headers: {
          'Retry-After': '5',
        },
      }
    );
  } catch (error) {
    console.error('POST /api/v1/batches/:id/retry error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to retry batch renders',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handler
export const POST = withApiAuth(postHandler);
