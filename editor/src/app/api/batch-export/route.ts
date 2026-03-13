import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';

const EXPORT_DIR = process.env.RENDER_OUTPUT_DIR || '/tmp/batch-exports';

const batchExportSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(255)
    .refine(
      (val) => !/[/\\]/.test(val) && !val.includes('..') && !val.includes('\0'),
      'Filename must not contain path separators, "..", or null bytes'
    ),
});

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorizedResponse();

  try {
    const presetsPath = path.join(
      process.cwd(),
      '../packages/openvideo/src/animation/presets.ts'
    );
    const presetsContent = fs.readFileSync(presetsPath, 'utf-8');
    const animationKeys = [
      ...presetsContent.matchAll(/animationRegistry\.register\("([^"]+)"/g),
    ].map((m) => m[1]);

    const projectTemplatePath = path.join(process.cwd(), 'src/data/data.json');
    const template = JSON.parse(fs.readFileSync(projectTemplatePath, 'utf-8'));

    return NextResponse.json({ success: true, keys: animationKeys, template });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load animation presets' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorizedResponse();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    const filename = formData.get('filename') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Missing file' },
        { status: 400 }
      );
    }

    const parsed = batchExportSchema.safeParse({ filename });
    if (!parsed.success) return zodErrorResponse(parsed.error);

    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFilename = `${randomUUID()}.mp4`;
    const filePath = path.join(EXPORT_DIR, safeFilename);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      filename: `${parsed.data.filename}.mp4`,
    });
  } catch (error) {
    console.error('Batch export error:', error);
    return NextResponse.json(
      { success: false, error: 'Batch export failed' },
      { status: 500 }
    );
  }
}
