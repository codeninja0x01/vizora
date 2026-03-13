import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const { mockGetSession, mockFetch, mockPrisma } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockFetch: vi.fn(),
  mockPrisma: {
    organization: { findFirst: vi.fn() },
    member: { findFirst: vi.fn() },
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
  withSessionRateLimit: vi
    .fn()
    .mockResolvedValue({ allowed: true, headers: {} }),
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

// Use class-style mock so `new R2StorageService(...)` works
vi.mock('@/lib/r2', () => ({
  R2StorageService: class {
    uploadData = vi.fn().mockResolvedValue(undefined);
    getAssetUrl = vi
      .fn()
      .mockReturnValue('https://cdn.example.com/voiceovers/out.mp3');
  },
}));

// Override global fetch
vi.stubGlobal('fetch', mockFetch);

import { POST } from '@/app/api/elevenlabs/voiceover/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request('http://localhost/api/elevenlabs/voiceover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function mockElevenLabsOk() {
  const buf = new Uint8Array([1, 2, 3]).buffer;
  mockFetch.mockResolvedValue({
    ok: true,
    arrayBuffer: vi.fn().mockResolvedValue(buf),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/elevenlabs/voiceover', () => {
  beforeEach(() => vi.clearAllMocks());

  // --- Auth guard ---

  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ text: 'hello' }) as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  // --- Zod validation ---

  it('returns 400 when text is missing', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 's-1', activeOrganizationId: 'org-1' },
      user: { id: 'u-1' },
    });
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: 'org-1',
      tier: 'pro',
    });
    mockPrisma.member.findFirst.mockResolvedValue({ organizationId: 'org-1' });
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 when text is empty', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 's-1', activeOrganizationId: 'org-1' },
      user: { id: 'u-1' },
    });
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: 'org-1',
      tier: 'pro',
    });
    mockPrisma.member.findFirst.mockResolvedValue({ organizationId: 'org-1' });
    const res = await POST(makeRequest({ text: '' }) as never);
    expect(res.status).toBe(400);
  });

  // --- Path traversal fix ---

  it('returns 400 when voiceId contains path traversal (../../admin)', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 's-1', activeOrganizationId: 'org-1' },
      user: { id: 'u-1' },
    });
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: 'org-1',
      tier: 'pro',
    });
    mockPrisma.member.findFirst.mockResolvedValue({ organizationId: 'org-1' });
    const res = await POST(
      makeRequest({ text: 'hi', voiceId: '../../admin' }) as never
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 when voiceId is empty string', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 's-1', activeOrganizationId: 'org-1' },
      user: { id: 'u-1' },
    });
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: 'org-1',
      tier: 'pro',
    });
    mockPrisma.member.findFirst.mockResolvedValue({ organizationId: 'org-1' });
    const res = await POST(makeRequest({ text: 'hi', voiceId: '' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when voiceId exceeds 64 chars', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 's-1', activeOrganizationId: 'org-1' },
      user: { id: 'u-1' },
    });
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: 'org-1',
      tier: 'pro',
    });
    mockPrisma.member.findFirst.mockResolvedValue({ organizationId: 'org-1' });
    const res = await POST(
      makeRequest({ text: 'hi', voiceId: 'a'.repeat(65) }) as never
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when voiceId contains special chars (spaces)', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 's-1', activeOrganizationId: 'org-1' },
      user: { id: 'u-1' },
    });
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: 'org-1',
      tier: 'pro',
    });
    mockPrisma.member.findFirst.mockResolvedValue({ organizationId: 'org-1' });
    const res = await POST(
      makeRequest({ text: 'hi', voiceId: 'bad voice id' }) as never
    );
    expect(res.status).toBe(400);
  });

  it('accepts a valid voiceId matching /^[a-zA-Z0-9_-]{1,64}$/', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 's-1', activeOrganizationId: 'org-1' },
      user: { id: 'u-1' },
    });
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: 'org-1',
      tier: 'pro',
    });
    mockPrisma.member.findFirst.mockResolvedValue({ organizationId: 'org-1' });
    mockElevenLabsOk();
    const res = await POST(
      makeRequest({
        text: 'hello world',
        voiceId: '21m00Tcm4TlvDq8ikWAM',
      }) as never
    );
    // Should not be 400 (auth/validation pass; may succeed or fail at ElevenLabs step)
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
  });

  it('uses default voiceId when none supplied (does not 400)', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 's-1', activeOrganizationId: 'org-1' },
      user: { id: 'u-1' },
    });
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: 'org-1',
      tier: 'pro',
    });
    mockPrisma.member.findFirst.mockResolvedValue({ organizationId: 'org-1' });
    mockElevenLabsOk();
    const res = await POST(makeRequest({ text: 'hello world' }) as never);
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
  });
});
