import { withApiAuth } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';

/**
 * GET /api/v1/templates/[id]
 *
 * Retrieves a template by ID for authenticated API consumers.
 * Returns template metadata including mergeSchema for validation.
 * Does NOT return projectData (internal use only).
 *
 * Access control:
 * - Public templates: accessible by all authenticated API users
 * - Private templates: accessible only by owning organization
 *
 * @example
 * curl -H "Authorization: Bearer sk_live_..." \
 *      http://localhost:3000/api/v1/templates/template_123
 */
export const GET = withApiAuth(async (request, context) => {
  // Extract template ID from URL path
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const templateId = pathSegments[pathSegments.length - 1];

  if (!templateId) {
    return Response.json(
      { error: 'Bad request', message: 'Template ID is required' },
      { status: 400 }
    );
  }

  // Fetch template from database
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      name: true,
      description: true,
      thumbnailUrl: true,
      mergeFields: true,
      mergeSchema: true,
      category: true,
      tags: true,
      isPublic: true,
      featured: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude projectData (too large, internal only)
    },
  });

  // Handle not found
  if (!template) {
    return Response.json(
      { error: 'Not found', message: 'Template not found' },
      { status: 404 }
    );
  }

  // Access control: public templates or same organization
  if (
    !template.isPublic &&
    template.organizationId !== context.organizationId
  ) {
    return Response.json(
      {
        error: 'Forbidden',
        message: 'You do not have access to this template',
      },
      { status: 403 }
    );
  }

  // Return template data
  return Response.json({
    id: template.id,
    name: template.name,
    description: template.description,
    thumbnailUrl: template.thumbnailUrl,
    mergeFields: template.mergeFields,
    mergeSchema: template.mergeSchema,
    category: template.category,
    tags: template.tags,
    isPublic: template.isPublic,
    featured: template.featured,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  });
});
