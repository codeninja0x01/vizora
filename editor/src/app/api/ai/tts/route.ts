import { createTTSProvider } from '@/lib/ai/providers/tts/factory';
import type { AIProvider } from '@/lib/ai/types';
import { R2StorageService } from '@/lib/r2';
import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const r2 = new R2StorageService({
  bucketName: process.env.R2_BUCKET_NAME || '',
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  cdn: process.env.R2_PUBLIC_DOMAIN || '',
});

const ttsSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  provider: z.enum(['elevenlabs', 'openai']),
  speed: z.number().min(0.25).max(4.0).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = ttsSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { text, voiceId, provider, speed } = parsed.data;

    // Get organization ID from session
    const orgId = session.user.id;

    // Create provider and synthesize
    const ttsProvider = createTTSProvider(provider as AIProvider);
    const audioBuffer = await ttsProvider.synthesize({
      text,
      voiceId,
      speed,
      provider: provider as AIProvider,
    });

    // Upload to R2
    const fileName = `voiceovers/${orgId}/${randomUUID()}.mp3`;
    const buffer = Buffer.from(audioBuffer);
    await r2.uploadData(fileName, buffer, 'audio/mpeg');

    // Get asset URL (direct CDN or proxy based on R2_SERVE_MODE)
    const origin = req.headers.get('origin') || undefined;
    const assetUrl = r2.getAssetUrl(fileName, origin);

    // Calculate approximate duration (rough estimate based on text length)
    // Average speaking rate is ~150 words per minute
    const wordCount = text.split(/\s+/).length;
    const durationSeconds = (wordCount / 150) * 60;

    return NextResponse.json({
      url: assetUrl,
      duration: Math.round(durationSeconds * 1000) / 1000,
      provider,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Check for specific provider errors
      if (error.message.includes('not configured')) {
        return NextResponse.json(
          { error: 'Provider not configured', details: error.message },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to generate speech', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
