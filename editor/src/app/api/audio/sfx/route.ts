import { withAIAuth } from '@/lib/ai-middleware';
import { zodErrorResponse } from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const audioSfxSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(80).default(20),
    page: z.coerce.number().int().min(1).max(100).default(1),
    query: z
      .object({
        keys: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
      })
      .strict()
      .default({}),
  })
  .strict();

export async function POST(req: NextRequest) {
  const authResult = await withAIAuth('audio/sfx')(req);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const parsed = audioSfxSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const response = await fetch(
      'https://api-editor.cloud-45c.workers.dev/api/sound-effects/search',
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
        { error: errorData.message || 'Failed to fetch sound effects' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('SFX API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
