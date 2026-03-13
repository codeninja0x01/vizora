import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import crypto from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

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

    // Also send the data.json template to ensure we always have a clip to render
    const projectTemplatePath = path.join(process.cwd(), 'src/data/data.json');
    const template = JSON.parse(fs.readFileSync(projectTemplatePath, 'utf-8'));

    return NextResponse.json({ success: true, keys: animationKeys, template });
  } catch (error: unknown) {
    console.error('Batch export GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load animation presets',
      },
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

    const exportDir = process.env.RENDER_OUTPUT_DIR || os.tmpdir();
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const serverFilename = `${crypto.randomUUID()}.mp4`;
    const filePath = path.resolve(exportDir, serverFilename);

    // Guard against path traversal — resolved path must stay within exportDir
    if (!filePath.startsWith(path.resolve(exportDir))) {
      return NextResponse.json(
        { success: false, error: 'Invalid export path' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    console.error('Batch export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export file',
      },
      { status: 500 }
    );
  }
}
