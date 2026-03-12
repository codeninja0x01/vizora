import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Passthrough schema — body is forwarded to external worker.
// Ensures the body is a valid JSON object; actual field validation
// is the responsibility of the downstream worker.
const audioMusicSchema = z.object({}).passthrough();

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = audioMusicSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const response = await fetch(
      'https://api-editor.cloud-45c.workers.dev/api/musics/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsed.data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch music' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Music API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
