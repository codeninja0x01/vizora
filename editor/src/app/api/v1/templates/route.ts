import { withApiAuth } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';

/**
 * GET /api/v1/templates
 *
 * Returns list of templates accessible to the authenticated user for integration dropdowns.
 * Includes merge field metadata so integrations can build dynamic input forms.
 *
 * Access control:
 * - Returns organization-owned templates (including cloned gallery templates)
 * - Plus all public templates (gallery templates before cloning)
 *
 * Used by integration platforms (n8n, Zapier, Make) to:
 * - Populate template selection dropdowns
 * - Load merge field definitions for dynamic form generation
 * - Display template metadata (name, description, thumbnail)
 *
 * Note: No pagination - template count per org is manageable (tens, not thousands).
 * Excludes projectData (internal use only, too large for API response).
 *
 * @example
 * curl -H "Authorization: Bearer sk_live_..." \
 *      http://localhost:3000/api/v1/templates
 * // -> { "templates": [...] }
 */
export const GET = withApiAuth(async (_request, context) => {
  // Fetch templates accessible to the user
  const templates = await prisma.template.findMany({
    where: {
      OR: [
        { organizationId: context.organizationId }, // Org-owned templates
        { isPublic: true }, // Public gallery templates
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      thumbnailUrl: true,
      mergeFields: true,
      mergeSchema: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude projectData (too large, internal only per Phase 3 decision)
    },
    orderBy: { name: 'asc' },
  });

  // Map to response format with ISO date strings
  const templatesResponse = templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    thumbnailUrl: template.thumbnailUrl,
    mergeFields: template.mergeFields,
    mergeSchema: template.mergeSchema,
    isPublic: template.isPublic,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }));

  return Response.json({
    templates: templatesResponse,
  });
});
