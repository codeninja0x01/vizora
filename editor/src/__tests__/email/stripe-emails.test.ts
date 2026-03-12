import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEmailsSend, mockResend, mockPrisma } = vi.hoisted(() => ({
  mockEmailsSend: vi.fn(),
  mockResend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockEmailsSend,
    },
  })),
  mockPrisma: {
    organization: {
      findUnique: vi.fn(),
    },
    user: {
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
      slug: 'vizora-studio',
    });
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'owner@vizora.dev',
    });

    // CODER NOTE: The architect plan expects this handler to keep using the public function signature
    // while its internals look up the org owner and billing URL.
    await handlePaymentFailed({
      organizationId: 'org-1',
      customerId: 'cus_123',
      invoiceId: 'in_123',
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
      slug: 'vizora-studio',
    });
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await handlePaymentFailed({
      organizationId: 'org-1',
      customerId: 'cus_456',
      invoiceId: 'in_456',
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('should not send a payment failed notification when resend is unavailable', async () => {
    delete process.env.RESEND_API_KEY;
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      slug: 'vizora-studio',
    });
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'owner@vizora.dev',
    });

    await handlePaymentFailed({
      organizationId: 'org-1',
      customerId: 'cus_789',
      invoiceId: 'in_789',
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });
});
