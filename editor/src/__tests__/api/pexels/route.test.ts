import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const { mockGetSession, mockFetch } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.stubGlobal('fetch', mockFetch);

import { GET } from '@/app/api/pexels/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/pexels');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { headers: { cookie: 'session=x' } });
}

function mockPexelsOk() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ photos: [] }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/pexels', () => {
  beforeEach(() => vi.clearAllMocks());

  // --- Auth guard ---

  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  // --- Zod validation: type enum ---

  it('returns 400 when type is not "image" or "video"', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const res = await GET(makeRequest({ type: 'audio' }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  // --- Zod validation: page constraints ---

  it('returns 400 when page is 0 (below min 1)', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const res = await GET(makeRequest({ page: '0' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when page is -1', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const res = await GET(makeRequest({ page: '-1' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when page exceeds max (101)', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const res = await GET(makeRequest({ page: '101' }) as never);
    expect(res.status).toBe(400);
  });

  // --- Zod validation: per_page constraints ---

  it('returns 400 when per_page is 0', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const res = await GET(makeRequest({ per_page: '0' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when per_page exceeds 80', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const res = await GET(makeRequest({ per_page: '9999' }) as never);
    expect(res.status).toBe(400);
  });

  // --- Valid request passes validation ---

  it('accepts valid default params and calls Pexels API', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    mockPexelsOk();
    const res = await GET(makeRequest() as never);
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
  });

  it('accepts type=video with valid params', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    mockPexelsOk();
    const res = await GET(
      makeRequest({
        type: 'video',
        query: 'nature',
        page: '2',
        per_page: '10',
      }) as never
    );
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
  });
});
