import { withApiAuth, type ApiKeyContext } from '@/lib/api-middleware';
import { config } from '@/lib/config';
import { R2StorageService } from '@/lib/r2';
import { validateFileSize, ALLOWED_FILE_TYPES } from '@/lib/storage/validation';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

// Initialize R2 service
const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

// Get all allowed MIME types
const allowedMimes = [
  ...ALLOWED_FILE_TYPES.video.mimes,
  ...ALLOWED_FILE_TYPES.image.mimes,
  ...ALLOWED_FILE_TYPES.audio.mimes,
];

// Request validation schema
const presignedUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().refine((mime) => allowedMimes.includes(mime as any), {
    message: 'Invalid content type',
  }),
  size: z.number().int().positive(),
  folderId: z.string().optional(),
});

/**
 * POST /api/v1/assets/presigned
 * Generate presigned URL for direct R2 upload
 */
async function postHandler(
  request: Request,
  context: ApiKeyContext
): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = presignedUrlSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { filename, contentType, size, folderId } = validation.data;

    // Validate file size
    const sizeValidation = validateFileSize(size);
    if (!sizeValidation.valid) {
      return Response.json(
        { error: 'Validation failed', message: sizeValidation.error },
        { status: 400 }
      );
    }

    // If folderId provided, verify it exists and belongs to org
    if (folderId) {
      const { prisma } = await import('@/lib/db');
      const folder = await prisma.assetFolder.findFirst({
        where: {
          id: folderId,
          organizationId: context.organizationId,
        },
      });

      if (!folder) {
        return Response.json(
          { error: 'Validation failed', message: 'Folder not found' },
          { status: 400 }
        );
      }
    }

    // Sanitize filename: replace spaces with hyphens, remove special chars
    const sanitizedFilename = filename
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\-_.]/g, '');

    // Generate R2 key: assets/{orgId}/{assetId}/{filename}
    const assetId = randomUUID();
    const r2Key = `assets/${context.organizationId}/${assetId}/${sanitizedFilename}`;

    // Generate presigned URL
    const presigned = await r2.createPresignedUpload(r2Key, {
      contentType,
      expiresIn: 3600,
    });

    // Return presigned URL with metadata
    return Response.json(
      {
        presignedUrl: presigned.presignedUrl,
        r2Key,
        cdnUrl: presigned.url,
        contentType,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/v1/assets/presigned error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate presigned URL',
      },
      { status: 500 }
    );
  }
}

// Export wrapped handler
export const POST = withApiAuth(postHandler);
