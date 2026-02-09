import { validateApiKey, type ApiKeyContext } from './api-keys';
import { getRateLimiter, formatRateLimitHeaders } from './ratelimit';

/**
 * Type for authenticated API route handlers
 * Receives the request and authenticated context (userId, organizationId, tier)
 */
export type AuthenticatedHandler = (
  request: Request,
  context: ApiKeyContext
) => Promise<Response>;

/**
 * Higher-order function wrapping API routes with key authentication and rate limiting
 *
 * This middleware:
 * 1. Validates the API key from Authorization header
 * 2. Applies tiered rate limiting based on subscription tier
 * 3. Adds rate limit headers to all responses
 * 4. Handles errors gracefully with appropriate status codes
 *
 * @param handler - The authenticated route handler to wrap
 * @returns A wrapped handler that validates auth and applies rate limiting
 *
 * @example
 * export const GET = withApiAuth(async (request, context) => {
 *   return Response.json({ userId: context.userId });
 * });
 */
export function withApiAuth(
  handler: AuthenticatedHandler
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    try {
      // Step 1: Validate API key
      const apiKeyContext = await validateApiKey(request);
      if (!apiKeyContext) {
        return Response.json(
          {
            error: 'Unauthorized',
            message: 'Invalid or missing API key',
          },
          { status: 401 }
        );
      }

      // Step 2: Apply rate limiting
      const limiter = getRateLimiter(apiKeyContext.tier);
      const result = await limiter.limit(apiKeyContext.userId);

      // Step 3: Check if rate limited
      if (!result.success) {
        return Response.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
          },
          {
            status: 429,
            headers: formatRateLimitHeaders(result),
          }
        );
      }

      // Step 4: Call handler and add rate limit headers to response
      const response = await handler(request, apiKeyContext);

      // Clone response and add rate limit headers
      const headers = new Headers(response.headers);
      const rlHeaders = formatRateLimitHeaders(result);
      Object.entries(rlHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error('API middleware error:', error);
      return Response.json(
        {
          error: 'Internal server error',
          message: 'An unexpected error occurred',
        },
        { status: 500 }
      );
    }
  };
}
