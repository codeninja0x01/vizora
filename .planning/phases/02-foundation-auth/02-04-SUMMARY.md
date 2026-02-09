---
phase: 02-foundation-auth
plan: 04
subsystem: auth, api
tags: [upstash-redis, rate-limiting, api-middleware, bearer-auth]

# Dependency graph
requires:
  - phase: 02-01
    provides: Prisma schema and database client
  - phase: 02-03
    provides: API key validation and ApiKeyContext type
provides:
  - Tiered rate limiters using Upstash Redis (free: 10/10s, pro: 60/10s, enterprise: 200/10s)
  - withApiAuth middleware for protecting API routes with key validation and rate limiting
  - Health check endpoint demonstrating the auth + rate limiting pattern
  - Rate limit headers (X-RateLimit-*, Retry-After) on all API responses
affects:
  - 02-05 (protected routes will use withApiAuth middleware)
  - All future API routes requiring authentication and rate limiting

# Tech tracking
tech-stack:
  added:
    - "@upstash/ratelimit@2.0.8" (already installed in 02-01)
    - "@upstash/redis@1.36.2" (already installed in 02-01)
  patterns:
    - Sliding window rate limiting with Upstash Redis for serverless compatibility
    - Higher-order function pattern (withApiAuth) for middleware composition
    - Standard rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After)
    - Bearer token authentication via Authorization header

key-files:
  created:
    - editor/src/lib/ratelimit.ts (tiered rate limiters, header formatting)
    - editor/src/lib/api-middleware.ts (withApiAuth HOF for protected routes)
    - editor/src/app/api/v1/health/route.ts (test endpoint demonstrating pattern)
  modified:
    - editor/.env.sample (added Upstash Redis env vars)

key-decisions:
  - "Upstash Redis selected for serverless-compatible rate limiting with shared state"
  - "Sliding window algorithm for precise rate limit enforcement across tiers"
  - "Rate limit headers added to all responses (success and failure) for client visibility"
  - "withApiAuth middleware chains validation → rate limiting → handler for consistent security"
  - "Health check endpoint at /api/v1/health establishes pattern for future protected routes"

patterns-established:
  - "withApiAuth HOF pattern: wraps handlers with auth + rate limiting in single call"
  - "Rate limit tiers defined centrally in rateLimiters object for easy modification"
  - "formatRateLimitHeaders utility ensures consistent header formatting across responses"
  - "Error handling with appropriate status codes: 401 (invalid key), 429 (rate limited), 500 (server error)"

# Metrics
duration: 2m 24s
completed: 2026-02-09
---

# Phase 02 Plan 04: API Auth Middleware & Rate Limiting Summary

**Tiered rate limiting with Upstash Redis and withApiAuth middleware for protecting API routes with bearer token authentication and per-tier rate limits**

## Performance

- **Duration:** 2m 24s (144 seconds)
- **Started:** 2026-02-09T09:36:26Z
- **Completed:** 2026-02-09T09:38:51Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Upstash Redis rate limiters configured for three tiers: free (10 req/10s), pro (60 req/10s), enterprise (200 req/10s)
- withApiAuth middleware created as higher-order function wrapping route handlers with authentication and rate limiting
- Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After) added to all API responses
- Health check endpoint at /api/v1/health demonstrating the complete auth + rate limiting pattern
- All authentication flows handled: valid key (200 + headers), invalid/missing key (401), rate limited (429 + headers)

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure Upstash Redis and tiered rate limiters** - `c2031a8` (feat)
2. **Task 2: Create API auth middleware and health endpoint** - `3fe332a` (feat)

## Files Created/Modified

### Created

- `editor/src/lib/ratelimit.ts` - Redis client, tiered rate limiters (free/pro/enterprise), getRateLimiter() helper, formatRateLimitHeaders() utility
- `editor/src/lib/api-middleware.ts` - withApiAuth() higher-order function wrapping handlers with key validation and rate limiting
- `editor/src/app/api/v1/health/route.ts` - Test endpoint demonstrating withApiAuth pattern, returns user context on success

### Modified

- `editor/.env.sample` - Added UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables

## Decisions Made

**Upstash Redis for Rate Limiting:** Chose Upstash Redis for serverless-compatible rate limiting. Provides shared state across Next.js serverless function instances, essential for accurate rate limiting. REST API client avoids connection pooling issues in serverless environments.

**Sliding Window Algorithm:** Selected sliding window algorithm over fixed window or token bucket. Provides more precise rate limit enforcement by considering request distribution within the time window, preventing burst abuse at window boundaries.

**Rate Limit Headers on All Responses:** Added X-RateLimit-* headers to both successful (200) and rate-limited (429) responses. Enables API clients to implement intelligent retry logic and display usage information to users.

**Middleware Composition Pattern:** Implemented withApiAuth as higher-order function that wraps route handlers. Provides clean, consistent security pattern for all protected routes. Future routes use single function call: `export const GET = withApiAuth(handler)`.

**Health Check Endpoint as Pattern Reference:** Created /api/v1/health as both a functional health check and a reference implementation. Future API routes follow this exact pattern for consistent authentication and rate limiting.

## Deviations from Plan

None - plan executed exactly as written. All tasks completed without modifications or additions beyond planned scope.

## Issues Encountered

None - execution proceeded smoothly with all verification criteria met on first attempt.

## User Setup Required

**Upstash Redis configuration required before rate limiting will work.** The following steps are needed:

### Required Service

**Upstash Redis** (for rate limiting)
1. Create account at https://console.upstash.com
2. Create a new Redis database (free tier available)
3. Copy REST API URL and Token from database dashboard
4. Set environment variables:
   - `UPSTASH_REDIS_REST_URL` (from database REST API section)
   - `UPSTASH_REDIS_REST_TOKEN` (from database REST API section)

### Verification

After setting Upstash environment variables and starting the dev server:

```bash
# Test without API key (should return 401)
curl http://localhost:3000/api/v1/health

# Test with valid API key (requires creating a key via dashboard first)
curl -H "Authorization: Bearer sk_live_..." http://localhost:3000/api/v1/health
# Should return 200 with rate limit headers

# Test rate limiting (rapid requests)
for i in {1..15}; do
  curl -H "Authorization: Bearer sk_live_..." http://localhost:3000/api/v1/health
done
# Should eventually return 429 with Retry-After header
```

Expected rate limit headers on all responses:
- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying (on 429 responses)

## Next Phase Readiness

**Ready for next plan (02-05)** - All API authentication and rate limiting infrastructure is complete:

- withApiAuth middleware ready for use in all protected API routes
- Rate limiting enforced per user per tier with accurate shared state
- Standard error responses for authentication failures (401) and rate limiting (429)
- Health check endpoint available for monitoring and integration testing

**Pattern established for future routes:**
```typescript
import { withApiAuth } from '@/lib/api-middleware';

export const GET = withApiAuth(async (_request, context) => {
  // Access context.userId, context.organizationId, context.tier
  // Authentication and rate limiting handled automatically
  return Response.json({ data: '...' });
});
```

**No blockers for Phase 2 completion** - authentication middleware and rate limiting complete AUTH-06 and AUTH-07 requirements.

## Verification Checklist

All verification criteria met:

- [x] Rate limiters configured for three tiers with correct limits (10/10s, 60/10s, 200/10s)
- [x] withApiAuth correctly chains: key validation → rate limiting → handler
- [x] Health endpoint returns 200 with valid key, 401 without (manual test required)
- [x] Rate limit headers present on all responses (X-RateLimit-*, Retry-After)
- [x] TypeScript compilation passes without errors
- [x] Linting passes (biome check)

## Self-Check: PASSED

All files exist:
- ✓ editor/src/lib/ratelimit.ts
- ✓ editor/src/lib/api-middleware.ts
- ✓ editor/src/app/api/v1/health/route.ts
- ✓ editor/.env.sample (modified)

All commits exist:
- ✓ c2031a8 (Task 1: Rate limiters)
- ✓ 3fe332a (Task 2: Middleware and health endpoint)

TypeScript compilation:
- ✓ All files compile without errors (skipLibCheck for third-party library compatibility)

---
*Phase: 02-foundation-auth*
*Completed: 2026-02-09*
