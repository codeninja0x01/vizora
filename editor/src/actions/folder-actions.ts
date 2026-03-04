'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Get folders for current organization
 * @param parentId - Parent folder ID (null = root folders)
 */
export async function getFolders(parentId?: string | null) {
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

  // Query folders with counts
  const folders = await prisma.assetFolder.findMany({
    where: {
      organizationId: activeOrgId,
      parentId: parentId === null || parentId === undefined ? null : parentId,
    },
    include: {
      _count: {
        select: {
          assets: true,
          children: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return folders;
}

/**
 * Create a new folder
 * @param name - Folder name (1-50 chars, no slashes)
 * @param parentId - Parent folder ID (optional)
 */
export async function createFolder(name: string, parentId?: string | null) {
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

  // Validate name
  if (!name || name.length < 1 || name.length > 50) {
    throw new Error('Folder name must be 1-50 characters');
  }

  if (name.includes('/')) {
    throw new Error('Folder name cannot contain slashes');
  }

  // Get parent folder if specified
  let path: string;
  if (parentId) {
    const parent = await prisma.assetFolder.findFirst({
      where: {
        id: parentId,
        organizationId: activeOrgId,
      },
    });

    if (!parent) {
      throw new Error('Parent folder not found');
    }

    // Build path from parent: parentPath + name + "/"
    path = `${parent.path}${name}/`;
  } else {
    // Root folder: /name/
    path = `/${name}/`;
  }

  // Create folder
  const folder = await prisma.assetFolder.create({
    data: {
      name,
      path,
      parentId: parentId || null,
      userId: session.user.id,
      organizationId: activeOrgId,
    },
  });

  // Revalidate relevant paths
  revalidatePath('/dashboard');

  return folder;
}

/**
 * Rename a folder
 * @param id - Folder ID
 * @param name - New folder name
 */
export async function renameFolder(id: string, name: string) {
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

  // Validate name
  if (!name || name.length < 1 || name.length > 50) {
    throw new Error('Folder name must be 1-50 characters');
  }

  if (name.includes('/')) {
    throw new Error('Folder name cannot contain slashes');
  }

  // Get folder and verify ownership
  const folder = await prisma.assetFolder.findFirst({
    where: {
      id,
      organizationId: activeOrgId,
    },
    include: {
      parent: true,
    },
  });

  if (!folder) {
    throw new Error('Folder not found');
  }

  // Calculate new path
  const oldPath = folder.path;
  let newPath: string;

  if (folder.parent) {
    newPath = `${folder.parent.path}${name}/`;
  } else {
    newPath = `/${name}/`;
  }

  // Update folder and all descendant paths
  // Use transaction to ensure consistency
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
    // Update this folder
    await tx.assetFolder.update({
      where: { id },
      data: {
        name,
        path: newPath,
      },
    });

    // Update all descendant folders (materialized path pattern)
    // Find all folders whose path starts with oldPath
    const descendants = await tx.assetFolder.findMany({
      where: {
        organizationId: activeOrgId,
        path: {
          startsWith: oldPath,
        },
        id: {
          not: id, // Exclude the renamed folder itself
        },
      },
    });

    // Update each descendant's path
    for (const descendant of descendants) {
      const updatedPath = descendant.path.replace(oldPath, newPath);
      await tx.assetFolder.update({
        where: { id: descendant.id },
        data: { path: updatedPath },
      });
    }
  });

  // Revalidate relevant paths
  revalidatePath('/dashboard');

  return { success: true };
}

/**
 * Delete a folder
 * @param id - Folder ID
 */
export async function deleteFolder(id: string) {
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

  // Get folder and verify ownership
  const folder = await prisma.assetFolder.findFirst({
    where: {
      id,
      organizationId: activeOrgId,
    },
    include: {
      _count: {
        select: {
          assets: true,
        },
      },
    },
  });

  if (!folder) {
    throw new Error('Folder not found');
  }

  // Check if folder has assets
  if (folder._count.assets > 0) {
    throw new Error(
      `Cannot delete folder with ${folder._count.assets} asset(s). Move or delete assets first.`
    );
  }

  // Delete folder (cascade deletes children per Prisma relation)
  await prisma.assetFolder.delete({
    where: { id },
  });

  // Revalidate relevant paths
  revalidatePath('/dashboard');

  return { success: true };
}
