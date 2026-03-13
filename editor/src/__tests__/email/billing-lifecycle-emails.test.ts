import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEmailsSend, mockResend, mockPrisma, mockStripe } = vi.hoisted(
  () => ({
    mockEmailsSend: vi.fn(),
    mockResend: vi.fn(function MockResend() {
      return {
        emails: {
          send: mockEmailsSend,
        },
      };
    }),
    mockPrisma: {
      $transaction: vi.fn(),
      organization: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      member: {
        findFirst: vi.fn(),
      },
      subscription: {
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      creditTransaction: {
        create: vi.fn(),
      },
      billingHistory: {
        create: vi.fn(),
      },
    },
    mockStripe: {
      subscriptions: {
        retrieve: vi.fn(),
      },
    },
  })
);

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
  handleSubscriptionUpdated,
} from '@/lib/stripe-handlers';

describe('Stripe billing lifecycle emails', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    delete process.env.RESEND_FROM_EMAIL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://vizora.dev';
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro';

    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
    );
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });
    mockPrisma.subscription.upsert.mockResolvedValue({ id: 'sub-db-1' });
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.creditTransaction.create.mockResolvedValue({ id: 'ct-1' });
    mockPrisma.billingHistory.create.mockResolvedValue({ id: 'bh-1' });
    mockPrisma.member.findFirst.mockResolvedValue({
      user: {
        email: 'owner@vizora.dev',
        name: 'Owner',
      },
    });
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      current_period_end: 1770000000,
      items: {
        data: [
          {
            price: {
              id: 'price_pro',
            },
          },
        ],
      },
    });

    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.STRIPE_PRO_PRICE_ID;
  });

  it('sends a credit pack purchase confirmation with pack size, amount paid, new balance, and billing link', async () => {
    // CODER NOTE: This test expects the payment-mode checkout flow to email only after
    // the transaction succeeds, using the committed new balance in the email body.
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      creditBalance: 500,
      monthlyAllotment: 1000,
    });

    await handleCheckoutComplete({
      data: {
        object: {
          id: 'cs_payment_123',
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
    expect(payload.subject).toMatch(/purchase|credits|confirmation/i);
    expect(payload.text).toContain('500');
    expect(payload.text).toContain('4.99');
    expect(payload.text).toContain('1000');
    expect(payload.text).toContain('/dashboard/billing');
  });

  it('sends a subscription welcome email with tier name, monthly allotment, next billing date, and billing link', async () => {
    // CODER NOTE: This test expects the subscription-mode checkout flow to resolve the
    // subscription tier from Stripe and include the period-end date in plain text.
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      creditBalance: 0,
    });

    await handleCheckoutComplete({
      data: {
        object: {
          id: 'cs_sub_123',
          mode: 'subscription',
          customer: 'cus_123',
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
    expect(payload.subject).toMatch(/welcome|subscription/i);
    expect(payload.text).toMatch(/pro|tier/i);
    expect(payload.text).toMatch(/1000|monthly allotment/i);
    expect(payload.text).toContain('/dashboard/billing');
  });

  it('sends a cancellation confirmation with cancellation date, free-tier note, and billing link', async () => {
    await handleSubscriptionUpdated({
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          cancel_at_period_end: true,
          cancel_at: null,
          current_period_end: 1770000000,
          items: {
            data: [
              {
                price: {
                  id: 'price_pro',
                },
              },
            ],
          },
          metadata: {
            organizationId: 'org-1',
          },
        },
      },
    } as never);

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.subject).toMatch(/cancel/i);
    expect(payload.text).toMatch(/free tier|free plan/i);
    expect(payload.text).toContain('/dashboard/billing');
  });

  it('does not send a cancellation email when the subscription is not cancelling', async () => {
    await handleSubscriptionUpdated({
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          cancel_at_period_end: false,
          cancel_at: null,
          current_period_end: 1770000000,
          items: {
            data: [
              {
                price: {
                  id: 'price_pro',
                },
              },
            ],
          },
          metadata: {
            organizationId: 'org-1',
          },
        },
      },
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('sends a renewal receipt with credits added, new balance, next renewal date, and billing link', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      tier: 'pro',
      creditBalance: 250,
      monthlyAllotment: 1000,
    });

    await handleInvoicePaid({
      data: {
        object: {
          id: 'in_paid_123',
          customer: 'cus_123',
          billing_reason: 'subscription_cycle',
          subscription: 'sub_123',
        },
      },
    } as never);

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.subject).toMatch(/receipt|renewal|invoice/i);
    expect(payload.text).toMatch(/credits added|credits/i);
    expect(payload.text).toContain('/dashboard/billing');
  });

  it('does not send a renewal email for subscription_create invoices', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      tier: 'pro',
      creditBalance: 250,
    });

    await handleInvoicePaid({
      data: {
        object: {
          id: 'in_create_123',
          customer: 'cus_123',
          billing_reason: 'subscription_create',
          subscription: 'sub_123',
        },
      },
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('uses the RESEND_FROM_EMAIL env var when set', async () => {
    process.env.RESEND_FROM_EMAIL = 'billing@vizora.dev';
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      creditBalance: 500,
      monthlyAllotment: 1000,
    });

    await handleCheckoutComplete({
      data: {
        object: {
          id: 'cs_payment_456',
          mode: 'payment',
          amount_total: 999,
          metadata: {
            organizationId: 'org-1',
            packSize: '1000',
          },
        },
      },
    } as never);

    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.from).toBe('billing@vizora.dev');
  });

  it('does not send the new lifecycle email when no owner is found', async () => {
    mockPrisma.member.findFirst.mockResolvedValue(null);
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      creditBalance: 500,
      monthlyAllotment: 1000,
    });

    await handleCheckoutComplete({
      data: {
        object: {
          id: 'cs_payment_789',
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

  it('does not send the new lifecycle email when Resend is unavailable', async () => {
    delete process.env.RESEND_API_KEY;

    await handleSubscriptionUpdated({
      data: {
        object: {
          id: 'sub_999',
          customer: 'cus_999',
          status: 'active',
          cancel_at_period_end: true,
          cancel_at: null,
          current_period_end: 1770000000,
          items: {
            data: [
              {
                price: {
                  id: 'price_pro',
                },
              },
            ],
          },
          metadata: {
            organizationId: 'org-1',
          },
        },
      },
    } as never);

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });
});
