'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Get renders for the current user with filtering, search, and cursor pagination
 *
 * @param filters - Optional status, search, cursor, and limit filters
 * @returns Paginated render list with metadata
 */
export async function getRenders(filters?: {
  status?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Get active organization from session
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error('No active organization');
  }

  // Build where clause
  const where: any = {
    organizationId: activeOrgId,
  };

  // Filter by status (map UI status to DB status)
  if (filters?.status && filters.status !== 'all') {
    // UI uses "rendering" but DB uses "active"
    const dbStatus = filters.status === 'rendering' ? 'active' : filters.status;
    where.status = dbStatus;
  }

  // Search by template name or render ID
  if (filters?.search) {
    where.OR = [
      {
        id: {
          startsWith: filters.search,
        },
      },
      {
        template: {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      },
    ];
  }

  // Cursor pagination
  const PAGE_SIZE = filters?.limit || 20;

  const renders = await prisma.render.findMany({
    where,
    include: {
      template: {
        select: {
          name: true,
          thumbnailUrl: true,
        },
      },
    },
    orderBy: {
      queuedAt: 'desc',
    },
    take: PAGE_SIZE + 1, // Fetch one extra to determine if there are more
    ...(filters?.cursor
      ? {
          cursor: {
            id: filters.cursor,
          },
          skip: 1, // Skip the cursor item itself
        }
      : {}),
  });

  // Determine if there are more results
  const hasMore = renders.length > PAGE_SIZE;
  const items = hasMore ? renders.slice(0, PAGE_SIZE) : renders;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  // Map to client-safe objects (serialize dates)
  return {
    items: items.map((r) => ({
      id: r.id,
      status: r.status as 'queued' | 'active' | 'completed' | 'failed',
      templateName: r.template.name,
      templateThumbnail: r.template.thumbnailUrl,
      createdAt: r.queuedAt.toISOString(),
      startedAt: r.startedAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      failedAt: r.failedAt?.toISOString() ?? null,
      outputUrl: r.outputUrl,
      errorCategory: r.errorCategory,
      errorMessage: r.errorMessage,
      resolution: null, // Will be populated when available from render options
      fileSize: null, // Will be populated when storage integration exists
      expiresAt: r.expiresAt?.toISOString() ?? null,
      deletionWarningShown: r.deletionWarningShown,
      batchId: r.batchId,
      batchIndex: r.batchIndex,
    })),
    nextCursor,
    hasMore,
  };
}

/**
 * Get batches for the current user with filtering
 *
 * @param filters - Optional status filter
 * @returns List of batches with aggregated progress
 */
export async function getBatches(filters?: { status?: string }) {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Get active organization from session
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error('No active organization');
  }

  // Build where clause
  const where: any = {
    organizationId: activeOrgId,
  };

  // Filter by status
  if (filters?.status && filters.status !== 'all') {
    where.status = filters.status;
  }

  const batches = await prisma.batch.findMany({
    where,
    include: {
      template: {
        select: {
          name: true,
          thumbnailUrl: true,
        },
      },
      renders: {
        select: {
          id: true,
          status: true,
          batchIndex: true,
          outputUrl: true,
          errorMessage: true,
          completedAt: true,
          failedAt: true,
        },
        orderBy: { batchIndex: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Map to serializable format with computed progress
  return batches.map((b) => ({
    id: b.id,
    type: 'batch' as const,
    templateName: b.template.name,
    templateThumbnail: b.template.thumbnailUrl,
    totalCount: b.totalCount,
    status: b.status as
      | 'queued'
      | 'processing'
      | 'completed'
      | 'partial_failure'
      | 'failed',
    createdAt: b.createdAt.toISOString(),
    completedAt: b.completedAt?.toISOString() ?? null,
    progress: {
      queued: b.renders.filter((r) => r.status === 'queued').length,
      processing: b.renders.filter((r) => r.status === 'active').length,
      completed: b.renders.filter((r) => r.status === 'completed').length,
      failed: b.renders.filter((r) => r.status === 'failed').length,
    },
    renders: b.renders.map((r) => ({
      id: r.id,
      status: r.status as 'queued' | 'active' | 'completed' | 'failed',
      batchIndex: r.batchIndex,
      outputUrl: r.outputUrl,
      errorMessage: r.errorMessage,
      completedAt: r.completedAt?.toISOString() ?? null,
      failedAt: r.failedAt?.toISOString() ?? null,
    })),
  }));
}

/**
 * Retry all failed renders in a batch
 *
 * @param batchId - Batch ID to retry
 * @returns Number of renders retried
 */
export async function retryFailedBatch(batchId: string) {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Get active organization from session
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error('No active organization');
  }

  const userId = session.user.id;

  // Verify batch belongs to user's org
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      organizationId: activeOrgId,
    },
    include: {
      renders: {
        where: { status: 'failed' },
        select: { id: true, mergeData: true, batchIndex: true },
      },
    },
  });

  if (!batch) {
    throw new Error('Batch not found');
  }

  const failedRenders = batch.renders;
  const retriedCount = failedRenders.length;

  if (retriedCount === 0) {
    return { retriedCount: 0 };
  }

  // Reset failed renders to queued
  await prisma.render.updateMany({
    where: {
      id: { in: failedRenders.map((r) => r.id) },
    },
    data: {
      status: 'queued',
      failedAt: null,
      errorCategory: null,
      errorMessage: null,
    },
  });

  // Re-queue renders
  const { queueBatchRenders } = await import('@/lib/batch/queue');
  await queueBatchRenders(
    failedRenders.map((r) => ({
      id: r.id,
      mergeData: r.mergeData as Record<string, unknown>,
      batchIndex: r.batchIndex ?? 0,
    })),
    batchId,
    batch.templateId,
    userId,
    activeOrgId
  );

  // Update batch status to processing
  await prisma.batch.update({
    where: { id: batchId },
    data: {
      status: 'processing',
      completedAt: null,
    },
  });

  return { retriedCount };
}
