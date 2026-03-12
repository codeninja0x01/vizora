import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (hoisted so vi.mock factories can reference them) ---

const { mockFindUnique } = vi.hoisted(() => {
  return { mockFindUnique: vi.fn() };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    render: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock('@/lib/api-middleware', () => ({
  withApiAuth:
    (handler: (req: Request, ctx: unknown) => Promise<Response>) =>
    (req: Request) =>
      handler(req, { organizationId: 'org-1', userId: 'user-1', tier: 'free' }),
}));

import { GET } from '@/app/api/v1/renders/[id]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const orgId = 'org-1';

function makeRequest(renderId: string): Request {
  return new Request(`http://localhost/api/v1/renders/${renderId}`);
}

function makeRender(overrides: Record<string, unknown> = {}) {
  return {
    id: 'render-1',
    status: 'queued',
    templateId: 'tpl-1',
    organizationId: orgId,
    queuedAt: new Date('2026-01-01T00:00:00Z'),
    startedAt: null,
    completedAt: null,
    failedAt: null,
    outputUrl: null,
    errorCategory: null,
    errorMessage: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/v1/renders/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when render not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest('missing'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when render belongs to another org', async () => {
    mockFindUnique.mockResolvedValue(
      makeRender({ organizationId: 'other-org' })
    );
    const res = await GET(makeRequest('render-1'));
    expect(res.status).toBe(404);
  });

  it('returns 200 with Retry-After for queued renders', async () => {
    mockFindUnique.mockResolvedValue(makeRender({ status: 'queued' }));
    const res = await GET(makeRequest('render-1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Retry-After')).toBe('5');
  });

  it('returns 200 with Retry-After for active renders', async () => {
    mockFindUnique.mockResolvedValue(makeRender({ status: 'active' }));
    const res = await GET(makeRequest('render-1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Retry-After')).toBe('5');
  });

  it('returns 200 for completed renders', async () => {
    mockFindUnique.mockResolvedValue(
      makeRender({
        status: 'completed',
        completedAt: new Date(),
        outputUrl: 'https://cdn.example.com/output.mp4',
      })
    );
    const res = await GET(makeRequest('render-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outputUrl).toBe('https://cdn.example.com/output.mp4');
  });

  it('returns 422 for failed renders', async () => {
    mockFindUnique.mockResolvedValue(
      makeRender({
        status: 'failed',
        failedAt: new Date(),
        errorCategory: 'RENDER_TIMEOUT',
        errorMessage: 'Render exceeded max duration',
      })
    );
    const res = await GET(makeRequest('render-1'));
    expect(res.status).toBe(422);
  });

  it('includes error details in 422 body for failed renders', async () => {
    mockFindUnique.mockResolvedValue(
      makeRender({
        status: 'failed',
        failedAt: new Date('2026-01-02T00:00:00Z'),
        errorCategory: 'RENDER_TIMEOUT',
        errorMessage: 'Render exceeded max duration',
      })
    );
    const res = await GET(makeRequest('render-1'));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.status).toBe('failed');
    expect(body.error.category).toBe('RENDER_TIMEOUT');
    expect(body.error.message).toBe('Render exceeded max duration');
    expect(body.failedAt).toBe('2026-01-02T00:00:00.000Z');
  });
});
