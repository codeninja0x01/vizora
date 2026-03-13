import { withRateLimitedAuth } from '@/lib/ai-middleware';
import { zodErrorResponse } from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const pexelsQuerySchema = z.object({
  type: z.enum(['image', 'video']).default('image'),
  query: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  per_page: z.coerce.number().int().min(1).max(80).default(20),
});

function buildPexelsUrl(
  type: string,
  query: string | undefined,
  page: number,
  per_page: number
): string {
  if (type === 'image') {
    return query
      ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}`
      : `https://api.pexels.com/v1/curated?page=${page}&per_page=${per_page}`;
  }
  return query
    ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}`
    : `https://api.pexels.com/videos/popular?page=${page}&per_page=${per_page}`;
}

export async function GET(req: NextRequest) {
  const authResult = await withRateLimitedAuth()(req);
  if (authResult instanceof Response) return authResult;
  // Auth verified — session available in authResult if needed

  const { searchParams } = new URL(req.url);
  const parsed = pexelsQuerySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
    query: searchParams.get('query') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    per_page: searchParams.get('per_page') ?? undefined,
  });
  if (!parsed.success) return zodErrorResponse(parsed.error);

  if (!PEXELS_API_KEY) {
    return NextResponse.json(
      { error: 'PEXELS_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const { type, query, page, per_page } = parsed.data;
  const url = buildPexelsUrl(type, query, page, per_page);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch from Pexels' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Pexels API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
