import Redis from 'ioredis';

// Singleton pattern for Redis connection to prevent multiple instances in serverless/dev
// This pattern survives HMR in development without creating new connections

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// BullMQ requires specific Redis configuration:
// - maxRetriesPerRequest: null (BullMQ will error without this)
// - enableReadyCheck: false (required for BullMQ compatibility)
export const redisConnection =
  globalForRedis.redis ??
  new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

// Event handlers for connection monitoring
redisConnection.on('error', (error) => {
  console.error('[Redis] Connection error:', error);
});

redisConnection.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

// Attach to globalThis in non-production to survive HMR
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redisConnection;
}
