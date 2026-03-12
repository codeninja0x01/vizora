import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// --- Mocks ---

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(): NextRequest {
  return new Request('http://localhost/api/test', {
    headers: { cookie: 'session=x' },
  }) as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requireSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when auth returns null', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await requireSession(makeRequest());
    expect(result).toBeNull();
  });

  it('returns null when session has no user', async () => {
    mockGetSession.mockResolvedValue({});
    const result = await requireSession(makeRequest());
    expect(result).toBeNull();
  });

  it('returns null when session.user.id is missing', async () => {
    mockGetSession.mockResolvedValue({ user: {} });
    const result = await requireSession(makeRequest());
    expect(result).toBeNull();
  });

  it('returns session when session.user.id exists', async () => {
    const session = { user: { id: 'u-1', email: 'a@b.com' } };
    mockGetSession.mockResolvedValue(session);
    const result = await requireSession(makeRequest());
    expect(result).toBe(session);
  });
});

describe('unauthorizedResponse', () => {
  it('returns status 401', () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
  });

  it('returns JSON body { error: "Unauthorized" }', async () => {
    const body = await unauthorizedResponse().json();
    expect(body.error).toBe('Unauthorized');
  });
});

describe('zodErrorResponse', () => {
  it('returns status 400', () => {
    const schema = z.object({ x: z.string() });
    const result = schema.safeParse({ x: 123 });
    const res = zodErrorResponse((result as { error: z.ZodError }).error);
    expect(res.status).toBe(400);
  });

  it('returns JSON body { error: "Validation failed", issues: {...} }', async () => {
    const schema = z.object({ x: z.string() });
    const result = schema.safeParse({ x: 123 });
    const body = await zodErrorResponse(
      (result as { error: z.ZodError }).error
    ).json();
    expect(body.error).toBe('Validation failed');
    expect(body.issues).toBeDefined();
  });
});
