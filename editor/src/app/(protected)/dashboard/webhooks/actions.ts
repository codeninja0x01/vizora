'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateWebhookSecret } from '@/lib/webhooks/signature';
import { validateWebhookUrl } from '@/lib/webhooks/validator';

/**
 * Create a new webhook for the current user's active organization
 *
 * @param url - Webhook endpoint URL
 * @returns The webhook ID and secret (shown once) or an error message
 */
export async function createWebhook(
  url: string
): Promise<{ id: string; secret: string } | { error: string }> {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Get active organization from session
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return {
      error:
        'No active organization. Please create or select an organization first.',
    };
  }

  // Validate URL
  if (!url.trim()) {
    return { error: 'URL is required' };
  }

  const validation = validateWebhookUrl(url.trim());
  if (!validation.valid) {
    return { error: validation.error || 'Invalid URL' };
  }

  // Generate webhook secret
  const secret = generateWebhookSecret();

  // Create webhook in database
  const webhook = await prisma.webhookConfig.create({
    data: {
      organizationId: activeOrgId,
      url: url.trim(),
      secret,
    },
  });

  // Revalidate the webhooks page to show the new webhook
  revalidatePath('/dashboard/webhooks');

  // Return the webhook ID and secret - this is the ONLY time the secret is shown
  return { id: webhook.id, secret };
}

/**
 * Delete a webhook
 *
 * @param id - ID of the webhook to delete
 * @returns Success status or error message
 */
export async function deleteWebhook(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Get active organization from session
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return { error: 'No active organization' };
  }

  // Find the webhook
  const webhook = await prisma.webhookConfig.findUnique({
    where: { id },
    select: {
      organizationId: true,
    },
  });

  // Verify webhook exists and belongs to organization
  if (!webhook) {
    return { error: 'Webhook not found' };
  }

  if (webhook.organizationId !== activeOrgId) {
    return { error: 'Not authorized to delete this webhook' };
  }

  // Delete the webhook
  await prisma.webhookConfig.delete({
    where: { id },
  });

  // Revalidate the webhooks page to remove the deleted webhook
  revalidatePath('/dashboard/webhooks');

  return { success: true };
}

/**
 * Rotate webhook secret (generate new one)
 *
 * @param id - ID of the webhook to rotate
 * @returns The new secret (shown once) or an error message
 */
export async function rotateWebhookSecret(
  id: string
): Promise<{ secret: string } | { error: string }> {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Get active organization from session
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return { error: 'No active organization' };
  }

  // Find the webhook
  const webhook = await prisma.webhookConfig.findUnique({
    where: { id },
    select: {
      organizationId: true,
    },
  });

  // Verify webhook exists and belongs to organization
  if (!webhook) {
    return { error: 'Webhook not found' };
  }

  if (webhook.organizationId !== activeOrgId) {
    return { error: 'Not authorized to rotate this webhook secret' };
  }

  // Generate new secret
  const newSecret = generateWebhookSecret();

  // Update webhook with new secret and reset failure count
  await prisma.webhookConfig.update({
    where: { id },
    data: {
      secret: newSecret,
      consecutiveFailures: 0,
    },
  });

  // Revalidate the webhooks page
  revalidatePath('/dashboard/webhooks');

  // Return the new secret - this is the ONLY time it's shown
  return { secret: newSecret };
}

/**
 * Toggle webhook enabled/disabled state
 *
 * @param id - ID of the webhook to toggle
 * @param enabled - New enabled state
 * @returns Success status or error message
 */
export async function toggleWebhook(
  id: string,
  enabled: boolean
): Promise<{ success: boolean } | { error: string }> {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Get active organization from session
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return { error: 'No active organization' };
  }

  // Find the webhook
  const webhook = await prisma.webhookConfig.findUnique({
    where: { id },
    select: {
      organizationId: true,
    },
  });

  // Verify webhook exists and belongs to organization
  if (!webhook) {
    return { error: 'Webhook not found' };
  }

  if (webhook.organizationId !== activeOrgId) {
    return { error: 'Not authorized to modify this webhook' };
  }

  // Update enabled state
  await prisma.webhookConfig.update({
    where: { id },
    data: { enabled },
  });

  // Revalidate the webhooks page
  revalidatePath('/dashboard/webhooks');

  return { success: true };
}
