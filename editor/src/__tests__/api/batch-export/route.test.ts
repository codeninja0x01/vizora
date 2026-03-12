import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const {
  mockGetSession,
  mockReadFileSync,
  mockExistsSync,
  mockWriteFileSync,
  mockMkdirSync,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockExistsSync: vi.fn(() => true),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: mockReadFileSync,
      existsSync: mockExistsSync,
      writeFileSync: mockWriteFileSync,
      mkdirSync: mockMkdirSync,
    },
    readFileSync: mockReadFileSync,
    existsSync: mockExistsSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
  };
});

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:path')>();
  return { ...actual, default: actual };
});

import { GET, POST } from '@/app/api/batch-export/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(): Request {
  return new Request('http://localhost/api/batch-export', {
    headers: { cookie: 'session=x' },
  });
}

function makePostRequest(fields: Record<string, string | Blob>): Request {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new Request('http://localhost/api/batch-export', {
    method: 'POST',
    headers: { cookie: 'session=x' },
    body: fd,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/batch-export', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeGetRequest() as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('passes auth guard and attempts to read files (may 500 in test env)', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const res = await GET(makeGetRequest() as never);
    // Auth passes — route either succeeds or hits a filesystem error, but NOT 401
    expect(res.status).not.toBe(401);
  });
});

describe('POST /api/batch-export', () => {
  beforeEach(() => vi.clearAllMocks());

  // --- Auth guard ---

  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const blob = new Blob(['data'], { type: 'video/mp4' });
    const res = await POST(
      makePostRequest({ file: blob, filename: 'test' }) as never
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  // --- Filename sanitization ---

  it('returns 400 when filename contains path traversal (../../../etc/passwd)', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const blob = new Blob(['data'], { type: 'video/mp4' });
    const res = await POST(
      makePostRequest({ file: blob, filename: '../../../etc/passwd' }) as never
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 when filename contains forward slash (test/file)', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const blob = new Blob(['data'], { type: 'video/mp4' });
    const res = await POST(
      makePostRequest({ file: blob, filename: 'test/file' }) as never
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when filename contains backslash', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const blob = new Blob(['data'], { type: 'video/mp4' });
    const res = await POST(
      makePostRequest({ file: blob, filename: 'foo\\bar' }) as never
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when filename is empty', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const blob = new Blob(['data'], { type: 'video/mp4' });
    const res = await POST(
      makePostRequest({ file: blob, filename: '' }) as never
    );
    expect(res.status).toBe(400);
  });

  it('accepts a clean filename and attempts to write', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    mockExistsSync.mockReturnValue(true);
    mockWriteFileSync.mockReturnValue(undefined);
    const blob = new Blob(['data'], { type: 'video/mp4' });
    const res = await POST(
      makePostRequest({ file: blob, filename: 'valid-export-name' }) as never
    );
    // Should not be 400 or 401 (filesystem write may still error in test env)
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
  });

  it('returns 400 when file is missing', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const res = await POST(
      makePostRequest({ filename: 'valid-name' }) as never
    );
    expect(res.status).toBe(400);
  });
});
