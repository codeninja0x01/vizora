import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockTx, mockPrisma } = vi.hoisted(() => {
  const mockTx = {
    organization: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
    },
  };

  const mockPrisma = {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    ),
    organization: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  };

  return { mockTx, mockPrisma };
});

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/billing', () => ({ isLowCredit: vi.fn() }));
vi.mock('resend', () => ({ Resend: vi.fn() }));

import { deductCreditsForAI, AI_CREDIT_COSTS } from '@/lib/credits';

describe('AI_CREDIT_COSTS', () => {
  it('has costs for all 14 operations', () => {
    expect(Object.keys(AI_CREDIT_COSTS)).toHaveLength(14);
  });

  it('pexels costs 0', () => {
    expect(AI_CREDIT_COSTS.pexels).toBe(0);
  });

  it('elevenlabs/music is most expensive', () => {
    expect(AI_CREDIT_COSTS['elevenlabs/music']).toBe(300);
  });
});

describe('deductCreditsForAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deducts credits and creates transaction', async () => {
    mockTx.organization.findUniqueOrThrow.mockResolvedValue({
      creditBalance: 1000,
    });

    const result = await deductCreditsForAI('org-1', 'ai/tts');

    expect(result).toEqual({ success: true, newBalance: 980 });
    expect(mockTx.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org-1' },
        data: { creditBalance: 980 },
      })
    );
    expect(mockTx.creditTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          amount: -20,
          reason: 'ai_usage',
        }),
      })
    );
  });

  it('returns failure when insufficient credits', async () => {
    mockTx.organization.findUniqueOrThrow.mockResolvedValue({
      creditBalance: 10,
    });

    const result = await deductCreditsForAI('org-1', 'ai/tts');

    expect(result).toEqual({ success: false, available: 10, required: 20 });
    expect(mockTx.organization.update).not.toHaveBeenCalled();
  });

  it('skips deduction for zero-cost operations', async () => {
    const result = await deductCreditsForAI('org-1', 'pexels');

    expect(result).toEqual({ success: true, newBalance: -1 });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses RepeatableRead isolation', async () => {
    mockTx.organization.findUniqueOrThrow.mockResolvedValue({
      creditBalance: 500,
    });

    await deductCreditsForAI('org-1', 'chat/editor');

    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: 'RepeatableRead',
        timeout: 10000,
      })
    );
  });
});
