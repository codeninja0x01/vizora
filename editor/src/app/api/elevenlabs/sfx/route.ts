import { R2StorageService } from '@/lib/r2';
import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const r2 = new R2StorageService({
  bucketName: process.env.R2_BUCKET_NAME || '',
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  cdn: process.env.R2_PUBLIC_DOMAIN || '',
});

const sfxSchema = z.object({
  text: z.string().min(1).max(1000),
  duration: z.number().min(0.5).max(300).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = sfxSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { text, duration } = parsed.data;

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const url = `${process.env.ELEVENLABS_URL}/v1/sound-generation`;

    const headers = {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey || '',
    };

    const data = {
      text,
      duration_seconds: duration || undefined, // ElevenLabs SFX API might auto-determine if not provided, or have a default
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs SFX API Error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate sfx', details: errorText },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `sfx/${Date.now()}.mp3`;
    await r2.uploadData(fileName, buffer, 'audio/mpeg');

    // Get asset URL (direct CDN or proxy based on R2_SERVE_MODE)
    const origin = req.headers.get('origin') || undefined;
    const assetUrl = r2.getAssetUrl(fileName, origin);

    return NextResponse.json({ url: assetUrl });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
