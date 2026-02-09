/**
 * Batch progress tracking - aggregates render statuses for batch completion
 */

import { prisma } from '@/lib/db';
import type { BatchProgress, BatchStatus } from './types';

/**
 * Get current batch progress by aggregating render statuses
 *
 * Uses efficient groupBy query to minimize database load
 *
 * @param batchId - Batch ID to track
 * @returns Batch progress with status counts and percentage
 */
export async function getBatchProgress(
  batchId: string
): Promise<BatchProgress> {
  // Efficient single-query aggregation
  const statusCounts = await prisma.render.groupBy({
    by: ['status'],
    where: { batchId },
    _count: true,
  });

  // Get total count from batch record
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { totalCount: true },
  });

  const total = batch?.totalCount ?? 0;

  // Initialize counts
  let queued = 0;
  let processing = 0;
  let completed = 0;
  let failed = 0;

  // Aggregate from groupBy results
  for (const { status, _count } of statusCounts) {
    switch (status) {
      case 'queued':
        queued = _count;
        break;
      case 'processing':
        processing = _count;
        break;
      case 'completed':
        completed = _count;
        break;
      case 'failed':
        failed = _count;
        break;
    }
  }

  // Compute progress percentage
  const percentComplete =
    total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  return {
    batchId,
    total,
    queued,
    processing,
    completed,
    failed,
    percentComplete,
  };
}

/**
 * Update batch status based on current render states
 *
 * Status transitions:
 * - All completed -> 'completed'
 * - All failed -> 'failed'
 * - Some failed, rest done -> 'partial_failure'
 * - Any active/queued -> 'processing'
 *
 * @param batchId - Batch ID to update
 */
export async function updateBatchStatus(batchId: string): Promise<void> {
  const progress = await getBatchProgress(batchId);

  let status: BatchStatus;
  let completedAt: Date | null = null;

  // Determine batch status
  if (progress.completed === progress.total) {
    status = 'completed';
    completedAt = new Date();
  } else if (progress.failed === progress.total) {
    status = 'failed';
    completedAt = new Date();
  } else if (
    progress.failed > 0 &&
    progress.completed + progress.failed === progress.total
  ) {
    status = 'partial_failure';
    completedAt = new Date();
  } else if (progress.queued > 0 || progress.processing > 0) {
    status = 'processing';
  } else {
    status = 'queued';
  }

  // Update batch record
  await prisma.batch.update({
    where: { id: batchId },
    data: {
      status,
      completedAt,
    },
  });
}
