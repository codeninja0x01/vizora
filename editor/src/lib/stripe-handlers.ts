import type Stripe from 'stripe';
import { addMonths } from 'date-fns';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { TIER_CONFIG, type TierName } from '@/lib/billing';

// Optional Resend for email notifications (follows same pattern as auth.ts)
let resend: any = null;
if (process.env.RESEND_API_KEY) {
  import('resend').then(({ Resend }) => {
    resend = new Resend(process.env.RESEND_API_KEY);
  });
} else {
  console.warn(
    '[Stripe Handlers] RESEND_API_KEY not configured - email notifications disabled'
  );
}

export async function handleCheckoutComplete(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const organizationId = session.metadata?.organizationId;

  if (!organizationId) {
    console.error(
      '[handleCheckoutComplete] Missing organizationId in metadata'
    );
    return;
  }

  console.log(
    `[handleCheckoutComplete] Processing session ${session.id} for org ${organizationId}`
  );

  // Handle subscription creation
  if (session.mode === 'subscription') {
    if (!stripe) {
      console.error('[handleCheckoutComplete] Stripe not configured');
      return;
    }

    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Determine tier from price ID
    let tier: TierName = 'pro'; // Default to pro
    const priceId =
      typeof subscription.items.data[0]?.price === 'string'
        ? subscription.items.data[0].price
        : subscription.items.data[0]?.price?.id;

    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      tier = 'pro';
    }
    // Enterprise is manual, so default to pro for any subscription

    const tierConfig = TIER_CONFIG[tier];
    const now = new Date();
    const cycleEnd = addMonths(now, 1);

    // Update organization with subscription details and initial credit grant
    await prisma.$transaction(
      async (tx) => {
        const org = await tx.organization.findUnique({
          where: { id: organizationId },
          select: { creditBalance: true },
        });

        if (!org) {
          throw new Error(`Organization ${organizationId} not found`);
        }

        const newBalance = org.creditBalance + tierConfig.monthlyAllotment;

        await tx.organization.update({
          where: { id: organizationId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            tier,
            subscriptionStatus: 'active',
            monthlyAllotment: tierConfig.monthlyAllotment,
            creditBalance: newBalance,
            billingCycleStart: now,
            billingCycleEnd: cycleEnd,
            lastCreditReset: now,
            lowCreditWarningShown: false,
            lowCreditEmailSentAt: null,
            cancelAtPeriodEnd: false,
          },
        });

        // Create credit transaction for initial grant
        await tx.creditTransaction.create({
          data: {
            organizationId,
            amount: tierConfig.monthlyAllotment,
            balanceBefore: org.creditBalance,
            balanceAfter: newBalance,
            reason: 'subscription_renewal',
            metadata: {
              tier,
              subscriptionId,
              initialGrant: true,
            },
          },
        });

        console.log(
          `[handleCheckoutComplete] Subscription created: ${subscriptionId}, tier: ${tier}, credits granted: ${tierConfig.monthlyAllotment}`
        );
      },
      {
        isolationLevel: 'RepeatableRead',
      }
    );
  }

  // Handle credit pack purchase
  if (session.mode === 'payment') {
    const packSize = parseInt(session.metadata?.packSize || '0', 10);
    if (!packSize) {
      console.error('[handleCheckoutComplete] Missing packSize in metadata');
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        const org = await tx.organization.findUnique({
          where: { id: organizationId },
          select: { creditBalance: true, monthlyAllotment: true },
        });

        if (!org) {
          throw new Error(`Organization ${organizationId} not found`);
        }

        const newBalance = org.creditBalance + packSize;

        await tx.organization.update({
          where: { id: organizationId },
          data: {
            creditBalance: newBalance,
            lowCreditWarningShown: false,
            lowCreditEmailSentAt: null,
          },
        });

        await tx.creditTransaction.create({
          data: {
            organizationId,
            amount: packSize,
            balanceBefore: org.creditBalance,
            balanceAfter: newBalance,
            reason: 'credit_pack',
            metadata: {
              packSize,
              sessionId: session.id,
            },
          },
        });

        console.log(
          `[handleCheckoutComplete] Credit pack purchased: ${packSize} credits added`
        );
      },
      {
        isolationLevel: 'RepeatableRead',
      }
    );
  }
}

export async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  // Skip subscription_create - handled by checkout.session.completed
  if (invoice.billing_reason === 'subscription_create') {
    console.log('[handleInvoicePaid] Skipping subscription_create invoice');
    return;
  }

  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) {
    console.error('[handleInvoicePaid] Missing customer ID');
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
    select: {
      id: true,
      creditBalance: true,
      monthlyAllotment: true,
      tier: true,
    },
  });

  if (!org) {
    console.warn(
      `[handleInvoicePaid] Organization not found for customer ${customerId}`
    );
    return;
  }

  console.log(
    `[handleInvoicePaid] Processing invoice ${invoice.id} for org ${org.id}`
  );

  // Perform credit rollover with 2x cap
  await prisma.$transaction(
    async (tx) => {
      const maxRollover = org.monthlyAllotment * 2;
      const newBalance = Math.min(
        org.creditBalance + org.monthlyAllotment,
        maxRollover
      );
      const addedCredits = newBalance - org.creditBalance;

      const now = new Date();
      const cycleEnd = addMonths(now, 1);

      await tx.organization.update({
        where: { id: org.id },
        data: {
          creditBalance: newBalance,
          billingCycleStart: now,
          billingCycleEnd: cycleEnd,
          lastCreditReset: now,
          lowCreditWarningShown: false,
          lowCreditEmailSentAt: null,
        },
      });

      await tx.creditTransaction.create({
        data: {
          organizationId: org.id,
          amount: addedCredits,
          balanceBefore: org.creditBalance,
          balanceAfter: newBalance,
          reason: 'subscription_renewal',
          metadata: {
            invoiceId: invoice.id,
            rolledOver: org.creditBalance,
            maxRollover,
            capped: newBalance === maxRollover,
          },
        },
      });

      console.log(
        `[handleInvoicePaid] Credits rolled over: ${addedCredits} (balance: ${org.creditBalance} → ${newBalance}, capped at ${maxRollover})`
      );
    },
    {
      isolationLevel: 'RepeatableRead',
    }
  );
}

export async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) {
    console.error('[handlePaymentFailed] Missing customer ID');
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, name: true },
  });

  if (!org) {
    console.warn(
      `[handlePaymentFailed] Organization not found for customer ${customerId}`
    );
    return;
  }

  console.log(
    `[handlePaymentFailed] Payment failed for org ${org.id}, suspending immediately`
  );

  // Immediately suspend - no grace period
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: 'past_due',
    },
  });

  // Send email notification to organization owner
  const owner = await prisma.member.findFirst({
    where: {
      organizationId: org.id,
      role: 'owner',
    },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  if (owner && resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@openvideo.dev',
        to: owner.user.email,
        subject: 'Payment Failed - Rendering Suspended',
        text: `Hi ${owner.user.name || 'there'},

Your payment for ${org.name} has failed and video rendering has been suspended.

To restore access, please update your payment method at:
${process.env.NEXT_PUBLIC_APP_URL || 'https://openvideo.dev'}/dashboard/billing

If you have any questions, please contact support.

Best regards,
The AutoClip Team`,
      });

      console.log(`[handlePaymentFailed] Email sent to ${owner.user.email}`);
    } catch (error) {
      console.error('[handlePaymentFailed] Failed to send email:', error);
    }
  } else if (owner && !resend) {
    console.log(
      `[handlePaymentFailed] Would send email to ${owner.user.email} (Resend not configured)`
    );
  }
}

export async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    console.error('[handleSubscriptionUpdated] Missing customer ID');
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, tier: true, monthlyAllotment: true },
  });

  if (!org) {
    console.warn(
      `[handleSubscriptionUpdated] Organization not found for customer ${customerId}`
    );
    return;
  }

  console.log(
    `[handleSubscriptionUpdated] Updating subscription ${subscription.id} for org ${org.id}`
  );

  // Determine tier from price ID
  let tier: TierName = org.tier as TierName;
  const priceId =
    typeof subscription.items.data[0]?.price === 'string'
      ? subscription.items.data[0].price
      : subscription.items.data[0]?.price?.id;

  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    tier = 'pro';
  }

  const tierConfig = TIER_CONFIG[tier];
  const tierChanged = tier !== org.tier;

  // Update organization
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      ...(tierChanged && {
        tier,
        monthlyAllotment: tierConfig.monthlyAllotment,
      }),
    },
  });

  console.log(
    `[handleSubscriptionUpdated] Subscription updated: status=${subscription.status}, cancelAtPeriodEnd=${subscription.cancel_at_period_end}${tierChanged ? `, tier changed: ${org.tier} → ${tier}` : ''}`
  );
}

export async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    console.error('[handleSubscriptionDeleted] Missing customer ID');
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, tier: true, monthlyAllotment: true },
  });

  if (!org) {
    console.warn(
      `[handleSubscriptionDeleted] Organization not found for customer ${customerId}`
    );
    return;
  }

  console.log(
    `[handleSubscriptionDeleted] Deleting subscription ${subscription.id} for org ${org.id}, reverting to free tier`
  );

  const freeTierConfig = TIER_CONFIG.free;

  // Update organization - revert to free tier
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      tier: 'free',
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
      monthlyAllotment: freeTierConfig.monthlyAllotment,
      cancelAtPeriodEnd: false,
    },
  });

  // Create transaction record if allotment changed
  if (org.monthlyAllotment !== freeTierConfig.monthlyAllotment) {
    await prisma.creditTransaction.create({
      data: {
        organizationId: org.id,
        amount: 0, // No immediate balance change
        balanceBefore: 0, // Not applicable
        balanceAfter: 0, // Not applicable
        reason: 'subscription_renewal',
        metadata: {
          subscriptionDeleted: true,
          oldTier: org.tier,
          newTier: 'free',
          oldAllotment: org.monthlyAllotment,
          newAllotment: freeTierConfig.monthlyAllotment,
        },
      },
    });
  }

  console.log(
    `[handleSubscriptionDeleted] Reverted to free tier (${freeTierConfig.monthlyAllotment} credits/month)`
  );
}
