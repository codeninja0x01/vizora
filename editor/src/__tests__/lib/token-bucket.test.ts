import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenBucket } from '@/lib/token-bucket';

describe('TokenBucket', () => {
  let bucket: TokenBucket;

  beforeEach(() => {
    vi.useFakeTimers();
    bucket = new TokenBucket({
      maxTokens: 200,
      refillRatePerMinute: 200,
      sweepIntervalMs: 60_000,
      maxIdleMs: 300_000,
    });
  });

  afterEach(() => {
    bucket.dispose();
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    const result = bucket.consume('org-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(199);
  });

  it('rejects requests when tokens exhausted', () => {
    for (let i = 0; i < 200; i++) {
      bucket.consume('org-1');
    }
    const result = bucket.consume('org-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(!result.allowed && result.retryAfterSeconds).toBe(60);
  });

  it('refills tokens over time', () => {
    for (let i = 0; i < 200; i++) {
      bucket.consume('org-1');
    }
    vi.advanceTimersByTime(30_000);
    const result = bucket.consume('org-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(98);
  });

  it('does not exceed max tokens after long idle', () => {
    vi.advanceTimersByTime(600_000);
    const result = bucket.consume('org-1');
    expect(result.remaining).toBe(199);
  });

  it('sweeps idle entries', () => {
    bucket.consume('org-1');
    vi.advanceTimersByTime(300_001);
    vi.advanceTimersByTime(60_000);
    const result = bucket.consume('org-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(199);
  });

  it('isolates different identifiers', () => {
    for (let i = 0; i < 200; i++) {
      bucket.consume('org-1');
    }
    const result = bucket.consume('org-2');
    expect(result.allowed).toBe(true);
  });
});
