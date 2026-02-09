import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { R2StorageService } from '@/lib/r2';

// Initialize R2 service
const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

/**
 * GET /api/v1/assets/[id]
 * Fetch single asset by ID
 */
async function getHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Extract asset ID from URL path
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 1];

    if (!id) {
      return Response.json(
        { error: 'Bad request', message: 'Asset ID required' },
        { status: 400 }
      );
    }

    // Fetch asset and verify org ownership
    const asset = await prisma.asset.findFirst({
      where: {
        id,
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

    if (!asset) {
      return Response.json(
        { error: 'Not found', message: 'Asset not found' },
        { status: 404 }
      );
    }

    return Response.json({
      id: asset.id,
      name: asset.name,
      contentType: asset.contentType,
      size: asset.size,
      category: asset.category,
      cdnUrl: asset.cdnUrl,
      folderId: asset.folderId,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
      folder: asset.folder
        ? {
            id: asset.folder.id,
            name: asset.folder.name,
            path: asset.folder.path,
          }
        : null,
    });
  } catch (error) {
    console.error('GET /api/v1/assets/[id] error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch asset',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/assets/[id]
 * Delete asset with usage check
 */
async function deleteHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Extract asset ID from URL path
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 1];

    if (!id) {
      return Response.json(
        { error: 'Bad request', message: 'Asset ID required' },
        { status: 400 }
      );
    }

    // Fetch asset and verify org ownership
    const asset = await prisma.asset.findFirst({
      where: {
        id,
        organizationId: context.organizationId,
      },
    });

    if (!asset) {
      return Response.json(
        { error: 'Not found', message: 'Asset not found' },
        { status: 404 }
      );
    }

    // Check usage: search templates for asset CDN URL
    const usageCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Template"
      WHERE "organizationId" = ${context.organizationId}
      AND CAST("projectData" AS TEXT) LIKE ${'%' + asset.cdnUrl + '%'}
    `;

    const count = Number(usageCount[0].count);

    // If in use, block deletion
    if (count > 0) {
      return Response.json(
        {
          error: 'Asset is in use',
          message: `Asset is referenced in ${count} template(s)`,
          references: count,
        },
        { status: 409 }
      );
    }

    // Safe to delete - remove from R2 first
    try {
      await r2.deleteObject(asset.r2Key);
    } catch (r2Error) {
      console.error('R2 deletion error (continuing with DB delete):', r2Error);
      // Continue with DB delete even if R2 fails (R2 may have lifecycle rules)
    }

    // Delete from database
    await prisma.asset.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/v1/assets/[id] error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to delete asset',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handlers
export const GET = withApiAuth(getHandler);
export const DELETE = withApiAuth(deleteHandler);
