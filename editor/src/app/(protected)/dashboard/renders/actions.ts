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
      status: r.status,
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
    })),
    nextCursor,
    hasMore,
  };
}
