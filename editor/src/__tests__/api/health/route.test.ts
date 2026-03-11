import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before importing the route
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns HTTP 200', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('returns status "ok"', async () => {
    const response = await GET();
    expect((response as { body: { status: string } }).body.status).toBe('ok');
  });

  it('returns timestamp as a number (epoch ms)', async () => {
    const before = Date.now();
    const response = await GET();
    const after = Date.now();
    const { timestamp } = (response as { body: { timestamp: unknown } }).body;
    expect(typeof timestamp).toBe('number');
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
