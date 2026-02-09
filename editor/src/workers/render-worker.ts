import { Worker, type Job } from 'bullmq';
import { prisma } from '@/lib/db';
import { redisConnection } from '@/lib/redis';
import { applyMergeData } from '@/lib/merge-fields';
import { formatRenderError } from '@/lib/error-categorization';
import type { MergeField } from '@/types/template';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { webhookQueue } from '@/lib/webhooks/queue';
import type { WebhookPayload } from '@/lib/webhooks/types';
import { randomUUID } from 'node:crypto';

// Dynamic import for ESM package
let Renderer: any;

const RENDER_OUTPUT_DIR = process.env.RENDER_OUTPUT_DIR || '/tmp/renders';
const RENDER_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes per user decision

/**
 * Enqueue webhook delivery jobs for all enabled webhooks in the organization
 * Fire-and-forget: webhook failures must not affect render outcomes
 */
async function enqueueWebhooks(
  renderId: string,
  organizationId: string,
  payload: WebhookPayload
): Promise<void> {
  try {
    // Find all enabled webhooks for this organization
    const webhooks = await prisma.webhookConfig.findMany({
      where: { organizationId, enabled: true },
      select: { id: true },
    });

    if (webhooks.length === 0) return;

    // Enqueue a delivery job for each webhook
    const jobs = webhooks.map((webhook) => ({
      name: 'deliver-webhook',
      data: {
        webhookConfigId: webhook.id,
        renderId,
        webhookId: `whk_${randomUUID().replace(/-/g, '')}`,
        payload,
      },
    }));

    await webhookQueue.addBulk(jobs);
    console.log(
      `[Worker] Enqueued ${jobs.length} webhook(s) for render ${renderId}`
    );
  } catch (error) {
    // Log but do NOT throw — webhook failure must not affect render status
    console.error(
      `[Worker] Failed to enqueue webhooks for render ${renderId}:`,
      error
    );
  }
}

/**
 * Job processor function for render jobs
 */
async function processRenderJob(job: Job) {
  // Ensure output directory exists on first job
  await mkdir(RENDER_OUTPUT_DIR, { recursive: true });

  // Load Renderer dynamically (ESM package)
  if (!Renderer) {
    const module = await import('@designcombo/node');
    Renderer = module.Renderer;
  }

  console.log(
    `[Worker] Processing render ${job.data.renderId} (template: ${job.data.templateId})`
  );

  try {
    // Update DB status to 'active'
    await prisma.render.update({
      where: { id: job.data.renderId },
      data: { status: 'active', startedAt: new Date() },
    });

    // Report initial progress
    await job.updateProgress({ percent: 5, userId: job.data.userId });

    // Fetch template with projectData (full data, not the API-trimmed version)
    const template = await prisma.template.findUnique({
      where: { id: job.data.templateId },
    });

    if (!template) {
      throw new Error(`Template ${job.data.templateId} not found`);
    }

    // Report progress after fetching template
    await job.updateProgress({ percent: 10, userId: job.data.userId });

    // Apply merge data using existing applyMergeData from merge-fields.ts
    const mergedProjectData = applyMergeData(
      template.projectData as Record<string, unknown>,
      template.mergeFields as unknown as MergeField[],
      job.data.mergeData || {}
    );

    // Report progress after applying merge data
    await job.updateProgress({ percent: 15, userId: job.data.userId });

    // Render video using Renderer class from @designcombo/node
    const outputPath = join(RENDER_OUTPUT_DIR, `${job.data.renderId}.mp4`);
    const renderer = new Renderer({
      json: mergedProjectData,
      outputPath,
      browserOptions: {
        headless: true,
        timeout: RENDER_TIMEOUT_MS,
      },
    });

    // Progress handler with throttling (max 2 updates/sec)
    let lastProgressUpdate = 0;
    renderer.on('progress', (progress: any) => {
      const now = Date.now();
      if (now - lastProgressUpdate < 500) return; // Throttle to max 2 updates/sec
      lastProgressUpdate = now;

      // Map renderer progress to 15-90% range (15% is pre-render, 90% is post-render)
      // The renderer emits progress with a message, we'll estimate based on frame rendering
      const percent = progress.percent
        ? 15 + Math.floor(progress.percent * 0.75)
        : undefined;

      if (percent !== undefined) {
        job.updateProgress({ percent, userId: job.data.userId });
        console.log(
          `[Worker] Render ${job.data.renderId}: ${percent}% - ${progress.message || ''}`
        );
      } else {
        console.log(
          `[Worker] Render ${job.data.renderId}: ${progress.message}`
        );
      }
    });

    await renderer.render();

    // Report near-completion progress
    await job.updateProgress({ percent: 95, userId: job.data.userId });

    // Update DB with completed status
    const outputUrl = `/renders/${job.data.renderId}.mp4`;
    await prisma.render.update({
      where: { id: job.data.renderId },
      data: {
        status: 'completed',
        outputUrl,
        completedAt: new Date(),
      },
    });

    console.log(
      `[Worker] Render ${job.data.renderId} completed -> ${outputUrl}`
    );

    // Enqueue webhook notifications
    await enqueueWebhooks(job.data.renderId, job.data.organizationId, {
      type: 'render.completed',
      timestamp: new Date().toISOString(),
      data: {
        type: 'render.completed',
        renderId: job.data.renderId,
        templateId: job.data.templateId,
        status: 'done',
        outputUrl,
        completedAt: new Date().toISOString(),
      },
    });

    // Return result for BullMQ's completed event (include userId for event routing)
    return { outputPath, outputUrl, userId: job.data.userId };
  } catch (error) {
    const { category, message } = formatRenderError(error);
    await prisma.render.update({
      where: { id: job.data.renderId },
      data: {
        status: 'failed',
        errorCategory: category,
        errorMessage: message,
        failedAt: new Date(),
      },
    });
    console.error(
      `[Worker] Render ${job.data.renderId} failed [${category}]: ${message}`
    );

    // Enqueue webhook notifications for failure
    await enqueueWebhooks(job.data.renderId, job.data.organizationId, {
      type: 'render.failed',
      timestamp: new Date().toISOString(),
      data: {
        type: 'render.failed',
        renderId: job.data.renderId,
        templateId: job.data.templateId,
        status: 'failed',
        error: { category, message },
        failedAt: new Date().toISOString(),
      },
    });

    throw error; // Re-throw so BullMQ marks job as failed
  }
}

// Worker configuration per user decisions
const worker = new Worker('render-queue', processRenderJob, {
  connection: redisConnection,
  concurrency: 1, // 1 render at a time per worker
  lockDuration: 900000, // 15 minutes (matches render timeout)
  stalledInterval: 60000, // Check for stalled jobs every 1 minute
  maxStalledCount: 1, // Fail job after 1 stall (no auto-retry)
});

// Event listeners
worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('[Worker] Worker error:', error);
});

worker.on('stalled', (jobId) => {
  console.warn(`[Worker] Job ${jobId} stalled`);
});

// Graceful shutdown handlers
async function shutdown(signal: string) {
  console.log(`[Worker] ${signal} received, shutting down gracefully...`);
  await worker.close();
  await prisma.$disconnect();
  console.log('[Worker] Worker shut down successfully');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Startup log
console.log('[Worker] Render worker started, waiting for jobs...');
console.log(`[Worker] Output directory: ${RENDER_OUTPUT_DIR}`);
console.log(`[Worker] Timeout: ${RENDER_TIMEOUT_MS / 1000}s`);
