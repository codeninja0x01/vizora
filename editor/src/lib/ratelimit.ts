import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitTier = 'free' | 'pro' | 'enterprise';

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

export type RateLimitResult = {
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

// --- Session-based rate limiting (Redis + in-memory fallback) ---

import { TokenBucket } from '@/lib/token-bucket';

export const sessionTokenBucket = new TokenBucket({
  maxTokens: 200,
  refillRatePerMinute: 200,
  sweepIntervalMs: 60_000,
  maxIdleMs: 300_000,
});

export type SessionRateLimitResult =
  | { allowed: true; headers: Record<string, string> }
  | {
      allowed: false;
      retryAfterSeconds: number;
      headers: Record<string, string>;
    };

export async function withSessionRateLimit(
  organizationId: string,
  tier: string
): Promise<SessionRateLimitResult> {
  // Layer 1: In-memory hard ceiling (always active)
  const bucketResult = sessionTokenBucket.consume(organizationId);
  if (!bucketResult.allowed) {
    console.warn('[rate-limit] In-memory bucket exceeded', {
      organizationId,
      limiter: 'memory',
    });
    return {
      allowed: false,
      retryAfterSeconds: bucketResult.retryAfterSeconds,
      headers: {},
    };
  }

  // Layer 2: Redis sliding window
  const redisResult = await rateLimit(tier, `session:${organizationId}`);

  if (!redisResult) {
    return { allowed: true, headers: {} };
  }

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(redisResult.limit),
    'X-RateLimit-Remaining': String(redisResult.remaining),
    'X-RateLimit-Reset': String(redisResult.reset),
  };

  if (!redisResult.success) {
    const retryAfter = Math.ceil((redisResult.reset - Date.now()) / 1000);
    console.warn('[rate-limit] Redis limit exceeded', {
      organizationId,
      limiter: 'redis',
    });
    return {
      allowed: false,
      retryAfterSeconds: Math.max(retryAfter, 1),
      headers,
    };
  }

  return { allowed: true, headers };
}
