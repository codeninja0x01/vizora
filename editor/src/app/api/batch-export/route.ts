import { requireSession, unauthorizedResponse } from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
  } catch (error) {
    console.error('[BatchExport GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Missing file' },
        { status: 400 }
      );
    }

    const exportDir =
      process.env.RENDER_OUTPUT_DIR || path.join(os.tmpdir(), 'vizora-exports');
    const resolvedDir = path.resolve(exportDir);
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }

    const serverFilename = `${randomUUID()}.mp4`;
    const filePath = path.resolve(resolvedDir, serverFilename);

    // Guard against path traversal
    if (!filePath.startsWith(resolvedDir)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[BatchExport POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
