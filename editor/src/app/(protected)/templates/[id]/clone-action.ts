'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Clone a public template to the current user's account
 *
 * Creates a private copy of the template with all data deeply cloned
 * to prevent shared state issues. Returns the clone ID for editor redirect.
 *
 * @param templateId - The ID of the template to clone
 * @returns Object with clone ID, or throws error
 */
export async function cloneTemplate(
  templateId: string
): Promise<{ id: string }> {
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
    throw new Error(
      'No active organization. Please create or select an organization first.'
    );
  }

  // Fetch original template
  const original = await prisma.template.findUniqueOrThrow({
    where: { id: templateId },
  });

  // Verify template is public (or user owns it)
  if (!original.isPublic && original.userId !== session.user.id) {
    throw new Error('Template not found or not accessible');
  }

  // Create clone using structuredClone for JSONB data (per research: state isolation)
  const clone = await prisma.template.create({
    data: {
      name: `${original.name} (Copy)`,
      description: original.description,
      thumbnailUrl: original.thumbnailUrl,
      projectData: structuredClone(original.projectData) as any,
      mergeFields: structuredClone(original.mergeFields) as any,
      mergeSchema: structuredClone(original.mergeSchema) as any,
      category: original.category,
      tags: [...original.tags],
      isPublic: false, // Clone is private by default
      featured: false, // Clone is not featured
      userId: session.user.id,
      organizationId: activeOrgId,
    },
  });

  return { id: clone.id };
}
