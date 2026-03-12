import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import { prisma } from './db';
import { Resend } from 'resend';

function getResendClient() {
  const resendApiKey = process.env.RESEND_API_KEY;
  return resendApiKey ? new Resend(resendApiKey) : null;
}

async function deliverEmail(to: string, subject: string, html: string) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@vizora.dev';

  if (!resend) {
    console.info(
      `[Auth] Email skipped (no RESEND_API_KEY): to=${to} subject="${subject}"`
    );
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(
        `[Auth] Failed to send email: to=${to} subject="${subject}" error=${JSON.stringify(error)}`
      );
      return;
    }

    console.info(
      `[Auth] Email sent: id=${data?.id} to=${to} subject="${subject}"`
    );
  } catch (error) {
    console.error('[Auth] Failed to send email:', error);
  }
}

export async function sendEmail(to: string, subject: string, html: string) {
  await deliverEmail(to, subject, html);
}

export async function sendVerificationEmailHandler({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) {
  if (!getResendClient()) {
    console.info(`[Auth] Verification URL for ${user.email}: ${url}`);
  }

  await deliverEmail(
    user.email,
    'Verify your email address',
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Vizora!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
          Verify Email
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>`
  );
}

export async function sendResetPasswordHandler({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) {
  await deliverEmail(
    user.email,
    'Reset your password',
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
          Reset Password
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>`
  );
}

export async function sendInvitationEmailHandler({
  email,
  invitation,
  organization: org,
  invitationLink,
}: {
  email: string;
  invitation: { id: string };
  organization: { name: string };
  inviter?: { user?: { name?: string } };
  invitationLink?: string;
}) {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const resolvedInvitationLink =
    invitationLink || `${baseUrl}/accept-invitation?id=${invitation.id}`;

  await deliverEmail(
    email,
    `You've been invited to join ${org.name}`,
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Organization Invitation</h2>
      <p>You've been invited to join <strong>${org.name}</strong> on Vizora!</p>
      <p>
        <a href="${resolvedInvitationLink}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
          Accept Invitation
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        If you don't want to accept this invitation, you can safely ignore this email.
      </p>
    </div>`
  );
}

// Better Auth server configuration
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  trustedOrigins: process.env.TRUSTED_ORIGINS
    ? process.env.TRUSTED_ORIGINS.split(',')
    : [process.env.BETTER_AUTH_URL || 'http://localhost:3000'],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !!process.env.RESEND_API_KEY,
    sendVerificationEmail: sendVerificationEmailHandler,
    sendResetPassword: sendResetPasswordHandler,
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },

  plugins: [
    organization({
      sendInvitationEmail: sendInvitationEmailHandler,
    }),
  ],

  accountLinking: {
    enabled: true,
    requireEmailVerification: true,
  },
});
