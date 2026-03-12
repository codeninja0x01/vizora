import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (hoisted so vi.mock factories can reference them) ---

const { mockGetSession, mockCreatePresignedUpload } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCreatePresignedUpload: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('@/lib/r2', () => {
  const MockR2 = vi.fn(function (this: Record<string, unknown>) {
    this.createPresignedUpload = mockCreatePresignedUpload;
  });
  return { R2StorageService: MockR2 };
});

vi.mock('@/lib/config', () => ({
  config: {
    r2: {
      bucket: 'test-bucket',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      accountId: 'test-account',
      cdn: 'https://cdn.example.com',
    },
  },
}));

// Vitest jsdom env externalises node:crypto; provide a simple mock
// with the named exports the route actually uses.
vi.mock('node:crypto', () => ({
  randomUUID: () => '00000000-0000-0000-0000-000000000000',
  default: { randomUUID: () => '00000000-0000-0000-0000-000000000000' },
}));

import { POST } from '@/app/api/uploads/presign/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/uploads/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: 'session=test' },
    body: JSON.stringify(body),
  });
}

function mockPresignResult(fileName: string) {
  return {
    filePath: `user-1/some-uuid-${fileName}`,
    contentType: undefined,
    presignedUrl: `https://r2.example.com/presign/${fileName}`,
    url: `https://cdn.example.com/user-1/some-uuid-${fileName}`,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/uploads/presign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Auth guards not yet implemented — see issue #17
  it.todo('returns 401 when no session exists');
  it.todo('returns 401 when session has no user id');

  it('returns 400 when fileNames is missing', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when fileNames is an empty array', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const res = await POST(makeRequest({ fileNames: [] }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when fileNames is not an array', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const res = await POST(makeRequest({ fileNames: 'file.mp4' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 200 with presigned URLs for valid fileNames', async () => {
    mockCreatePresignedUpload.mockResolvedValue(mockPresignResult('video.mp4'));

    const res = await POST(makeRequest({ fileNames: ['video.mp4'] }) as never);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.uploads).toHaveLength(1);
    expect(body.uploads[0].fileName).toBe('video.mp4');
    expect(body.uploads[0].presignedUrl).toContain('presign');
  });

  // Auth guard not yet implemented — userId comes from body, not session (see issue #17)
  it.todo(
    'uses session.user.id in the R2 key path, not a body-supplied userId'
  );

  it('returns 200 for multiple fileNames', async () => {
    mockCreatePresignedUpload
      .mockResolvedValueOnce(mockPresignResult('a.mp4'))
      .mockResolvedValueOnce(mockPresignResult('b.png'));

    const res = await POST(
      makeRequest({ fileNames: ['a.mp4', 'b.png'] }) as never
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.uploads).toHaveLength(2);
  });
});
