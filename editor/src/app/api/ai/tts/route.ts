import { auth } from '@/lib/auth';
import { createTTSProvider } from '@/lib/ai/providers/tts/factory';
import type { AIProvider } from '@/lib/ai/types';
import { R2StorageService } from '@/lib/r2';
import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

const r2 = new R2StorageService({
  bucketName: process.env.R2_BUCKET_NAME || '',
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  cdn: process.env.R2_PUBLIC_DOMAIN || '',
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { text, voiceId, provider, speed } = body;

    // Validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 5000 characters' },
        { status: 400 }
      );
    }

    if (!voiceId || typeof voiceId !== 'string') {
      return NextResponse.json(
        { error: 'Voice ID is required and must be a string' },
        { status: 400 }
      );
    }

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json(
        { error: 'Provider is required and must be a string' },
        { status: 400 }
      );
    }

    if (!['elevenlabs', 'openai'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider must be either "elevenlabs" or "openai"' },
        { status: 400 }
      );
    }

    if (
      speed !== undefined &&
      (typeof speed !== 'number' || speed < 0.25 || speed > 4.0)
    ) {
      return NextResponse.json(
        { error: 'Speed must be a number between 0.25 and 4.0' },
        { status: 400 }
      );
    }

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
    console.error('[TTS] Error:', error);

    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'Provider not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
