import { withApiAuth } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';

/**
 * GET /api/v1/me
 *
 * Connection test endpoint for external integrations (n8n, Zapier, Make).
 * Returns organization name and plan tier for the authenticated API key user.
 *
 * This endpoint is used by integration platforms to:
 * - Verify API key validity during connection setup
 * - Display connection info in integration UIs (e.g., "Connected to Acme Corp (Pro)")
 * - Test that authentication and rate limiting are working correctly
 *
 * @example
 * curl -H "Authorization: Bearer sk_live_..." \
 *      http://localhost:3000/api/v1/me
 * // -> { "organizationName": "Acme Corp", "planTier": "Pro" }
 */
export const GET = withApiAuth(async (_request, context) => {
  // Fetch organization details
  const organization = await prisma.organization.findUnique({
    where: { id: context.organizationId },
    select: { name: true },
  });

  // Handle organization not found (should be rare - API key is tied to org)
  if (!organization) {
    return Response.json(
      { error: 'Not found', message: 'Organization not found' },
      { status: 404 }
    );
  }

  // Return connection info for integration platforms
  return Response.json({
    organizationName: organization.name,
    planTier: context.tier,
  });
});
