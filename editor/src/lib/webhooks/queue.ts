// BullMQ webhook delivery queue with custom exponential backoff
// Backoff strategy: 5^n (5s, 25s, 125s, 625s, 3125s)

import { Queue } from 'bullmq';
import { redisConnection } from '@/lib/redis';
import type { WebhookJobData } from './types';

/**
 * Webhook delivery queue
 * - 6 attempts (1 initial + 5 retries)
 * - Custom backoff strategy for 5^n exponential backoff
 * - 7-day retention for completed/failed jobs
 */
export const webhookQueue = new Queue<WebhookJobData>('webhook-delivery', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 6, // 1 initial + 5 retries
    backoff: { type: 'custom' }, // Custom 5^n backoff implemented in worker
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // 7 days in seconds
      count: 5000,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // 7 days in seconds
      count: 2000,
    },
  },
});
