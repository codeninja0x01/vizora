import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEmailsSend, mockResend, mockPrisma, mockStripe } = vi.hoisted(() => ({
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
    creditTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockStripe: {
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}));

vi.mock('resend', () => ({
  Resend: mockResend,
}));

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/stripe', () => ({
  stripe: mockStripe,
}));

import {
  handleCheckoutComplete,
  handleInvoicePaid,
  handlePaymentFailed,
  handleSubscriptionUpdated,
} from '@/lib/stripe-handlers';

describe('Billing email flows', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    delete process.env.RESEND_FROM_EMAIL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://vizora.dev';
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro';

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
    mockPrisma.creditTransaction.create.mockResolvedValue({ id: 'ct_1' });
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      items: {
        data: [{ price: { id: 'price_pro' } }],
      },
    });

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

  it('should send a credit pack purchase email with correct payload', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      creditBalance: 500,
      monthlyAllotment: 1000,
      name: 'Vizora Studio',
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });

    await handleCheckoutComplete({
      data: {
        object: {
          mode: 'payment',
          amount_total: 499,
          metadata: {
            organizationId: 'org-1',
            packSize: '500',
          },
        },
      },
    } as never);

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.to).toBe('owner@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.text).toContain('500');
    expect(payload.text).toContain('4.99');
    expect(payload.text).toContain('/dashboard/billing');
  });

  it('should send a subscription created email with tier details and billing link', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      creditBalance: 0,
      name: 'Vizora Studio',
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });

    await handleCheckoutComplete({
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_123',
          metadata: {
            organizationId: 'org-1',
          },
        },
      },
    } as never);

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.to).toBe('owner@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.text).toContain('/dashboard/billing');
    expect(payload.text).toMatch(/pro|tier|monthly/i);
  });

  it('should send a subscription cancelled email when cancellation is scheduled', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      tier: 'pro',
      monthlyAllotment: 1000,
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });

    await handleSubscriptionUpdated({
      data: {
        object: {
          id: 'sub_123',
          cancel_at_period_end: true,
          cancel_at: null,
          current_period_end: 1770000000,
          metadata: {
            organizationId: 'org-1',
          },
          items: {
            data: [{ price: { id: 'price_pro' } }],
          },
        },
      },
    } as never);

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.to).toBe('owner@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.text).toContain('/dashboard/billing');
    expect(payload.text).toMatch(/free tier|cancel/i);
  });

  it('should not send a subscription cancelled email when cancellation is not scheduled', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      tier: 'pro',
      monthlyAllotment: 1000,
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });

    await handleSubscriptionUpdated({
      data: {
        object: {
          id: 'sub_123',
          cancel_at_period_end: false,
          cancel_at: null,
          current_period_end: 1770000000,
          metadata: {
            organizationId: 'org-1',
          },
          items: {
            data: [{ price: { id: 'price_pro' } }],
          },
        },
      },
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('should send an invoice paid renewal email with credits, balance, and billing link', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      tier: 'pro',
      creditBalance: 100,
      monthlyAllotment: 1000,
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });

    await handleInvoicePaid({
      data: {
        object: {
          id: 'in_renew_1',
          billing_reason: 'subscription_cycle',
          subscription: 'sub_123',
          customer: 'cus_123',
          lines: {
            data: [{ period: { end: 1770000000 } }],
          },
          metadata: {
            organizationId: 'org-1',
          },
        },
      },
    } as never);

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.to).toBe('owner@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.text).toContain('/dashboard/billing');
    expect(payload.text).toMatch(/credit|renew/i);
  });

  it('should not send an invoice paid renewal email for subscription_create invoices', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      tier: 'pro',
      creditBalance: 100,
      monthlyAllotment: 1000,
    });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });

    await handleInvoicePaid({
      data: {
        object: {
          id: 'in_create_1',
          billing_reason: 'subscription_create',
          subscription: 'sub_123',
          customer: 'cus_123',
          lines: {
            data: [{ period: { end: 1770000000 } }],
          },
          metadata: {
            organizationId: 'org-1',
          },
        },
      },
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('should use noreply fallback when RESEND_FROM_EMAIL is unset', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      creditBalance: 500,
      monthlyAllotment: 1000,
      name: 'Vizora Studio',
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });

    await handleCheckoutComplete({
      data: {
        object: {
          mode: 'payment',
          amount_total: 499,
          metadata: {
            organizationId: 'org-1',
            packSize: '500',
          },
        },
      },
    } as never);

    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.from).toBe('noreply@vizora.dev');
  });

  it('should not send a new billing lifecycle email when owner is not found', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      creditBalance: 500,
      monthlyAllotment: 1000,
      name: 'Vizora Studio',
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.member.findFirst.mockResolvedValue(null);

    await handleCheckoutComplete({
      data: {
        object: {
          mode: 'payment',
          amount_total: 499,
          metadata: {
            organizationId: 'org-1',
            packSize: '500',
          },
        },
      },
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });
});
