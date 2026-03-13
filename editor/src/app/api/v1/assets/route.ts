import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { R2StorageService } from '@/lib/r2';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

// Initialize R2 service
const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

// Asset category enum
const assetCategories = ['video', 'image', 'audio'] as const;

// Request validation schema for POST
const registerAssetSchema = z.object({
  r2Key: z.string().min(1),
  name: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  category: z.enum(assetCategories),
  folderId: z.string().optional(),
});

/**
 * POST /api/v1/assets
 * Register asset after upload
 */
async function postHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = registerAssetSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { r2Key, name, contentType, size, category, folderId } =
      validation.data;

    // If folderId provided, verify it exists and belongs to org
    if (folderId) {
      const folder = await prisma.assetFolder.findFirst({
        where: {
          id: folderId,
          organizationId: context.organizationId,
        },
      });

      if (!folder) {
        return Response.json(
          { error: 'Validation failed', message: 'Folder not found' },
          { status: 400 }
        );
      }
    }

    // Get CDN URL from R2 key
    const cdnUrl = r2.getUrl(r2Key);

    // Create asset record in DB
    const asset = await prisma.asset.create({
      data: {
        name,
        r2Key,
        contentType,
        size,
        category,
        cdnUrl,
        folderId: folderId || null,
        userId: context.userId,
        organizationId: context.organizationId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
      },
    });

    return Response.json(asset, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/assets error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to register asset',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/assets
 * List assets with filtering and pagination
 */
async function getHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse query parameters
    const folderId = url.searchParams.get('folderId'); // null, "null", or actual ID
    const category = url.searchParams.get('category');
    const cursor = url.searchParams.get('cursor');
    const limitParam = parseInt(url.searchParams.get('limit') || '20', 10);
    const limit = Math.min(limitParam, 100); // Cap at 100

    // Build where clause with organization scope
    const where: Prisma.AssetWhereInput = {
      organizationId: context.organizationId,
    };

    // Filter by folder (handle null for root assets)
    if (folderId === 'null' || folderId === null) {
      where.folderId = null;
    } else if (folderId) {
      where.folderId = folderId;
    }

    // Filter by category
    if (
      category &&
      assetCategories.includes(category as (typeof assetCategories)[number])
    ) {
      where.category = category;
    }

    // Build pagination options
    const paginationOptions: Omit<
      Prisma.AssetFindManyArgs,
      'where' | 'include' | 'select'
    > = {
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check for more
    };

    if (cursor) {
      paginationOptions.skip = 1;
      paginationOptions.cursor = { id: cursor };
    }

    // Fetch assets with pagination
    const assets = await prisma.asset.findMany({
      where,
      ...paginationOptions,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
      },
    });

    // Check if there are more results
    const hasMore = assets.length > limit;
    const items = hasMore ? assets.slice(0, limit) : assets;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Build folder path breadcrumb data for each item
    const responseItems = items.map((asset) => {
      const item: Record<string, unknown> = {
        id: asset.id,
        name: asset.name,
        contentType: asset.contentType,
        size: asset.size,
        category: asset.category,
        cdnUrl: asset.cdnUrl,
        folderId: asset.folderId,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
      };

      if (asset.folder) {
        item.folder = {
          id: asset.folder.id,
          name: asset.folder.name,
          path: asset.folder.path,
        };
      }

      return item;
    });

    return Response.json({
      items: responseItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
        limit,
      },
    });
  } catch (error) {
    console.error('GET /api/v1/assets error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch assets',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handlers
export const POST = withApiAuth(postHandler);
export const GET = withApiAuth(getHandler);
