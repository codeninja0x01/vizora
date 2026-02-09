import { withApiAuth } from '@/lib/api-middleware';

/**
 * Health check endpoint demonstrating API key authentication and rate limiting
 *
 * This endpoint serves as:
 * - A health check for the API infrastructure
 * - Verification that API key auth works correctly
 * - A demonstration of the withApiAuth pattern for future endpoints
 * - A test target for rate limiting behavior across tiers
 *
 * @example
 * // Without API key (should fail)
 * curl http://localhost:3000/api/v1/health
 * // -> 401 Unauthorized
 *
 * @example
 * // With valid API key (should succeed)
 * curl -H "Authorization: Bearer sk_live_..." http://localhost:3000/api/v1/health
 * // -> 200 OK with rate limit headers
 *
 * @example
 * // Rapid requests to test rate limiting
 * for i in {1..15}; do
 *   curl -H "Authorization: Bearer sk_live_..." http://localhost:3000/api/v1/health
 * done
 * // -> Eventually returns 429 Too Many Requests with Retry-After header
 */
export const GET = withApiAuth(async (_request, context) => {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    user: {
      id: context.userId,
      organizationId: context.organizationId,
      tier: context.tier,
    },
  });
});
