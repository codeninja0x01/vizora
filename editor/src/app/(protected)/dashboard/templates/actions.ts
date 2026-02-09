'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateMergeSchema } from '@/lib/template-schema';
import type { MergeField, TemplateCategory } from '@/types/template';

/**
 * Create a new template from project data with merge fields
 *
 * @param input - Template creation data including projectData and mergeFields
 * @returns The created template or error
 */
export async function createTemplate(input: {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  projectData: Record<string, unknown>;
  mergeFields: MergeField[];
  category?: TemplateCategory;
  tags?: string[];
}): Promise<{ template: any } | { error: string }> {
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
    return {
      error:
        'No active organization. Please create or select an organization first.',
    };
  }

  // Generate merge schema from merge fields
  const mergeSchema = generateMergeSchema(input.mergeFields);

  // Create template in database
  const template = await prisma.template.create({
    data: {
      name: input.name,
      description: input.description || null,
      thumbnailUrl: input.thumbnailUrl || null,
      projectData: input.projectData as any,
      mergeFields: input.mergeFields as any,
      mergeSchema: mergeSchema as any,
      category: input.category || null,
      tags: input.tags || [],
      userId: session.user.id,
      organizationId: activeOrgId,
    },
  });

  // Revalidate templates page
  revalidatePath('/dashboard/templates');

  return { template };
}

/**
 * Update an existing template
 *
 * @param id - Template ID
 * @param input - Fields to update
 * @returns Updated template or error
 */
export async function updateTemplate(
  id: string,
  input: {
    name?: string;
    description?: string;
    thumbnailUrl?: string;
    projectData?: Record<string, unknown>;
    mergeFields?: MergeField[];
    category?: TemplateCategory;
    tags?: string[];
  }
): Promise<{ template: any } | { error: string }> {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Verify template belongs to user
  const existingTemplate = await prisma.template.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!existingTemplate) {
    return { error: 'Template not found or not authorized' };
  }

  // Prepare update data
  const updateData: any = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.thumbnailUrl !== undefined)
    updateData.thumbnailUrl = input.thumbnailUrl;
  if (input.projectData !== undefined)
    updateData.projectData = input.projectData as any;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.tags !== undefined) updateData.tags = input.tags;

  // If mergeFields changed, regenerate mergeSchema
  if (input.mergeFields !== undefined) {
    updateData.mergeFields = input.mergeFields as any;
    updateData.mergeSchema = generateMergeSchema(input.mergeFields) as any;
  }

  // Update template
  const template = await prisma.template.update({
    where: { id },
    data: updateData,
  });

  // Revalidate templates page
  revalidatePath('/dashboard/templates');

  return { template };
}

/**
 * Delete a template (user must own it)
 *
 * @param id - Template ID
 * @returns Success status or error
 */
export async function deleteTemplate(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Verify template belongs to user
  const existingTemplate = await prisma.template.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!existingTemplate) {
    return { error: 'Template not found or not authorized' };
  }

  // Delete template
  await prisma.template.delete({
    where: { id },
  });

  // Revalidate templates page
  revalidatePath('/dashboard/templates');

  return { success: true };
}

/**
 * Get all templates for the current user
 *
 * @returns Array of user's templates
 */
export async function getTemplates() {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Query user's templates
  const templates = await prisma.template.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return templates;
}

/**
 * Get a single template by ID
 * Returns public templates or user's own templates
 *
 * @param id - Template ID
 * @returns Template or null
 */
export async function getTemplateById(id: string) {
  // Get authenticated session (may be null for public templates)
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Query template
  const template = await prisma.template.findUnique({
    where: { id },
  });

  if (!template) {
    return null;
  }

  // If template is not public, verify user owns it
  if (!template.isPublic) {
    if (!session || template.userId !== session.user.id) {
      throw new Error('Not found');
    }
  }

  return template;
}

/**
 * Get public templates for gallery with optional filters
 *
 * @param filters - Optional category, tags, and search filters
 * @returns Array of public templates
 */
export async function getGalleryTemplates(filters?: {
  category?: string;
  tags?: string[];
  search?: string;
}) {
  // Build where clause
  const where: any = {
    isPublic: true,
  };

  // Add optional filters
  if (filters?.category) {
    where.category = filters.category;
  }

  if (filters?.tags && filters.tags.length > 0) {
    where.tags = {
      hasSome: filters.tags,
    };
  }

  if (filters?.search) {
    where.name = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  // Query public templates
  const templates = await prisma.template.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });

  return templates;
}
