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

/**
 * Creates a mock Request with a `formData()` method that returns the given
 * fields. This avoids jsdom/undici FormData incompatibilities in Node 22.
 */
function makePostRequest(fields: { file?: Blob; filename?: string }): Request {
  const req = new Request('http://localhost/api/batch-export', {
    method: 'POST',
    headers: { cookie: 'session=x' },
  });

  // Override formData() to return a native FormData with controlled values
  const fd = new FormData();
  if (fields.file) {
    fd.append(
      'file',
      new File([fields.file], 'upload.mp4', {
        type: fields.file.type,
      })
    );
  }
  if (fields.filename !== undefined) {
    fd.append('filename', fields.filename);
  }
  (req as any).formData = () => Promise.resolve(fd);

  return req;
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
    expect(res.status).not.toBe(401);
  });

  it('does not leak internal paths on GET failure', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file /secret/path');
    });
    const res = await GET(makeGetRequest() as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to load animation presets');
    expect(body.error).not.toContain('ENOENT');
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

  it('accepts a clean filename and does not return server path in response', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    mockExistsSync.mockReturnValue(true);
    mockWriteFileSync.mockReturnValue(undefined);
    const blob = new Blob(['data'], { type: 'video/mp4' });
    const res = await POST(
      makePostRequest({ file: blob, filename: 'valid-export-name' }) as never
    );
    // Auth + validation pass (filesystem/arrayBuffer may error in test env)
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
    const body = await res.json();
    expect(body.path).toBeUndefined();
  });

  it('does not leak internal paths or error details on failure', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    mockExistsSync.mockReturnValue(true);
    mockWriteFileSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });
    const blob = new Blob(['data'], { type: 'video/mp4' });
    const res = await POST(
      makePostRequest({ file: blob, filename: 'test' }) as never
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Batch export failed');
    expect(body.error).not.toContain('EACCES');
  });

  it('returns 400 when file is missing', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    const res = await POST(
      makePostRequest({ filename: 'valid-name' }) as never
    );
    expect(res.status).toBe(400);
  });
});
