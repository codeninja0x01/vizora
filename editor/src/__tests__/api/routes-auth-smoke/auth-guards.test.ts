/**
 * Smoke tests: every route protected by requireSession returns 401
 * for unauthenticated requests. Verifies the auth guard is wired up
 * across all protected routes.
 *
 * Also tests AI middleware 403 tier gate and rate-limited auth paths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const { mockGetSession, mockPrisma } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockPrisma: {
    organization: { findFirst: vi.fn() },
    member: { findFirst: vi.fn() },
    creditTransaction: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/ratelimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 10_000,
  }),
  withSessionRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    headers: {},
  }),
  sessionTokenBucket: {
    consume: vi.fn().mockReturnValue({ allowed: true, remaining: 199 }),
  },
}));

vi.mock('@/lib/credits', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/credits')>();
  return {
    ...actual,
    deductCreditsForAI: vi
      .fn()
      .mockResolvedValue({ success: true, newBalance: 980 }),
    checkAndWarnLowCredits: vi.fn().mockResolvedValue(undefined),
  };
});

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

vi.mock('@/lib/ai/providers/tts/factory', () => ({
  createTTSProvider: vi.fn().mockReturnValue({
    synthesize: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  }),
  getAvailableTTSProviders: vi.fn().mockReturnValue(['elevenlabs', 'openai']),
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
import { POST as ttsPOST } from '@/app/api/ai/tts/route';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Minimal authenticated session with organization context. */
const AUTHED_SESSION = {
  session: { id: 's-1', activeOrganizationId: 'org-1' },
  user: { id: 'u-1' },
};

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

/** Set up mocks for an authenticated user with a paid org. */
function setupPaidAuth() {
  mockGetSession.mockResolvedValue(AUTHED_SESSION);
  mockPrisma.organization.findFirst.mockResolvedValue({
    id: 'org-1',
    tier: 'pro',
  });
  mockPrisma.member.findFirst.mockResolvedValue({
    organizationId: 'org-1',
  });
}

/** Set up mocks for an authenticated user on free tier. */
function setupFreeAuth() {
  mockGetSession.mockResolvedValue(AUTHED_SESSION);
  mockPrisma.organization.findFirst.mockResolvedValue({
    id: 'org-1',
    tier: 'free',
  });
  mockPrisma.member.findFirst.mockResolvedValue({
    organizationId: 'org-1',
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth guard smoke tests — all protected routes return 401', () => {
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
    { name: 'POST /api/ai/tts', handler: ttsPOST },
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
    setupPaidAuth();
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

describe('AI middleware — paid tier gate (403)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFreeAuth();
  });

  it('returns 403 for free tier on AI routes (TTS)', async () => {
    const req = new Request('http://localhost/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'hello',
        voiceId: 'alloy',
        provider: 'openai',
      }),
    });
    const res = await ttsPOST(req as never);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('ai_features_require_paid_plan');
  });

  it('returns 403 for free tier on AI voices route', async () => {
    const req = new Request('http://localhost/api/ai/voices', {
      method: 'GET',
    });
    const res = await voicesGET(req as never);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('ai_features_require_paid_plan');
  });
});

describe('Pexels — allows free tier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFreeAuth();
  });

  it('does not return 403 for free tier on Pexels', async () => {
    const url = new URL(
      'http://localhost/api/pexels?type=image&query=cat&page=1&per_page=10'
    );
    const req = new Request(url, { method: 'GET' });
    const res = await pexelsGET(req as never);
    // Pexels uses withRateLimitedAuth (no tier gate), so free tier should pass auth.
    // It may fail with 500 due to missing PEXELS_API_KEY, but not 401 or 403.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
