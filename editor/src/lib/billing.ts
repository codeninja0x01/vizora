// Billing configuration and credit utilities

// Credit calculation
export const CREDIT_RATE_PER_SECOND = 10; // 10 credits per second of video output

export function calculateCredits(durationSeconds: number): number {
  return Math.ceil(durationSeconds * CREDIT_RATE_PER_SECOND);
}

// Low credit threshold
export const LOW_CREDIT_THRESHOLD = 0.2; // 20% of monthly allotment

export function isLowCredit(
  balance: number,
  monthlyAllotment: number
): boolean {
  return balance <= monthlyAllotment * LOW_CREDIT_THRESHOLD;
}

// Subscription status check
export function canRender(
  subscriptionStatus: string | null,
  tier: string
): boolean {
  // Free tier has no subscription
  if (tier === 'free') {
    return true;
  }
  // Paid tiers must have active subscription
  return subscriptionStatus !== 'past_due' && subscriptionStatus !== 'canceled';
}

// Types
export type TierName = 'free' | 'pro' | 'enterprise';

export interface TierConfig {
  monthlyAllotment: number;
  concurrentLimit: number;
  displayName: string;
  priceMonthly: number | null;
  maxRollover: number;
}

export interface CreditPack {
  id: string;
  credits: number;
  priceUsd: number;
  label: string;
}

// Tier configuration
export const TIER_CONFIG: Record<TierName, TierConfig> = {
  free: {
    monthlyAllotment: 3000,
    concurrentLimit: 5,
    displayName: 'Free',
    priceMonthly: 0,
    maxRollover: 6000, // 2x monthlyAllotment
  },
  pro: {
    monthlyAllotment: 30000,
    concurrentLimit: 50,
    displayName: 'Pro',
    priceMonthly: 29,
    maxRollover: 60000, // 2x monthlyAllotment
  },
  enterprise: {
    monthlyAllotment: 1000000,
    concurrentLimit: Infinity,
    displayName: 'Enterprise',
    priceMonthly: null, // Contact sales
    maxRollover: 2000000, // 2x monthlyAllotment
  },
};

// Credit pack definitions
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_1000',
    credits: 1000,
    priceUsd: 10,
    label: '1,000 Credits',
  },
  {
    id: 'pack_5000',
    credits: 5000,
    priceUsd: 40,
    label: '5,000 Credits',
  },
  {
    id: 'pack_15000',
    credits: 15000,
    priceUsd: 100,
    label: '15,000 Credits',
  },
];
