// Credit deduction, refund, and warning utilities

import { prisma } from '@/lib/db';
import { isLowCredit } from '@/lib/billing';
import { Resend } from 'resend';

function getResendClient() {
  const resendApiKey = process.env.RESEND_API_KEY;
  return resendApiKey ? new Resend(resendApiKey) : null;
}

function getResendFromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'noreply@vizora.dev';
}

// Result types
export type DeductResult =
  | { success: true; newBalance: number }
  | { success: false; available: number; required: number };

/**
 * Extract template duration from projectData
 * Returns duration in seconds, or null if not found
 */
export function getTemplateDuration(
  projectData: Record<string, any>
): number | null {
  try {
    const durationMicros = projectData?.size?.duration;
    if (typeof durationMicros === 'number' && durationMicros > 0) {
      return Math.ceil(durationMicros / 1_000_000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Atomically deduct credits for a render
 * Uses RepeatableRead isolation to prevent race conditions
 */
export async function deductCreditsForRender(
  organizationId: string,
  creditsRequired: number
): Promise<DeductResult> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Read current balance with lock
        const org = await tx.organization.findUniqueOrThrow({
          where: { id: organizationId },
          select: { creditBalance: true },
        });

        const balanceBefore = org.creditBalance;

        // Check if sufficient credits
        if (balanceBefore < creditsRequired) {
          // Return failure result from within transaction (don't throw)
          return {
            success: false,
            available: balanceBefore,
            required: creditsRequired,
          } as const;
        }

        const balanceAfter = balanceBefore - creditsRequired;

        // Update balance
        await tx.organization.update({
          where: { id: organizationId },
          data: { creditBalance: balanceAfter },
        });

        // Create transaction record
        await tx.creditTransaction.create({
          data: {
            organizationId,
            amount: -creditsRequired,
            balanceBefore,
            balanceAfter,
            reason: 'render',
            metadata: { creditsRequired },
          },
        });

        return {
          success: true,
          newBalance: balanceAfter,
        } as const;
      },
      {
        isolationLevel: 'RepeatableRead',
        timeout: 10000,
      }
    );

    return result;
  } catch (error) {
    console.error('Credit deduction failed:', error);
    throw error;
  }
}

/**
 * Refund credits for a failed render (system error only)
 */
export async function refundCredits(
  organizationId: string,
  creditsToRefund: number,
  renderId: string
): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        // Read current balance
        const org = await tx.organization.findUniqueOrThrow({
          where: { id: organizationId },
          select: { creditBalance: true, monthlyAllotment: true },
        });

        const balanceBefore = org.creditBalance;
        const balanceAfter = org.creditBalance + creditsToRefund;

        // Update balance
        await tx.organization.update({
          where: { id: organizationId },
          data: { creditBalance: balanceAfter },
        });

        // Create refund transaction record
        await tx.creditTransaction.create({
          data: {
            organizationId,
            renderId,
            amount: creditsToRefund,
            balanceBefore,
            balanceAfter,
            reason: 'refund_system_failure',
            metadata: { renderId },
          },
        });

        // Reset lowCreditWarningShown if balance now above threshold
        const wasLow = isLowCredit(org.creditBalance, org.monthlyAllotment);
        const nowHigh = !isLowCredit(balanceAfter, org.monthlyAllotment);

        if (wasLow && nowHigh) {
          await tx.organization.update({
            where: { id: organizationId },
            data: { lowCreditWarningShown: false },
          });
        }
      },
      {
        isolationLevel: 'RepeatableRead',
        timeout: 10000,
      }
    );

    console.log(
      `[Credits] Refunded ${creditsToRefund} credits for render ${renderId}`
    );
  } catch (error) {
    console.error('Credit refund failed:', error);
    throw error;
  }
}

/**
 * Check if credits are low and send warning email if threshold crossed
 * Returns whether the UI should show a low-credit banner
 */
export async function checkAndWarnLowCredits(
  organizationId: string
): Promise<{ shouldShowBanner: boolean }> {
  try {
    // Read organization credit state
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        creditBalance: true,
        monthlyAllotment: true,
        lowCreditWarningShown: true,
        lowCreditEmailSentAt: true,
        tier: true,
      },
    });

    // Skip if free tier with no allotment
    if (org.tier === 'free' && org.monthlyAllotment === 0) {
      return { shouldShowBanner: false };
    }

    // Check if low credit threshold crossed
    const isLow = isLowCredit(org.creditBalance, org.monthlyAllotment);

    // If not low, or already warned, do nothing
    if (!isLow || org.lowCreditWarningShown) {
      return { shouldShowBanner: isLow };
    }

    // Mark as warned
    await prisma.organization.update({
      where: { id: organizationId },
      data: { lowCreditWarningShown: true },
    });

    const resend = getResendClient();

    // Send email if Resend configured and not sent recently
    if (resend) {
      const now = new Date();
      const lastEmailSent = org.lowCreditEmailSentAt
        ? new Date(org.lowCreditEmailSentAt)
        : null;
      const hoursSinceLastEmail = lastEmailSent
        ? (now.getTime() - lastEmailSent.getTime()) / (1000 * 60 * 60)
        : Infinity;

      // Only send email if not sent in last 24 hours
      if (hoursSinceLastEmail >= 24) {
        // Find organization owner email
        const owner = await prisma.member.findFirst({
          where: {
            organizationId,
            role: 'owner',
          },
          include: {
            user: {
              select: { email: true, name: true },
            },
          },
        });

        if (owner?.user.email) {
          const percentRemaining =
            (org.creditBalance / org.monthlyAllotment) * 100;

          try {
            await resend.emails.send({
              from: getResendFromEmail(),
              to: owner.user.email,
              subject: 'Low Credit Warning - Vizora',
              html: `
                <h2>Low Credit Warning</h2>
                <p>Hi ${owner.user.name || 'there'},</p>
                <p>Your Vizora organization is running low on render credits.</p>
                <ul>
                  <li><strong>Current Balance:</strong> ${org.creditBalance.toLocaleString()} credits</li>
                  <li><strong>Monthly Allotment:</strong> ${org.monthlyAllotment.toLocaleString()} credits</li>
                  <li><strong>Remaining:</strong> ${percentRemaining.toFixed(1)}%</li>
                </ul>
                <p>To avoid render interruptions, consider upgrading your plan or purchasing additional credits.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vizora.dev'}/dashboard/billing">Manage Billing →</a></p>
              `,
            });

            // Update email sent timestamp
            await prisma.organization.update({
              where: { id: organizationId },
              data: { lowCreditEmailSentAt: now },
            });

            console.log(
              `[Credits] Low-credit warning email sent to ${owner.user.email}`
            );
          } catch (emailError) {
            console.error(
              '[Credits] Failed to send low-credit email:',
              emailError
            );
          }
        }
      }
    } else {
      // Resend not configured - just log
      console.log(
        `[Credits] Low-credit warning (no email sent - Resend not configured)`
      );
    }

    return { shouldShowBanner: true };
  } catch (error) {
    console.error('Low-credit check failed:', error);
    // Don't throw - this is best-effort
    return { shouldShowBanner: false };
  }
}

/**
 * TODO: Future considerations (not in scope for initial implementation)
 * - [ ] Separate credit pool for AI vs render
 * - [ ] Database-driven dynamic pricing table
 * - [ ] AI call refund mechanism (currently succeed-or-fail-fast)
 * - [ ] Changes to v1 API routes (already protected via withApiAuth)
 * - [ ] Changes to existing render credit flow
 * - [ ] New database tables (reuses existing CreditTransaction)
 */
export const AI_CREDIT_COSTS = {
  'ai/tts': 20,
  'ai/text-to-video': 100,
  'ai/template': 50,
  'ai/template/refine': 30,
  'ai/subtitles': 25,
  'ai/voices': 15,
  'elevenlabs/voiceover': 200,
  'elevenlabs/music': 300,
  'elevenlabs/sfx': 150,
  'audio/music': 100,
  'audio/sfx': 75,
  'chat/editor': 10,
  transcribe: 5,
  pexels: 0,
} as const;

export type AIOperationType = keyof typeof AI_CREDIT_COSTS;

export async function deductCreditsForAI(
  organizationId: string,
  operationType: AIOperationType
): Promise<DeductResult> {
  const creditsRequired = AI_CREDIT_COSTS[operationType];

  if (creditsRequired === 0) {
    return { success: true, newBalance: -1 };
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const org = await tx.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { creditBalance: true },
      });

      const balanceBefore = org.creditBalance;

      if (balanceBefore < creditsRequired) {
        return {
          success: false as const,
          available: balanceBefore,
          required: creditsRequired,
        };
      }

      const balanceAfter = balanceBefore - creditsRequired;

      await tx.organization.update({
        where: { id: organizationId },
        data: { creditBalance: balanceAfter },
      });

      await tx.creditTransaction.create({
        data: {
          organizationId,
          amount: -creditsRequired,
          balanceBefore,
          balanceAfter,
          reason: 'ai_usage',
          metadata: { operationType, route: `/api/${operationType}` },
        },
      });

      return { success: true as const, newBalance: balanceAfter };
    },
    {
      isolationLevel: 'RepeatableRead',
      timeout: 10000,
    }
  );

  if (result.success) {
    checkAndWarnLowCredits(organizationId).catch(() => {});
  }

  return result;
}
