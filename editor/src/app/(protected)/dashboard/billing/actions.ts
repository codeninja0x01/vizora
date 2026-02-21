'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { TIER_CONFIG, CREDIT_PACKS } from '@/lib/billing';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Get billing overview data for the active organization
 */
export async function getBillingOverview() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return { success: false, error: 'No active organization' };
  }

  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: {
      id: true,
      tier: true,
      creditBalance: true,
      monthlyAllotment: true,
      billingCycleStart: true,
      billingCycleEnd: true,
      subscriptionStatus: true,
      cancelAtPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!org) {
    return { success: false, error: 'Organization not found' };
  }

  // Calculate credit percentage and usage info
  const creditPercentage =
    org.monthlyAllotment > 0
      ? Math.round((org.creditBalance / org.monthlyAllotment) * 100)
      : 0;

  const now = new Date();
  const daysUntilRenewal = org.billingCycleEnd
    ? Math.ceil(
        (org.billingCycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const isLowCredit = org.creditBalance <= org.monthlyAllotment * 0.2;

  return {
    success: true,
    data: {
      organization: org,
      creditPercentage,
      daysUntilRenewal,
      isLowCredit,
      tierConfig: TIER_CONFIG,
      creditPacks: CREDIT_PACKS,
    },
  };
}

/**
 * Get usage data (transactions and render stats) for the active organization
 */
export async function getUsageData() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return { success: false, error: 'No active organization' };
  }

  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: {
      billingCycleStart: true,
      billingCycleEnd: true,
    },
  });

  if (!org) {
    return { success: false, error: 'Organization not found' };
  }

  // Fetch recent credit transactions (last 30)
  const transactions = await prisma.creditTransaction.findMany({
    where: { organizationId: activeOrgId },
    select: {
      id: true,
      amount: true,
      balanceBefore: true,
      balanceAfter: true,
      reason: true,
      renderId: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  // Fetch render stats (grouped by status) for current billing cycle
  const renderStats = org.billingCycleStart
    ? await prisma.render.groupBy({
        by: ['status'],
        where: {
          organizationId: activeOrgId,
          queuedAt: {
            gte: org.billingCycleStart,
          },
        },
        _count: true,
      })
    : [];

  // Calculate total credits used this cycle (sum of negative transactions)
  const totalCreditsUsed = org.billingCycleStart
    ? await prisma.creditTransaction.aggregate({
        where: {
          organizationId: activeOrgId,
          createdAt: {
            gte: org.billingCycleStart,
          },
          amount: {
            lt: 0, // Negative amounts = credits used
          },
        },
        _sum: {
          amount: true,
        },
      })
    : { _sum: { amount: 0 } };

  return {
    success: true,
    data: {
      transactions,
      renderStats,
      totalCreditsUsed: Math.abs(totalCreditsUsed._sum.amount || 0),
      billingCycleStart: org.billingCycleStart,
    },
  };
}

/**
 * Create a Stripe Checkout session for subscription upgrade
 */
export async function createCheckoutSession(priceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return { success: false, error: 'No active organization' };
  }

  // Check if Stripe is configured
  if (!stripe) {
    return {
      success: false,
      error: 'Stripe not configured. Please contact support.',
    };
  }

  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: {
      id: true,
      stripeCustomerId: true,
    },
  });

  if (!org) {
    return { success: false, error: 'Organization not found' };
  }

  // Create or retrieve Stripe customer
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;

    // Save customer ID to organization
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
    metadata: { organizationId: org.id },
  });

  redirect(checkoutSession.url!);
}

/**
 * Create a Stripe Customer Portal session for subscription management
 */
export async function createPortalSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return { success: false, error: 'No active organization' };
  }

  if (!stripe) {
    return {
      success: false,
      error: 'Stripe not configured. Please contact support.',
    };
  }

  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: {
      stripeCustomerId: true,
    },
  });

  if (!org || !org.stripeCustomerId) {
    return { success: false, error: 'No Stripe customer found' };
  }

  // Create portal session
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
  });

  redirect(portalSession.url);
}

/**
 * Create a Stripe Checkout session for one-time credit pack purchase
 */
export async function createCreditPackCheckout(packId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    return { success: false, error: 'No active organization' };
  }

  if (!stripe) {
    return {
      success: false,
      error: 'Stripe not configured. Please contact support.',
    };
  }

  // Find the pack by ID
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    return { success: false, error: 'Invalid credit pack' };
  }

  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: {
      id: true,
      stripeCustomerId: true,
    },
  });

  if (!org) {
    return { success: false, error: 'Organization not found' };
  }

  // Create or retrieve Stripe customer
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;

    // Save customer ID to organization
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create checkout session for one-time payment
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: pack.label,
            description: 'One-time credit top-up for AutoClip',
          },
          unit_amount: pack.priceUsd * 100, // Convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing?credits_added=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
    metadata: {
      organizationId: org.id,
      packSize: String(pack.credits),
      type: 'credit_pack',
    },
  });

  redirect(checkoutSession.url!);
}

/**
 * Submit enterprise contact form
 */
export async function submitEnterpriseContact(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const company = formData.get('company') as string;
  const message = formData.get('message') as string;

  // Validate required fields
  if (!name || name.trim() === '') {
    return { success: false, error: 'Name is required' };
  }

  if (!email || email.trim() === '') {
    return { success: false, error: 'Email is required' };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }

  if (!message || message.trim() === '') {
    return { success: false, error: 'Message is required' };
  }

  // In a real implementation, this would send an email via Resend
  // For now, we'll just log it
  console.log('[Enterprise Contact]', {
    name,
    email,
    company,
    message,
    timestamp: new Date().toISOString(),
  });

  // Optional: If Resend is configured, send the email
  // This follows the pattern from auth.ts
  // You could import Resend and send a notification to the sales team

  return { success: true };
}
