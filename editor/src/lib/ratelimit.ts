import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Type for rate limit tiers
 */
export type RateLimitTier = 'free' | 'pro' | 'enterprise';

/**
 * Redis client for rate limiting
 * Uses Upstash Redis REST API for serverless compatibility
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Tiered rate limiters using Upstash Redis sliding window algorithm
 *
 * Tiers:
 * - free: 10 requests per 10 seconds
 * - pro: 60 requests per 10 seconds
 * - enterprise: 200 requests per 10 seconds
 */
export const rateLimiters = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: true,
    prefix: 'rl:free',
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '10 s'),
    analytics: true,
    prefix: 'rl:pro',
  }),
  enterprise: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '10 s'),
    analytics: true,
    prefix: 'rl:enterprise',
  }),
};

/**
 * Get rate limiter for a specific tier
 *
 * @param tier - The subscription tier (free, pro, or enterprise)
 * @returns Rate limiter instance for the specified tier, defaults to free for unknown tiers
 *
 * @example
 * const limiter = getRateLimiter('pro');
 * const result = await limiter.limit(userId);
 */
export function getRateLimiter(tier: string): Ratelimit {
  return rateLimiters[tier as keyof typeof rateLimiters] ?? rateLimiters.free;
}

/**
 * Format rate limit information into standard HTTP headers
 *
 * @param result - Rate limit result from Upstash
 * @returns Headers object ready to be added to HTTP response
 *
 * @example
 * const headers = formatRateLimitHeaders(result);
 * // Returns:
 * // {
 * //   'X-RateLimit-Limit': '60',
 * //   'X-RateLimit-Remaining': '45',
 * //   'X-RateLimit-Reset': '1234567890',
 * //   'Retry-After': '5',
 * // }
 */
export function formatRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
  };
}
