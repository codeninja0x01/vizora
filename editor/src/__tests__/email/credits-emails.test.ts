import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
      update: vi.fn(),
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

import { checkAndWarnLowCredits } from '@/lib/credits';

describe('Low-credit warning emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    delete process.env.RESEND_FROM_EMAIL;
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it('should send a low-credit warning email when the organization is below the threshold', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      creditsRemaining: 4,
      lowCreditWarningShown: false,
      lowCreditEmailSentAt: null,
    });
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'owner-1',
      email: 'owner@vizora.dev',
    });
    mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });

    await checkAndWarnLowCredits('org-1');

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.to).toBe('owner@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.subject).toContain('Low Credit');
    expect(payload.html).toContain('4');
  });

  it('should not send a low-credit warning email when a warning is already shown', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      creditsRemaining: 3,
      lowCreditWarningShown: true,
      lowCreditEmailSentAt: null,
    });

    await checkAndWarnLowCredits('org-1');

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('should not send a low-credit warning email twice within twenty-four hours', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      creditsRemaining: 2,
      lowCreditWarningShown: false,
      lowCreditEmailSentAt: new Date(),
    });

    await checkAndWarnLowCredits('org-1');

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('should not send a low-credit warning email when the organization is above the threshold', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Vizora Studio',
      creditsRemaining: 100,
      lowCreditWarningShown: false,
      lowCreditEmailSentAt: null,
    });

    await checkAndWarnLowCredits('org-1');

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });
});
