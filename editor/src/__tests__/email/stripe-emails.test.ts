import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEmailsSend, mockResend, mockPrisma } = vi.hoisted(() => ({
  mockEmailsSend: vi.fn(),
  mockResend: vi.fn(function MockResend() {
    return {
      emails: {
        send: mockEmailsSend,
      },
    };
  }),
  mockPrisma: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('resend', () => ({
  Resend: mockResend,
}));

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

import { handlePaymentFailed } from '@/lib/stripe-handlers';

describe('Billing email flows', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    delete process.env.RESEND_FROM_EMAIL;
    await Promise.resolve();
    await Promise.resolve();
  });

  it('should send a payment failed notification to the organization owner', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });

    await handlePaymentFailed({
      data: {
        object: {
          id: 'in_123',
          customer: 'cus_123',
        },
      },
    } as never);

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.to).toBe('owner@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.subject).toContain('Payment Failed');
    expect(payload.text).toContain('/dashboard/billing');
  });

  it('should not send a payment failed notification when no owner is found', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue(null);

    await handlePaymentFailed({
      data: {
        object: {
          id: 'in_456',
          customer: 'cus_456',
        },
      },
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('should not send a payment failed notification when resend is unavailable', async () => {
    delete process.env.RESEND_API_KEY;
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });

    await handlePaymentFailed({
      data: {
        object: {
          id: 'in_789',
          customer: 'cus_789',
        },
      },
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });
});
