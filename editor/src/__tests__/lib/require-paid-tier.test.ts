import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mocks (hoisted to avoid TDZ issues) ---

const { mockOrgFindFirst, mockMemberFindFirst } = vi.hoisted(() => ({
  mockOrgFindFirst: vi.fn(),
  mockMemberFindFirst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    organization: { findFirst: mockOrgFindFirst },
    member: { findFirst: mockMemberFindFirst },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

import { requirePaidTier, resolveOrganization } from '@/lib/require-session';

const mockSession = {
  session: { id: 's-1', activeOrganizationId: 'org-1' },
  user: { id: 'u-1', email: 'test@vizora.dev' },
};

describe('resolveOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns organizationId and tier from active organization', async () => {
    mockOrgFindFirst.mockResolvedValue({
      id: 'org-1',
      tier: 'pro',
    });
    mockMemberFindFirst.mockResolvedValue({ organizationId: 'org-1' });

    const result = await resolveOrganization(mockSession as never);
    expect(result).toEqual({ organizationId: 'org-1', tier: 'pro' });
  });

  it('falls back to first membership if no active organization', async () => {
    const sessionNoOrg = {
      session: { id: 's-1', activeOrganizationId: null },
      user: { id: 'u-1' },
    };
    mockMemberFindFirst.mockResolvedValue({ organizationId: 'org-fallback' });
    mockOrgFindFirst.mockResolvedValue({
      id: 'org-fallback',
      tier: 'free',
    });

    const result = await resolveOrganization(sessionNoOrg as never);
    expect(result).toEqual({ organizationId: 'org-fallback', tier: 'free' });
  });

  it('returns null if user has no organization', async () => {
    const sessionNoOrg = {
      session: { id: 's-1', activeOrganizationId: null },
      user: { id: 'u-1' },
    };
    mockMemberFindFirst.mockResolvedValue(null);

    const result = await resolveOrganization(sessionNoOrg as never);
    expect(result).toBeNull();
  });
});

describe('requirePaidTier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paid status for pro tier', async () => {
    mockOrgFindFirst.mockResolvedValue({ id: 'org-1', tier: 'pro' });
    mockMemberFindFirst.mockResolvedValue({ organizationId: 'org-1' });

    const result = await requirePaidTier(mockSession as never);
    expect(result).toEqual({
      status: 'paid',
      organizationId: 'org-1',
      tier: 'pro',
    });
  });

  it('returns paid status for enterprise tier', async () => {
    mockOrgFindFirst.mockResolvedValue({ id: 'org-1', tier: 'enterprise' });
    mockMemberFindFirst.mockResolvedValue({ organizationId: 'org-1' });

    const result = await requirePaidTier(mockSession as never);
    expect(result).toEqual({
      status: 'paid',
      organizationId: 'org-1',
      tier: 'enterprise',
    });
  });

  it('returns free status for free tier', async () => {
    mockOrgFindFirst.mockResolvedValue({ id: 'org-1', tier: 'free' });
    mockMemberFindFirst.mockResolvedValue({ organizationId: 'org-1' });

    const result = await requirePaidTier(mockSession as never);
    expect(result).toEqual({ status: 'free' });
  });

  it('returns no_org status if no organization found', async () => {
    const sessionNoOrg = {
      session: { id: 's-1', activeOrganizationId: null },
      user: { id: 'u-1' },
    };
    mockMemberFindFirst.mockResolvedValue(null);

    const result = await requirePaidTier(sessionNoOrg as never);
    expect(result).toEqual({ status: 'no_org' });
  });
});
