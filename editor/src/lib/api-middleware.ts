import { validateApiKey, type ApiKeyContext } from './api-keys';
import { rateLimit, formatRateLimitHeaders } from './ratelimit';

// Re-export ApiKeyContext for convenience
export type { ApiKeyContext } from './api-keys';

type AuthenticatedHandler = (
  request: Request,
  context: ApiKeyContext
) => Promise<Response>;

export function withApiAuth(
  handler: AuthenticatedHandler
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    try {
      // Step 1: Validate API key
      const apiKeyContext = await validateApiKey(request);
      if (!apiKeyContext) {
        return Response.json(
          { error: 'Unauthorized', message: 'Invalid or missing API key' },
          { status: 401 }
        );
      }

      // Step 2: Apply rate limiting (skipped if Redis not configured)
      const rlResult = await rateLimit(
        apiKeyContext.tier,
        apiKeyContext.userId
      );

      // Step 3: Check if rate limited
      if (rlResult && !rlResult.success) {
        return Response.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
          },
          { status: 429, headers: formatRateLimitHeaders(rlResult) }
        );
      }

      // Step 4: Call handler and add rate limit headers to response
      const response = await handler(request, apiKeyContext);

      if (rlResult) {
        const headers = new Headers(response.headers);
        const rlHeaders = formatRateLimitHeaders(rlResult);
        for (const [key, value] of Object.entries(rlHeaders)) {
          headers.set(key, value);
        }
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return response;
    } catch (error) {
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
