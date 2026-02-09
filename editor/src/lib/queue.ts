import { Queue } from 'bullmq';
import { redisConnection } from './redis';

// BullMQ render queue for async video rendering
// No auto-retry pattern: user decision to fail fast and let users retry manually

export const renderQueue = new Queue('render-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // No auto-retry - fail fast on errors
    removeOnComplete: {
      age: 30 * 24 * 60 * 60, // Keep completed jobs for 30 days
      count: 10000, // Keep max 10,000 completed jobs
    },
    removeOnFail: {
      age: 30 * 24 * 60 * 60, // Keep failed jobs for 30 days
      count: 5000, // Keep max 5,000 failed jobs
    },
  },
});
