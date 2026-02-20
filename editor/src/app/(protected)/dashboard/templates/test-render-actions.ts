'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateMergeData } from '@/lib/template-schema';
import { renderQueue } from '@/lib/queue';
import { calculateCredits } from '@/lib/billing';
import {
  deductCreditsForRender,
  refundCredits,
  checkAndWarnLowCredits,
  getTemplateDuration,
} from '@/lib/credits';
import type { MergeField } from '@/types/template';

/**
 * Submit a test render for a template directly from the dashboard.
 * Authenticates via session (not API key), verifies template ownership,
 * validates merge data, deducts credits, and enqueues the render job.
 */
export async function submitTestRender(
  templateId: string,
  mergeData: Record<string, unknown>
): Promise<{ renderId: string } | { error: string }> {
  // Authenticate session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: 'Unauthorized' };
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return { error: 'No active organization' };
  }

  // Verify template belongs to user AND the active organization
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      userId: session.user.id,
    },
    select: {
      id: true,
      mergeFields: true,
      projectData: true,
      organizationId: true,
    },
  });

  if (!template) {
    return { error: 'Template not found or not authorized' };
  }

  // Ensure the template belongs to the user's active organization
  if (template.organizationId !== activeOrgId) {
    return { error: 'Template does not belong to the active organization' };
  }

  // Validate merge data against template schema
  const mergeFields = template.mergeFields as unknown as MergeField[];
  const mergeValidation = validateMergeData(mergeFields, mergeData);

  if (!mergeValidation.success) {
    return { error: 'Invalid merge data' };
  }

  // Check subscription status
  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: {
      subscriptionStatus: true,
    },
  });

  if (!org) {
    return { error: 'Organization not found' };
  }

  if (org.subscriptionStatus === 'past_due') {
    return {
      error:
        'Rendering suspended due to failed payment. Please update your payment method.',
    };
  }

  // Calculate and deduct credits
  const durationSeconds = getTemplateDuration(
    template.projectData as Record<string, any>
  );
  const creditsRequired = calculateCredits(durationSeconds || 30);

  const deductResult = await deductCreditsForRender(
    activeOrgId,
    creditsRequired
  );

  if (!deductResult.success) {
    return {
      error: `Not enough credits. Required: ${deductResult.required}, available: ${deductResult.available}`,
    };
  }

  // Create render record then enqueue — refund credits if either step fails
  let render: { id: string };
  try {
    render = await prisma.render.create({
      data: {
        status: 'queued',
        templateId,
        userId: session.user.id,
        organizationId: activeOrgId,
        mergeData: mergeData as any,
        queuedAt: new Date(),
      },
    });
  } catch {
    await refundCredits(activeOrgId, creditsRequired, 'unknown');
    return {
      error: 'Failed to create render record. Credits have been refunded.',
    };
  }

  try {
    await renderQueue.add(
      'render-video',
      {
        renderId: render.id,
        templateId,
        mergeData,
        options: {},
        userId: session.user.id,
        organizationId: activeOrgId,
        creditsDeducted: creditsRequired,
      },
      { jobId: render.id }
    );
  } catch {
    await refundCredits(activeOrgId, creditsRequired, render.id);
    return { error: 'Failed to queue render. Credits have been refunded.' };
  }

  // Fire-and-forget low-credit warning
  checkAndWarnLowCredits(activeOrgId).catch(() => {});

  return { renderId: render.id };
}
