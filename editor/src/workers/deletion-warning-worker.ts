import { Worker } from 'bullmq';
import { prisma } from '@/lib/db';
import { redisConnection } from '@/lib/redis';

const worker = new Worker(
  'deletion-warnings',
  async (job) => {
    const { renderId, userId } = job.data;

    // Fetch render - skip if already deleted or not completed
    const render = await prisma.render.findUnique({
      where: { id: renderId },
      include: {
        user: { select: { email: true, name: true } },
        template: { select: { name: true } },
      },
    });

    if (!render || render.status !== 'completed') {
      console.log(
        `[DeletionWarning] Render ${renderId} not found or not completed, skipping`
      );
      return;
    }

    // Send email via Resend (optional, same pattern as Phase 2)
    // Check if RESEND_API_KEY is configured
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const expiresAt = render.expiresAt
        ? render.expiresAt.toLocaleDateString()
        : 'soon';

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@openvideo.dev',
        to: render.user.email,
        subject: `Your rendered video expires ${expiresAt}`,
        html: `<p>Hi ${render.user.name || 'there'},</p>
        <p>Your rendered video "${render.template.name}" will be automatically deleted on <strong>${expiresAt}</strong>.</p>
        <p>If you need this video, please download it before it expires.</p>
        <p>${render.outputUrl ? `<a href="${render.outputUrl}">Download Video</a>` : ''}</p>
        <p>— Vizora</p>`,
      });
      console.log(
        `[DeletionWarning] Email sent to ${render.user.email} for render ${renderId}`
      );
    } else {
      console.log(
        `[DeletionWarning] RESEND_API_KEY not set, logging warning for render ${renderId}`
      );
      console.log(
        `[DeletionWarning] Would email ${render.user.email}: Video "${render.template.name}" expires ${render.expiresAt}`
      );
    }

    // Set dashboard banner flag
    await prisma.render.update({
      where: { id: renderId },
      data: { deletionWarningShown: true },
    });

    console.log(`[DeletionWarning] Processed warning for render ${renderId}`);
  },
  {
    connection: redisConnection,
    concurrency: 5, // Can process multiple email jobs concurrently
  }
);

// Event listeners
worker.on('completed', (job) => {
  console.log(`[DeletionWarning] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  console.error(`[DeletionWarning] Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('[DeletionWarning] Worker error:', error);
});

// Graceful shutdown handlers
async function shutdown(signal: string) {
  console.log(
    `[DeletionWarning] ${signal} received, shutting down gracefully...`
  );
  await worker.close();
  await prisma.$disconnect();
  console.log('[DeletionWarning] Worker shut down successfully');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Startup log
console.log(
  '[DeletionWarning] Deletion warning worker started, waiting for jobs...'
);
