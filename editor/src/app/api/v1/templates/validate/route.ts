import { withApiAuth } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';
import { validateMergeData } from '@/lib/template-schema';
import type { MergeField } from '@/types/template';

/**
 * POST /api/v1/templates/validate
 *
 * Validates merge data against a template's stored schema.
 * Returns field-level validation errors for client display.
 *
 * Request body:
 * {
 *   "templateId": "template_123",
 *   "mergeData": { "field_key": "value", ... }
 * }
 *
 * Response (valid):
 * {
 *   "valid": true,
 *   "data": { "field_key": "value" }
 * }
 *
 * Response (invalid):
 * {
 *   "valid": false,
 *   "errors": {
 *     "fieldErrors": { "field_key": ["error message"] }
 *   }
 * }
 *
 * @example
 * curl -X POST \
 *      -H "Authorization: Bearer sk_live_..." \
 *      -H "Content-Type: application/json" \
 *      -d '{"templateId":"template_123","mergeData":{"text_1":"Hello"}}' \
 *      http://localhost:3000/api/v1/templates/validate
 */
export const POST = withApiAuth(async (request, context) => {
  // Parse request body
  let body: { templateId?: string; mergeData?: Record<string, unknown> };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Bad request', message: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate required fields
  const { templateId, mergeData } = body;

  if (!templateId || typeof templateId !== 'string') {
    return Response.json(
      {
        error: 'Bad request',
        message: 'templateId is required and must be a string',
      },
      { status: 400 }
    );
  }

  if (!mergeData || typeof mergeData !== 'object') {
    return Response.json(
      {
        error: 'Bad request',
        message: 'mergeData is required and must be an object',
      },
      { status: 400 }
    );
  }

  // Fetch template from database
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      mergeFields: true,
      isPublic: true,
      organizationId: true,
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

  // Validate merge data against template schema
  const validationResult = validateMergeData(
    template.mergeFields as unknown as MergeField[],
    mergeData
  );

  // Return validation result
  if (validationResult.success) {
    return Response.json(
      {
        valid: true,
        data: validationResult.data,
      },
      { status: 200 }
    );
  }

  // Return validation errors
  return Response.json(
    {
      valid: false,
      errors: validationResult.errors,
    },
    { status: 422 }
  );
});
