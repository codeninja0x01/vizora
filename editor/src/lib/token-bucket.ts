type BucketEntry = {
  tokens: number;
  lastRefillAt: number;
};

type TokenBucketConfig = {
  maxTokens: number;
  refillRatePerMinute: number;
  sweepIntervalMs: number;
  maxIdleMs: number;
};

type ConsumeResult =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0; retryAfterSeconds: number };

export class TokenBucket {
  private buckets = new Map<string, BucketEntry>();
  private sweepTimer: ReturnType<typeof setInterval>;
  private config: TokenBucketConfig;

  constructor(config: TokenBucketConfig) {
    this.config = config;
    this.sweepTimer = setInterval(() => this.sweep(), config.sweepIntervalMs);
  }

  consume(identifier: string): ConsumeResult {
    const now = Date.now();
    let entry = this.buckets.get(identifier);

    if (!entry) {
      entry = { tokens: this.config.maxTokens, lastRefillAt: now };
      this.buckets.set(identifier, entry);
    } else {
      const elapsed = now - entry.lastRefillAt;
      const refill = (elapsed / 60_000) * this.config.refillRatePerMinute;
      entry.tokens = Math.min(this.config.maxTokens, entry.tokens + refill);
      entry.lastRefillAt = now;
    }

    if (entry.tokens < 1) {
      return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
    }

    entry.tokens -= 1;
    return { allowed: true, remaining: Math.floor(entry.tokens) };
  }

  dispose(): void {
    clearInterval(this.sweepTimer);
    this.buckets.clear();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.buckets) {
      if (now - entry.lastRefillAt > this.config.maxIdleMs) {
        this.buckets.delete(key);
      }
    }
  }
}
