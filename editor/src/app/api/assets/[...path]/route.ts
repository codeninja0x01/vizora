import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { type NextRequest, NextResponse } from 'next/server';

/** Only these R2 key prefixes are publicly accessible. */
const ALLOWED_PREFIXES = ['assets/', 'renders/'];

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const key = pathArray.join('/');

    // Block path traversal and restrict to known public prefixes
    if (
      key.includes('..') ||
      key.includes('\0') ||
      !ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch from R2
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || '',
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    // Return with proper CORS headers
    // Note: Wildcard CORS is intentional for this public asset proxy endpoint
    // This endpoint serves public media (audio, video, images) only
    // For private assets, use authenticated endpoints instead
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Length':
          response.ContentLength?.toString() || buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (error) {
    console.error('[assets/proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
