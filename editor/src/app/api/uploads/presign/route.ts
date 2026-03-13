import { randomUUID } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { config } from '@/lib/config';
import { R2StorageService } from '@/lib/r2';
import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';

const presignSchema = z.object({
  fileNames: z
    .array(z.string().min(1).max(255))
    .min(1, 'fileNames must not be empty')
    .max(20, 'Maximum 20 files per request'),
});

const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const userId = session.user.id;
    const { fileNames } = parsed.data;

    const uploads = await Promise.all(
      fileNames.map(async (originalName) => {
        const cleanName = originalName.trim();
        const uniqueName = `${userId}/${randomUUID()}-${cleanName}`;

        const presigned = await r2.createPresignedUpload(uniqueName, {
          contentType: undefined,
          expiresIn: 3600,
        });

        return {
          fileName: cleanName,
          filePath: presigned.filePath,
          contentType: presigned.contentType,
          presignedUrl: presigned.presignedUrl,
          url: presigned.url,
        };
      })
    );

    return NextResponse.json({ success: true, uploads });
  } catch (error) {
    console.error('[presign] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
