/**
 * Batch queue utility - chunks BullMQ addBulk calls to prevent Redis timeout
 */

import { renderQueue } from '@/lib/queue';
import { BULK_CHUNK_SIZE } from './types';

interface BatchRenderJob {
  renderId: string;
  templateId: string;
  mergeData: Record<string, unknown>;
  batchId: string;
  batchIndex: number;
  userId: string;
  organizationId: string;
}

/**
 * Chunks an array into smaller arrays of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Queue batch renders with automatic chunking to prevent Redis errors
 *
 * @param batchId - Batch ID to link renders to
 * @param templateId - Template to render
 * @param mergeDataArray - Array of merge data (one per render)
 * @param userId - User ID creating the batch
 * @param organizationId - Organization ID
 * @returns Array of queued job IDs
 */
export async function queueBatchRenders(
  batchId: string,
  templateId: string,
  mergeDataArray: Record<string, unknown>[],
  userId: string,
  organizationId: string
): Promise<string[]> {
  // Prepare all jobs with pre-created render IDs
  const jobs = mergeDataArray.map((mergeData, index) => {
    const renderId = `render_${batchId}_${index}`;
    return {
      name: 'render-video',
      data: {
        renderId,
        templateId,
        mergeData,
        batchId,
        batchIndex: index,
        userId,
        organizationId,
      },
      opts: {
        jobId: renderId,
      },
    };
  });

  // Chunk jobs into groups of BULK_CHUNK_SIZE (100)
  const chunks = chunkArray(jobs, BULK_CHUNK_SIZE);

  // Add each chunk sequentially to prevent max command size errors
  const allJobIds: string[] = [];
  for (const chunk of chunks) {
    const queuedJobs = await renderQueue.addBulk(chunk);
    allJobIds.push(...queuedJobs.map((job) => job.id ?? ''));
  }

  return allJobIds;
}
