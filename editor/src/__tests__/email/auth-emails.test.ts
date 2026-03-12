import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const { mockEmailsSend, mockResend, mockConsoleInfo, mockConsoleError } =
  vi.hoisted(() => ({
    mockEmailsSend: vi.fn(),
    mockResend: vi.fn().mockImplementation(() => ({
      emails: {
        send: mockEmailsSend,
      },
    })),
    mockConsoleInfo: vi.fn(),
    mockConsoleError: vi.fn(),
  }));

vi.mock('resend', () => ({
  Resend: mockResend,
}));

import {
  sendEmail,
  sendInvitationEmailHandler,
  sendResetPasswordHandler,
  sendVerificationEmailHandler,
} from '@/lib/auth';

function lastSendPayload() {
  expect(mockEmailsSend).toHaveBeenCalledTimes(1);
  return mockEmailsSend.mock.calls[0]?.[0];
}

describe('Auth email flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    delete process.env.RESEND_FROM_EMAIL;
    vi.stubGlobal('console', {
      ...console,
      info: mockConsoleInfo,
      error: mockConsoleError,
    });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    vi.unstubAllGlobals();
  });

  it('should send a verification email on signup with the vizora sender fallback', async () => {
    // CODER NOTE: Architect specified extracting this Better Auth callback into a named export.
    await sendVerificationEmailHandler({
      user: { email: 'new-user@vizora.dev' },
      url: 'https://vizora.dev/auth/verify?token=test-token',
    });

    const payload = lastSendPayload();
    expect(payload.to).toBe('new-user@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.subject).toContain('Verify');
    expect(payload.html).toContain(
      'https://vizora.dev/auth/verify?token=test-token'
    );
  });

  it('should send a password reset email when requested', async () => {
    await sendResetPasswordHandler({
      user: { email: 'reset-user@vizora.dev' },
      url: 'https://vizora.dev/auth/reset-password?token=reset-token',
    });

    const payload = lastSendPayload();
    expect(payload.to).toBe('reset-user@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.subject).toContain('Reset');
    expect(payload.html).toContain(
      'https://vizora.dev/auth/reset-password?token=reset-token'
    );
  });

  it('should send an organization invitation email with the organization name and invitation link', async () => {
    await sendInvitationEmailHandler({
      email: 'invitee@vizora.dev',
      invitation: {
        id: 'invitation-1',
      },
      organization: {
        name: 'Vizora Studio',
      },
      inviter: {
        user: {
          name: 'Taylor',
        },
      },
      invitationLink: 'https://vizora.dev/accept-invite?token=invite-token',
    });

    const payload = lastSendPayload();
    expect(payload.to).toBe('invitee@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.subject).toContain('Vizora Studio');
    expect(payload.html).toContain(
      'https://vizora.dev/accept-invite?token=invite-token'
    );
  });

  it('should skip sending and log when Resend is not configured', async () => {
    delete process.env.RESEND_API_KEY;

    await sendEmail(
      'ops@vizora.dev',
      'Verification email disabled in test',
      '<p>Resend disabled</p>'
    );

    expect(mockEmailsSend).not.toHaveBeenCalled();
    expect(mockConsoleInfo).toHaveBeenCalled();
  });

  it('should log resend errors without throwing to the caller', async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error('resend unavailable'));

    await expect(
      sendEmail('ops@vizora.dev', 'Email send failure', '<p>Retry later</p>')
    ).resolves.toBeUndefined();

    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('should honor RESEND_FROM_EMAIL when explicitly configured', async () => {
    process.env.RESEND_FROM_EMAIL = 'notifications@vizora.dev';

    await sendVerificationEmailHandler({
      user: { email: 'configured-sender@vizora.dev' },
      url: 'https://vizora.dev/auth/verify?token=configured',
    });

    const payload = lastSendPayload();
    expect(payload.from).toBe('notifications@vizora.dev');
  });
});
