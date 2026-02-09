import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import archiver from 'archiver';

// 5-minute timeout for large batch ZIP generation
export const maxDuration = 300;

/**
 * GET /api/v1/batches/:id/zip - Stream ZIP archive of all completed batch renders
 *
 * Generates a ZIP containing all completed renders in batch index order.
 * Skips expired/missing outputs and includes manifest listing omissions.
 *
 * Uses archiver with streaming to avoid buffering entire archive in memory.
 */
async function getHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Extract batch ID from URL path
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const batchId = segments[segments.length - 2]; // /batches/[id]/zip -> second from end

    if (!batchId) {
      return Response.json(
        { error: 'Bad request', message: 'Batch ID required' },
        { status: 400 }
      );
    }

    // Fetch batch with organization scope
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        organizationId: context.organizationId,
      },
      include: {
        template: {
          select: { name: true },
        },
      },
    });

    // Check existence and ownership
    if (!batch) {
      return Response.json(
        { error: 'Not found', message: 'Batch not found' },
        { status: 404 }
      );
    }

    // Check if batch is ready for download
    if (batch.status !== 'completed' && batch.status !== 'partial_failure') {
      return Response.json(
        {
          error: 'Bad request',
          message: 'Batch not ready for download',
          status: batch.status,
        },
        { status: 400 }
      );
    }

    // Fetch all completed renders for this batch
    const renders = await prisma.render.findMany({
      where: {
        batchId,
        status: 'completed',
        outputUrl: { not: null },
      },
      select: {
        id: true,
        outputUrl: true,
        batchIndex: true,
      },
      orderBy: { batchIndex: 'asc' },
    });

    // If no completed renders, return 404
    if (renders.length === 0) {
      return Response.json(
        { error: 'Not found', message: 'No completed renders available' },
        { status: 404 }
      );
    }

    // Track skipped renders for manifest
    const skipped: string[] = [];

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Balanced compression
    });

    // Create ReadableStream bridging archiver to Web API Response
    const stream = new ReadableStream({
      start(controller) {
        // Pipe archiver chunks to stream controller
        archive.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        archive.on('end', () => {
          controller.close();
        });

        archive.on('error', (err) => {
          console.error('[ZIP] Archiver error:', err);
          controller.error(err);
        });

        // Add files to archive asynchronously
        (async () => {
          try {
            for (const render of renders) {
              try {
                // Fetch render output from R2/CDN
                const response = await fetch(render.outputUrl!);

                if (!response.ok || !response.body) {
                  console.warn(
                    `[ZIP] Failed to fetch ${render.id}: ${response.status}`
                  );
                  skipped.push(render.id);
                  continue;
                }

                // Use zero-padded batch index for ordered filenames
                const paddedIndex = String(render.batchIndex ?? 0).padStart(
                  4,
                  '0'
                );
                const filename = `${paddedIndex}-${render.id}.mp4`;

                // Stream file into archive
                const buffer = Buffer.from(await response.arrayBuffer());
                archive.append(buffer, { name: filename });
              } catch (error) {
                console.error(`[ZIP] Error adding ${render.id}:`, error);
                skipped.push(render.id);
              }
            }

            // Add manifest.txt if any renders were skipped
            if (skipped.length > 0) {
              const manifestContent = [
                `Batch: ${batchId}`,
                `Template: ${batch.template.name}`,
                `Total Renders: ${batch.totalCount}`,
                `Included: ${renders.length - skipped.length}`,
                `Skipped: ${skipped.length}`,
                '',
                'Skipped renders (expired or unavailable):',
                ...skipped.map((id) => `- ${id}`),
              ].join('\n');

              archive.append(manifestContent, { name: 'manifest.txt' });
            }

            // Finalize archive (triggers 'end' event)
            archive.finalize();
          } catch (error) {
            console.error(
              '[ZIP] Fatal error during archive generation:',
              error
            );
            controller.error(error);
          }
        })();
      },
    });

    // Return streaming response with download headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="batch-${batchId}.zip"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('GET /api/v1/batches/:id/zip error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate ZIP archive',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handler
export const GET = withApiAuth(getHandler);
