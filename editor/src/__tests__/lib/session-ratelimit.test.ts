import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @upstash/redis so rateLimit() returns null (no Redis configured)
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(),
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(vi.fn(), {
    slidingWindow: vi.fn(),
  }),
}));

// Now import the real module — rateLimit() will return null since no Redis env vars
import { withSessionRateLimit, sessionTokenBucket } from '@/lib/ratelimit';

describe('withSessionRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns allowed when Redis is not configured (dev mode)', async () => {
    const result = await withSessionRateLimit('org-dev', 'pro');
    expect(result.allowed).toBe(true);
    // No Redis headers when Redis is null
    expect(result.headers).toEqual({});
  });

  it('rejects when in-memory bucket exhausted', async () => {
    // Drain the bucket for this org
    for (let i = 0; i < 200; i++) {
      sessionTokenBucket.consume('org-drain');
    }

    const result = await withSessionRateLimit('org-drain', 'enterprise');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBe(60);
    }
  });

  it('allows requests when bucket has tokens', async () => {
    const result = await withSessionRateLimit('org-ok', 'free');
    expect(result.allowed).toBe(true);
  });

  it('isolates rate limits by organizationId', async () => {
    // Drain org-a
    for (let i = 0; i < 200; i++) {
      sessionTokenBucket.consume('org-a');
    }

    // org-b should still work
    const result = await withSessionRateLimit('org-b', 'pro');
    expect(result.allowed).toBe(true);

    // org-a should be blocked
    const blocked = await withSessionRateLimit('org-a', 'pro');
    expect(blocked.allowed).toBe(false);
  });
});
