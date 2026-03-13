import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockRequireSession,
  mockRequirePaidTier,
  mockResolveOrganization,
  mockWithSessionRateLimit,
  mockDeductCreditsForAI,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockRequirePaidTier: vi.fn(),
  mockResolveOrganization: vi.fn(),
  mockWithSessionRateLimit: vi.fn(),
  mockDeductCreditsForAI: vi.fn(),
}));

vi.mock('@/lib/require-session', () => ({
  requireSession: mockRequireSession,
  requirePaidTier: mockRequirePaidTier,
  resolveOrganization: mockResolveOrganization,
}));

vi.mock('@/lib/ratelimit', () => ({
  withSessionRateLimit: mockWithSessionRateLimit,
}));

vi.mock('@/lib/credits', () => ({
  deductCreditsForAI: mockDeductCreditsForAI,
  AI_CREDIT_COSTS: { 'ai/tts': 20, pexels: 0 },
}));

import { withAIAuth, withRateLimitedAuth } from '@/lib/ai-middleware';

const mockReq = new Request('http://localhost/api/ai/tts', {
  method: 'POST',
}) as never;

const mockSession = {
  session: { id: 's-1', activeOrganizationId: 'org-1' },
  user: { id: 'u-1' },
};

describe('withAIAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue(mockSession);
    mockRequirePaidTier.mockResolvedValue({
      status: 'paid',
      organizationId: 'org-1',
      tier: 'pro',
    });
    mockWithSessionRateLimit.mockResolvedValue({ allowed: true, headers: {} });
    mockDeductCreditsForAI.mockResolvedValue({
      success: true,
      newBalance: 980,
    });
  });

  it('returns session and org context on success', async () => {
    const handler = withAIAuth('ai/tts');
    const result = await handler(mockReq);
    expect(result).toEqual({
      session: mockSession,
      organizationId: 'org-1',
      tier: 'pro',
    });
  });

  it('returns 401 Response when session is null', async () => {
    mockRequireSession.mockResolvedValue(null);
    const handler = withAIAuth('ai/tts');
    const result = await handler(mockReq);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('returns 401 Response when user has no organization', async () => {
    mockRequirePaidTier.mockResolvedValue({ status: 'no_org' });
    const handler = withAIAuth('ai/tts');
    const result = await handler(mockReq);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('returns 403 Response when tier is free', async () => {
    mockRequirePaidTier.mockResolvedValue({ status: 'free' });
    const handler = withAIAuth('ai/tts');
    const result = await handler(mockReq);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it('returns 429 Response when rate limited', async () => {
    mockWithSessionRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 10,
      headers: {},
    });
    const handler = withAIAuth('ai/tts');
    const result = await handler(mockReq);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(429);
  });

  it('returns 402 Response when insufficient credits', async () => {
    mockDeductCreditsForAI.mockResolvedValue({
      success: false,
      available: 5,
      required: 20,
    });
    const handler = withAIAuth('ai/tts');
    const result = await handler(mockReq);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(402);
  });
});

describe('withRateLimitedAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue(mockSession);
    mockResolveOrganization.mockResolvedValue({
      organizationId: 'org-1',
      tier: 'free',
    });
    mockWithSessionRateLimit.mockResolvedValue({ allowed: true, headers: {} });
  });

  it('allows free tier (no tier gate)', async () => {
    const handler = withRateLimitedAuth();
    const result = await handler(mockReq);
    expect(result).toEqual({
      session: mockSession,
      organizationId: 'org-1',
      tier: 'free',
    });
    expect(mockRequirePaidTier).not.toHaveBeenCalled();
    expect(mockDeductCreditsForAI).not.toHaveBeenCalled();
  });

  it('returns 401 when no session', async () => {
    mockRequireSession.mockResolvedValue(null);
    const handler = withRateLimitedAuth();
    const result = await handler(mockReq);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mockWithSessionRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 10,
      headers: {},
    });
    const handler = withRateLimitedAuth();
    const result = await handler(mockReq);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(429);
  });
});
