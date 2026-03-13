import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitTier = 'free' | 'pro' | 'enterprise';

const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    })
  : null;

const rateLimiters = redis
  ? {
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
    }
  : null;

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * Apply rate limiting for a user. Returns null when Redis is not configured (dev mode).
 */
export async function rateLimit(
  tier: string,
  identifier: string
): Promise<RateLimitResult | null> {
  if (!rateLimiters) {
    if (!hasRedis) console.log('[RateLimit] Skipped (no UPSTASH_REDIS config)');
    return null;
  }
  const limiter =
    rateLimiters[tier as keyof typeof rateLimiters] ?? rateLimiters.free;
  return limiter.limit(identifier);
}

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
