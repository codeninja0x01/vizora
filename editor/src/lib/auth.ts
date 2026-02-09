import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import { prisma } from './db';
import { Resend } from 'resend';

// Initialize Resend client for email sending
const resend = new Resend(process.env.RESEND_API_KEY);

// Better Auth server configuration
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string; name: string };
      url: string;
    }) => {
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || 'noreply@openvideo.dev';

      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: 'Verify your email address',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to OpenVideo!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <p>
              <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
                Verify Email
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    },
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { email: string; name: string };
      url: string;
    }) => {
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || 'noreply@openvideo.dev';

      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: 'Reset your password',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
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
          </div>
        `,
      });
    },
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  plugins: [
    organization({
      sendInvitationEmail: async ({ email, invitation, organization: org }) => {
        const fromEmail =
          process.env.RESEND_FROM_EMAIL || 'noreply@openvideo.dev';
        const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
        const invitationLink = `${baseUrl}/accept-invitation?id=${invitation.id}`;

        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `You've been invited to join ${org.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Organization Invitation</h2>
              <p>You've been invited to join <strong>${org.name}</strong> on OpenVideo!</p>
              <p>
                <a href="${invitationLink}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
                  Accept Invitation
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                If you don't want to accept this invitation, you can safely ignore this email.
              </p>
            </div>
          `,
        });
      },
    }),
  ],

  accountLinking: {
    enabled: true,
    requireEmailVerification: true,
  },
});
