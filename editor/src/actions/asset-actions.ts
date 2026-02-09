'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { config } from '@/lib/config';
import { R2StorageService } from '@/lib/r2';
import { randomUUID } from 'crypto';

// Initialize R2 service
const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

/**
 * Get assets for current organization with optional filtering
 * @param params - Filter parameters (folderId, category, search)
 */
export async function getAssets(params?: {
  folderId?: string | null;
  category?: string;
  search?: string;
}) {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error('No active organization');
  }

  // Build where clause
  const where: any = {
    organizationId: activeOrgId,
  };

  // Filter by folder
  if (params?.folderId !== undefined) {
    where.folderId = params.folderId;
  }

  // Filter by category
  if (params?.category) {
    where.category = params.category;
  }

  // Filter by name search (case-insensitive contains)
  if (params?.search) {
    where.name = {
      contains: params.search,
      mode: 'insensitive',
    };
  }

  // Fetch assets
  const assets = await prisma.asset.findMany({
    where,
    include: {
      folder: {
        select: {
          id: true,
          name: true,
          path: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return assets;
}

/**
 * Request presigned URL for direct R2 upload
 * @param params - Upload parameters
 */
export async function requestPresignedUrl(params: {
  filename: string;
  contentType: string;
  size: number;
  folderId?: string;
}) {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error('No active organization');
  }

  const { filename, contentType, size, folderId } = params;

  // If folderId provided, verify it exists and belongs to org
  if (folderId) {
    const folder = await prisma.assetFolder.findFirst({
      where: {
        id: folderId,
        organizationId: activeOrgId,
      },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }
  }

  // Sanitize filename: replace spaces with hyphens, remove special chars
  const sanitizedFilename = filename
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_.]/g, '');

  // Generate R2 key: assets/{orgId}/{assetId}/{filename}
  const assetId = randomUUID();
  const r2Key = `assets/${activeOrgId}/${assetId}/${sanitizedFilename}`;

  // Generate presigned URL
  const presigned = await r2.createPresignedUpload(r2Key, {
    contentType,
    expiresIn: 3600,
  });

  return {
    presignedUrl: presigned.presignedUrl,
    r2Key,
    cdnUrl: presigned.url,
  };
}

/**
 * Register asset in database after successful upload
 * @param params - Asset registration data
 */
export async function registerAsset(params: {
  r2Key: string;
  name: string;
  contentType: string;
  size: number;
  category: 'video' | 'image' | 'audio';
  folderId?: string;
}) {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error('No active organization');
  }

  const { r2Key, name, contentType, size, category, folderId } = params;

  // If folderId provided, verify it exists and belongs to org
  if (folderId) {
    const folder = await prisma.assetFolder.findFirst({
      where: {
        id: folderId,
        organizationId: activeOrgId,
      },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }
  }

  // Get CDN URL from R2 key
  const cdnUrl = r2.getUrl(r2Key);

  // Create asset record
  const asset = await prisma.asset.create({
    data: {
      name,
      r2Key,
      contentType,
      size,
      category,
      cdnUrl,
      folderId: folderId || null,
      userId: session.user.id,
      organizationId: activeOrgId,
    },
  });

  // Revalidate editor path
  revalidatePath('/dashboard');

  return asset;
}

/**
 * Delete asset with usage check
 * @param id - Asset ID
 */
export async function deleteAsset(id: string) {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error('No active organization');
  }

  // Get asset and verify ownership
  const asset = await prisma.asset.findFirst({
    where: {
      id,
      organizationId: activeOrgId,
    },
  });

  if (!asset) {
    return {
      success: false,
      error: 'Asset not found',
    };
  }

  // Check usage: search templates for asset CDN URL
  const usageCount = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "Template"
    WHERE "organizationId" = ${activeOrgId}
    AND CAST("projectData" AS TEXT) LIKE ${'%' + asset.cdnUrl + '%'}
  `;

  const count = Number(usageCount[0].count);

  // If in use, block deletion
  if (count > 0) {
    return {
      success: false,
      error: `Asset is used in ${count} template(s). Remove from templates first.`,
    };
  }

  // Safe to delete - remove from R2 first
  try {
    await r2.deleteObject(asset.r2Key);
  } catch (r2Error) {
    console.error('R2 deletion error (continuing with DB delete):', r2Error);
    // Continue with DB delete even if R2 fails
  }

  // Delete from database
  await prisma.asset.delete({
    where: { id },
  });

  // Revalidate editor path
  revalidatePath('/dashboard');

  return { success: true };
}

/**
 * Move asset to a different folder
 * @param assetId - Asset ID
 * @param folderId - Target folder ID (null = move to root)
 */
export async function moveAssetToFolder(
  assetId: string,
  folderId: string | null
) {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error('No active organization');
  }

  // Verify asset exists and belongs to org
  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      organizationId: activeOrgId,
    },
  });

  if (!asset) {
    throw new Error('Asset not found');
  }

  // If folderId provided, verify it exists and belongs to org
  if (folderId) {
    const folder = await prisma.assetFolder.findFirst({
      where: {
        id: folderId,
        organizationId: activeOrgId,
      },
    });

    if (!folder) {
      throw new Error('Target folder not found');
    }
  }

  // Update asset folder
  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      folderId,
    },
  });

  // Revalidate editor path
  revalidatePath('/dashboard');

  return updatedAsset;
}
