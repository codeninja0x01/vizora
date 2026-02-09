'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { queueBatchRenders } from '@/lib/batch/queue';
import { BATCH_SIZE_LIMITS } from '@/lib/batch/types';
import type { MergeField } from '@/types/template';
import Ajv from 'ajv';

const ajv = new Ajv();

/**
 * Get user's templates with merge fields for bulk generation dropdown
 *
 * Returns minimal template data: id, name, mergeFields, mergeSchema
 * Excludes projectData (too large for dropdown)
 *
 * @returns Array of templates or error
 */
export async function getTemplatesForBulk(): Promise<
  | {
      templates: Array<{
        id: string;
        name: string;
        mergeFields: MergeField[];
        mergeSchema: Record<string, unknown>;
      }>;
    }
  | { error: string }
> {
  // Get authenticated session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: 'Unauthorized' };
  }

  // Query user's templates with merge fields only
  const templates = await prisma.template.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      mergeFields: true,
      mergeSchema: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Cast JsonValue types
  return {
    templates: templates.map((t) => ({
      ...t,
      mergeFields: t.mergeFields as unknown as MergeField[],
      mergeSchema: t.mergeSchema as unknown as Record<string, unknown>,
    })),
  };
}

/**
 * Submit a batch of renders (dashboard version - session auth)
 *
 * Creates Batch + Render records and queues via queueBatchRenders.
 * Returns batchId and totalCount on success.
 *
 * @param templateId - Template to render
 * @param mergeDataArray - Array of merge data objects (one per row)
 * @returns Batch ID and count, or error
 */
export async function submitBatch(
  templateId: string,
  mergeDataArray: Record<string, unknown>[]
): Promise<{ batchId: string; totalCount: number } | { error: string }> {
  // Get authenticated session
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

  // Get user tier from their most recently used API key (or default to free)
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      organizationId: activeOrgId,
      revokedAt: null,
    },
    orderBy: {
      lastUsedAt: 'desc',
    },
    select: { tier: true },
  });

  const tier = (apiKey?.tier.toLowerCase() || 'free') as
    | 'free'
    | 'pro'
    | 'enterprise';

  // Enforce batch size limits per tier
  const limit = BATCH_SIZE_LIMITS[tier];
  if (mergeDataArray.length > limit) {
    return {
      error: `Batch size exceeds ${tier} tier limit of ${limit} renders`,
    };
  }

  // Get template with merge schema
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      OR: [{ userId: session.user.id }, { isPublic: true }],
    },
    select: {
      id: true,
      mergeSchema: true,
      organizationId: true,
    },
  });

  if (!template) {
    return { error: 'Template not found or not accessible' };
  }

  // Validate all merge data rows against schema (eager validation)
  const mergeSchema = template.mergeSchema as Record<string, unknown>;
  const validate = ajv.compile(mergeSchema);

  for (let i = 0; i < mergeDataArray.length; i++) {
    const valid = validate(mergeDataArray[i]);
    if (!valid) {
      return {
        error: `Validation failed for row ${i + 1}: ${ajv.errorsText(validate.errors)}`,
      };
    }
  }

  // Check concurrent queue limits (similar to API endpoint logic)
  const queuedCount = await prisma.render.count({
    where: {
      organizationId: activeOrgId,
      status: { in: ['queued', 'processing'] },
    },
  });

  const queueLimits = {
    free: 5,
    pro: 50,
    enterprise: Number.POSITIVE_INFINITY,
  };

  const availableSlots = queueLimits[tier] - queuedCount;
  if (availableSlots < mergeDataArray.length) {
    return {
      error: `Queue limit reached. ${availableSlots} slots available, ${mergeDataArray.length} requested.`,
    };
  }

  // Create Batch record
  const batch = await prisma.batch.create({
    data: {
      templateId: template.id,
      organizationId: activeOrgId,
      totalCount: mergeDataArray.length,
      status: 'queued',
    },
  });

  // Create Render records
  const renders = await Promise.all(
    mergeDataArray.map((mergeData, index) =>
      prisma.render.create({
        data: {
          templateId: template.id,
          userId: session.user.id,
          organizationId: activeOrgId,
          mergeData: mergeData as any,
          status: 'queued',
          batchId: batch.id,
          batchIndex: index,
        },
      })
    )
  );

  // Queue all renders via batch queue utility
  await queueBatchRenders(
    renders.map((r) => ({
      id: r.id,
      mergeData: r.mergeData as Record<string, unknown>,
      batchIndex: r.batchIndex!,
    })),
    batch.id,
    template.id,
    session.user.id,
    activeOrgId
  );

  return {
    batchId: batch.id,
    totalCount: mergeDataArray.length,
  };
}
