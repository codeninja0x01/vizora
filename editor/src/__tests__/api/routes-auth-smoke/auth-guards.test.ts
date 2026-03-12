/**
 * Smoke tests: every route protected by requireSession returns 401
 * for unauthenticated requests. Verifies the auth guard is wired up
 * across all 14 routes added in issue #11.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

// Stub out heavy dependencies that would fail in jsdom
vi.mock('@/lib/r2', () => ({
  R2StorageService: class {
    uploadData = vi.fn().mockResolvedValue(undefined);
    getAssetUrl = vi.fn().mockReturnValue('https://cdn.example.com/out');
    createPresignedUpload = vi.fn().mockResolvedValue({});
  },
}));

vi.mock('@/lib/ai/services/template-generation-service', () => ({
  TemplateGenerationService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: vi.fn(),
      existsSync: vi.fn(() => true),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    },
    readFileSync: vi.fn(),
    existsSync: vi.fn(() => true),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:path')>();
  return { ...actual, default: actual };
});

vi.stubGlobal('fetch', vi.fn());

// ---------------------------------------------------------------------------
// Route imports
// ---------------------------------------------------------------------------

import { GET as pexelsGET } from '@/app/api/pexels/route';
import { POST as voiceoverPOST } from '@/app/api/elevenlabs/voiceover/route';
import { POST as musicPOST } from '@/app/api/elevenlabs/music/route';
import { POST as sfxELPOST } from '@/app/api/elevenlabs/sfx/route';
import { POST as transcribePOST } from '@/app/api/transcribe/route';
import { GET as voicesGET } from '@/app/api/ai/voices/route';
import { POST as subtitlesPOST } from '@/app/api/ai/subtitles/route';
import { POST as templatePOST } from '@/app/api/ai/template/route';
import { POST as templateRefinePOST } from '@/app/api/ai/template/refine/route';
import { POST as textToVideoPOST } from '@/app/api/ai/text-to-video/route';
import { POST as audioMusicPOST } from '@/app/api/audio/music/route';
import { POST as audioSfxPOST } from '@/app/api/audio/sfx/route';
import {
  GET as batchExportGET,
  POST as batchExportPOST,
} from '@/app/api/batch-export/route';
import { POST as chatEditorPOST } from '@/app/api/chat/editor/route';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeRequest(
  method = 'POST',
  body: unknown = {},
  params: Record<string, string> = {}
): Request {
  const url = new URL('http://localhost/api/test');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json', cookie: '' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth guard smoke tests — all 14 protected routes return 401', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null); // unauthenticated for all tests
  });

  const cases: Array<{
    name: string;
    handler: (req: never) => Promise<Response>;
    method?: string;
  }> = [
    { name: 'GET /api/pexels', handler: pexelsGET, method: 'GET' },
    { name: 'POST /api/elevenlabs/voiceover', handler: voiceoverPOST },
    { name: 'POST /api/elevenlabs/music', handler: musicPOST },
    { name: 'POST /api/elevenlabs/sfx', handler: sfxELPOST },
    { name: 'POST /api/transcribe', handler: transcribePOST },
    { name: 'GET /api/ai/voices', handler: voicesGET, method: 'GET' },
    { name: 'POST /api/ai/subtitles', handler: subtitlesPOST },
    { name: 'POST /api/ai/template', handler: templatePOST },
    { name: 'POST /api/ai/template/refine', handler: templateRefinePOST },
    { name: 'POST /api/ai/text-to-video', handler: textToVideoPOST },
    { name: 'POST /api/audio/music', handler: audioMusicPOST },
    { name: 'POST /api/audio/sfx', handler: audioSfxPOST },
    { name: 'GET /api/batch-export', handler: batchExportGET, method: 'GET' },
    { name: 'POST /api/batch-export', handler: batchExportPOST },
    { name: 'POST /api/chat/editor', handler: chatEditorPOST },
  ];

  for (const { name, handler, method = 'POST' } of cases) {
    it(`${name} → 401 Unauthorized`, async () => {
      const res = await handler(makeRequest(method) as never);
      expect(res.status, `${name} should return 401`).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  }
});

describe('Zod validation smoke tests — authenticated but bad input returns 400', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
  });

  it('POST /api/elevenlabs/music → 400 when text is missing', async () => {
    const res = await musicPOST(makeRequest('POST', {}) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('POST /api/elevenlabs/sfx → 400 when text is missing', async () => {
    const res = await sfxELPOST(makeRequest('POST', {}) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('POST /api/transcribe → 400 when url is not a URL', async () => {
    const res = await transcribePOST(
      makeRequest('POST', { url: 'not-a-url' }) as never
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('POST /api/ai/subtitles → 400 when audioUrl is not a URL', async () => {
    const res = await subtitlesPOST(
      makeRequest('POST', { audioUrl: 'bad' }) as never
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('POST /api/ai/template → 400 when prompt is missing', async () => {
    const res = await templatePOST(makeRequest('POST', {}) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('POST /api/ai/text-to-video → 400 when styleId is missing', async () => {
    const res = await textToVideoPOST(
      makeRequest('POST', { scenes: [] }) as never
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });
});
