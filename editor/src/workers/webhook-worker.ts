import { Worker, type Job, UnrecoverableError } from 'bullmq';
import { request } from 'undici';
import { prisma } from '@/lib/db';
import { redisConnection } from '@/lib/redis';
import { generateWebhookSignature } from '@/lib/webhooks/signature';
import type { WebhookJobData } from '@/lib/webhooks/types';

/**
 * Process webhook delivery job
 * Sends HTTP POST with Standard Webhooks headers and HMAC signature
 */
async function processWebhookDelivery(job: Job<WebhookJobData>) {
  const { webhookConfigId, renderId, webhookId, payload } = job.data;

  console.log(
    `[Webhook Worker] Processing delivery for render ${renderId} (webhook ${webhookConfigId})`
  );

  // Fetch webhook config from DB
  const config = await prisma.webhookConfig.findUnique({
    where: { id: webhookConfigId },
  });

  // If webhook was deleted or disabled while job was in queue, skip gracefully
  if (!config || !config.enabled) {
    console.log(
      `[Webhook Worker] Webhook ${webhookConfigId} not found or disabled, skipping delivery`
    );
    return;
  }

  // Prepare delivery
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(
    webhookId,
    timestamp,
    payloadString,
    config.secret
  );

  try {
    // Send HTTP POST via undici
    const response = await request(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': webhookId,
        'webhook-timestamp': timestamp.toString(),
        'webhook-signature': signature,
        'user-agent': 'AutoClip-Webhooks/1.0',
      },
      body: payloadString,
      bodyTimeout: 30000,
      headersTimeout: 30000,
    });

    // Consume response body to prevent memory leaks
    await response.body.dump();

    const statusCode = response.statusCode;

    // Handle response based on status code
    if (statusCode >= 200 && statusCode < 300) {
      // Success - update DB metadata
      await prisma.webhookConfig.update({
        where: { id: webhookConfigId },
        data: {
          lastDeliveryAt: new Date(),
          lastSuccessAt: new Date(),
          consecutiveFailures: 0,
        },
      });

      console.log(
        `[Webhook Worker] Delivery successful for render ${renderId}: HTTP ${statusCode}`
      );
      return;
    } else if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
      // Retryable error - throw regular Error so BullMQ retries with backoff
      throw new Error(
        `Webhook delivery failed: HTTP ${statusCode} (will retry)`
      );
    } else {
      // 4xx (except 429) - permanent failure, throw UnrecoverableError to prevent retries
      throw new UnrecoverableError(
        `Webhook permanently rejected: HTTP ${statusCode}`
      );
    }
  } catch (error) {
    // If it's already an UnrecoverableError, re-throw it
    if (error instanceof UnrecoverableError) {
      throw error;
    }

    // Network errors, timeouts, etc - throw regular Error for retry
    throw new Error(
      `Webhook delivery error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Worker configuration with custom 5^n backoff
const worker = new Worker<WebhookJobData>(
  'webhook-delivery',
  processWebhookDelivery,
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 webhook deliveries in parallel
    settings: {
      backoffStrategy: (attemptsMade: number): number => {
        // Custom 5^n pattern: 5s, 25s, 125s, 625s, 3125s
        return 5 ** attemptsMade * 1000;
      },
    },
  }
);

// Event listeners
worker.on('completed', (job) => {
  console.log(`[Webhook Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', async (job, error) => {
  if (!job) return;

  console.error(`[Webhook Worker] Job ${job.id} failed:`, error.message);

  // If all retries exhausted, update DB metadata
  if (job.attemptsMade >= (job.opts.attempts || 1)) {
    try {
      await prisma.webhookConfig.update({
        where: { id: job.data.webhookConfigId },
        data: {
          lastDeliveryAt: new Date(),
          lastFailureAt: new Date(),
          consecutiveFailures: { increment: 1 },
        },
      });
      console.log(
        `[Webhook Worker] All retries exhausted for webhook ${job.data.webhookConfigId}`
      );
    } catch (dbError) {
      console.error(
        `[Webhook Worker] Failed to update webhook metadata:`,
        dbError
      );
    }
  }
});

worker.on('error', (error) => {
  console.error('[Webhook Worker] Worker error:', error);
});

// Graceful shutdown handlers
async function shutdown(signal: string) {
  console.log(
    `[Webhook Worker] ${signal} received, shutting down gracefully...`
  );
  await worker.close();
  await prisma.$disconnect();
  console.log('[Webhook Worker] Worker shut down successfully');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Startup log
console.log(
  '[Webhook Worker] Webhook delivery worker started, waiting for jobs...'
);
console.log('[Webhook Worker] Concurrency: 5');
