// app/api/transcribe/route.ts
import { withAIAuth } from '@/lib/ai-middleware';
import { zodErrorResponse } from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import { transcribe } from '@/lib/transcribe';
import { z } from 'zod';

const transcribeSchema = z.object({
  url: z.string().url(),
  targetLanguage: z.string().max(10).optional(),
  language: z.string().max(10).optional(),
  model: z.string().max(50).optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await withAIAuth('transcribe')(request);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const parsed = transcribeSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { url, targetLanguage, language, model } = parsed.data;

    // Transcribe audio using the shared transcribe library
    const result = await transcribe({
      url,
      language: targetLanguage || language, // Support both field names
      model: model || 'nova-3',
      smartFormat: true,
      paragraphs: true,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
