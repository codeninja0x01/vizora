import { Queue } from 'bullmq';
import { redisConnection } from '@/lib/redis';

export const deletionWarningQueue = new Queue('deletion-warnings', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 }, // Retry email sending
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});
