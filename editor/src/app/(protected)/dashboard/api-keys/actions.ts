'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/api-keys';

/**
 * Create a new API key for the current user's active organization
 *
 * @param name - Display name for the API key
 * @returns The full API key (shown once) or an error message
 */
export async function createApiKey(
  name: string
): Promise<{ key: string } | { error: string }> {
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

  // Generate new API key with hash and prefix
  const { key, hash, prefix } = generateApiKey();

  // Store hashed key in database
  await prisma.apiKey.create({
    data: {
      name,
      keyHash: hash,
      keyPrefix: prefix,
      userId: session.user.id,
      organizationId: activeOrgId,
    },
  });

  // Revalidate the API keys page to show the new key
  revalidatePath('/dashboard/api-keys');

  // Return the full key - this is the ONLY time it's shown
  return { key };
}

/**
 * Revoke an API key (soft delete by setting revokedAt timestamp)
 *
 * @param keyId - ID of the API key to revoke
 * @returns Success status or error message
 */
export async function revokeApiKey(
  keyId: string
): Promise<{ success: boolean } | { error: string }> {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  // Find the API key
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: keyId },
    select: {
      userId: true,
      organizationId: true,
      revokedAt: true,
    },
  });

  // Verify key exists and not already revoked
  if (!apiKey) {
    return { error: 'API key not found' };
  }

  if (apiKey.revokedAt !== null) {
    return { error: 'API key already revoked' };
  }

  // Verify ownership: user must own the key
  // TODO: Also allow org owners/admins to revoke keys
  if (apiKey.userId !== session.user.id) {
    return { error: 'Not authorized to revoke this API key' };
  }

  // Soft delete by setting revokedAt timestamp
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  // Revalidate the API keys page to remove the revoked key
  revalidatePath('/dashboard/api-keys');

  return { success: true };
}
