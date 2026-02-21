'use client';

import { useEffect, useState, useTransition, useId } from 'react';
import {
  createCheckoutSession,
  createPortalSession,
  createCreditPackCheckout,
  submitEnterpriseContact,
} from './actions';
import { toast } from 'sonner';
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Send,
} from 'lucide-react';

interface BillingContentProps {
  billing: {
    organization: {
      id: string;
      tier: string;
      creditBalance: number;
      monthlyAllotment: number;
      billingCycleStart: Date | null;
      billingCycleEnd: Date | null;
      subscriptionStatus: string | null;
      cancelAtPeriodEnd: boolean | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
    };
    creditPercentage: number;
    daysUntilRenewal: number | null;
    isLowCredit: boolean;
    tierConfig: Record<
      string,
      {
        monthlyAllotment: number;
        concurrentLimit: number;
        displayName: string;
        priceMonthly: number | null;
        maxRollover: number;
      }
    >;
    creditPacks: Array<{
      id: string;
      credits: number;
      priceUsd: number;
      label: string;
    }>;
  };
  usage: {
    transactions: Array<{
      id: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      reason: string;
      renderId: string | null;
      createdAt: Date;
      metadata: unknown;
    }>;
    renderStats: Array<{
      status: string;
      _count: number;
    }>;
    totalCreditsUsed: number;
    billingCycleStart: Date | null;
  };
  showSuccess: boolean;
  showCreditsAdded: boolean;
}

export function BillingContent({
  billing,
  usage,
  showSuccess,
  showCreditsAdded,
}: BillingContentProps) {
  const [isPending, startTransition] = useTransition();
  const [enterpriseForm, setEnterpriseForm] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });

  const nameId = useId();
  const emailId = useId();
  const companyId = useId();
  const messageId = useId();

  const {
    organization,
    creditPercentage,
    daysUntilRenewal,
    isLowCredit,
    tierConfig,
    creditPacks,
  } = billing;
  const currentTier = organization.tier as 'free' | 'pro' | 'enterprise';
  const currentTierConfig = tierConfig[currentTier];

  // Show success toasts
  useEffect(() => {
    if (showSuccess) {
      toast.success('Subscription activated successfully!');
    }
    if (showCreditsAdded) {
      toast.success('Credits added to your account!');
    }
  }, [showSuccess, showCreditsAdded]);

  // Format date
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get progress bar color
  const getProgressColor = () => {
    if (creditPercentage > 50) return 'bg-green-500';
    if (creditPercentage > 20) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Get tier badge color
  const getTierBadgeColor = () => {
    if (currentTier === 'free') return 'bg-gray-500/10 text-gray-400';
    if (currentTier === 'pro') return 'bg-indigo-500/10 text-indigo-400';
    return 'bg-amber-500/10 text-amber-400';
  };

  // Handle upgrade to Pro
  const handleUpgradeToPro = () => {
    const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
    if (!proPriceId) {
      toast.error('Stripe Pro Price ID not configured');
      return;
    }
    startTransition(async () => {
      const result = await createCheckoutSession(proPriceId);
      if (!result.success) {
        toast.error(result.error || 'Failed to create checkout session');
      }
    });
  };

  // Handle manage subscription
  const handleManageSubscription = () => {
    startTransition(async () => {
      const result = await createPortalSession();
      if (!result.success) {
        toast.error(result.error || 'Failed to open customer portal');
      }
    });
  };

  // Handle credit pack purchase
  const handleBuyCreditPack = (packId: string) => {
    startTransition(async () => {
      const result = await createCreditPackCheckout(packId);
      if (!result.success) {
        toast.error(result.error || 'Failed to create checkout session');
      }
    });
  };

  // Handle enterprise contact form
  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', enterpriseForm.name);
      formData.append('email', enterpriseForm.email);
      formData.append('company', enterpriseForm.company);
      formData.append('message', enterpriseForm.message);

      const result = await submitEnterpriseContact(formData);
      if (result.success) {
        toast.success("Your message has been sent! We'll be in touch soon.");
        setEnterpriseForm({ name: '', email: '', company: '', message: '' });
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    });
  };

  // Get render stats
  const completedRenders =
    usage.renderStats.find((s) => s.status === 'completed')?._count || 0;
  const failedRenders =
    usage.renderStats.find((s) => s.status === 'failed')?._count || 0;

  // Format transaction description
  const getTransactionDescription = (reason: string) => {
    switch (reason) {
      case 'render':
        return 'Render';
      case 'subscription_renewal':
        return 'Subscription Renewal';
      case 'credit_pack':
        return 'Credit Pack';
      case 'system_refund':
        return 'System Refund';
      default:
        return reason;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: 'both' }}
      >
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Billing & Usage
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground/70">
          Manage your subscription and view usage analytics
        </p>
      </div>

      {/* Plan Overview Card */}
      <div
        className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight font-heading text-foreground mb-2">
              Current Plan
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${getTierBadgeColor()}`}
              >
                {currentTierConfig.displayName}
              </span>
              {organization.cancelAtPeriodEnd && (
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-400">
                  Cancels at period end
                </span>
              )}
            </div>
          </div>
          {currentTier !== 'free' &&
            organization.subscriptionStatus === 'past_due' && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="size-4" />
                <span>Payment failed</span>
              </div>
            )}
        </div>

        {/* Payment Failed Warning */}
        {organization.subscriptionStatus === 'past_due' && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">
              Payment failed — rendering suspended. Please update your payment
              method.
            </p>
          </div>
        )}

        {/* Credit Balance */}
        <div className="mb-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[13px] text-muted-foreground/70">
              Credit Balance
            </span>
            <span className="font-heading text-2xl font-bold tabular-nums text-foreground">
              {organization.creditBalance.toLocaleString()} /{' '}
              {organization.monthlyAllotment.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min(creditPercentage, 100)}%` }}
            />
          </div>
          {isLowCredit && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-400">
              <AlertCircle className="size-3" />
              <span>Credit balance is low</span>
            </div>
          )}
        </div>

        {/* Billing Cycle */}
        <div className="text-[13px] text-muted-foreground/50">
          {organization.billingCycleEnd ? (
            <>
              Renews {formatDate(organization.billingCycleEnd)}
              {daysUntilRenewal !== null && daysUntilRenewal > 0 && (
                <span className="ml-1">({daysUntilRenewal} days)</span>
              )}
            </>
          ) : (
            'No active subscription'
          )}
        </div>
      </div>

      {/* Plan Comparison Section */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '160ms', animationFillMode: 'both' }}
      >
        <h2 className="mb-4 font-heading text-lg font-semibold tracking-tight text-foreground">
          Plans
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Free Plan */}
          <div
            className={`rounded-xl border p-6 ${currentTier === 'free' ? 'border-primary/40 bg-primary/[0.04]' : 'border-white/[0.07] bg-white/[0.02]'}`}
          >
            <div className="mb-4">
              {currentTier === 'free' && (
                <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  Current Plan
                </span>
              )}
            </div>
            <h3 className="mb-2 font-heading text-xl font-bold">Free</h3>
            <p className="mb-4 font-heading text-3xl font-bold">
              $0
              <span className="text-sm font-normal text-muted-foreground">
                /mo
              </span>
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground/70">
                <CheckCircle2 className="size-3.5 text-green-500" />
                <span>3,000 credits/month</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground/70">
                <CheckCircle2 className="size-3.5 text-green-500" />
                <span>5 concurrent renders</span>
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div
            className={`relative rounded-xl border p-6 ${currentTier === 'pro' ? 'border-primary/40 bg-primary/[0.04]' : 'border-white/[0.07] bg-white/[0.02]'}`}
          >
            {currentTier !== 'pro' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-medium text-white"
                  style={{
                    background:
                      'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
                  }}
                >
                  Recommended
                </span>
              </div>
            )}
            {currentTier === 'pro' && (
              <div className="mb-4">
                <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  Current Plan
                </span>
              </div>
            )}
            <h3 className="mb-2 font-heading text-xl font-bold">Pro</h3>
            <p className="mb-4 font-heading text-3xl font-bold">
              $29
              <span className="text-sm font-normal text-muted-foreground">
                /mo
              </span>
            </p>
            <ul className="mb-6 space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground/70">
                <CheckCircle2 className="size-3.5 text-green-500" />
                <span>30,000 credits/month</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground/70">
                <CheckCircle2 className="size-3.5 text-green-500" />
                <span>50 concurrent renders</span>
              </li>
            </ul>
            {currentTier === 'free' && (
              <button
                type="button"
                onClick={handleUpgradeToPro}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
                }}
              >
                Upgrade to Pro
              </button>
            )}
            {currentTier === 'pro' && organization.stripeCustomerId && (
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.05] disabled:opacity-50"
              >
                Manage Subscription
              </button>
            )}
          </div>

          {/* Enterprise Plan */}
          <div
            className={`rounded-xl border p-6 ${currentTier === 'enterprise' ? 'border-primary/40 bg-primary/[0.04]' : 'border-white/[0.07] bg-white/[0.02]'}`}
          >
            {currentTier === 'enterprise' && (
              <div className="mb-4">
                <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  Current Plan
                </span>
              </div>
            )}
            <h3 className="mb-2 font-heading text-xl font-bold">Enterprise</h3>
            <p className="mb-4 font-heading text-3xl font-bold">Custom</p>
            <ul className="mb-6 space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground/70">
                <CheckCircle2 className="size-3.5 text-green-500" />
                <span>1M+ credits/month</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground/70">
                <CheckCircle2 className="size-3.5 text-green-500" />
                <span>Unlimited concurrent renders</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Enterprise Contact Form (shown when on free/pro or inside enterprise card) */}
      {currentTier !== 'enterprise' && (
        <div
          className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '240ms', animationFillMode: 'both' }}
        >
          <h2 className="mb-4 font-heading text-lg font-semibold tracking-tight text-foreground">
            Contact Sales for Enterprise
          </h2>
          <form onSubmit={handleEnterpriseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor={nameId}
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70"
                >
                  Name *
                </label>
                <input
                  type="text"
                  id={nameId}
                  value={enterpriseForm.name}
                  onChange={(e) =>
                    setEnterpriseForm({
                      ...enterpriseForm,
                      name: e.target.value,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor={emailId}
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70"
                >
                  Email *
                </label>
                <input
                  type="email"
                  id={emailId}
                  value={enterpriseForm.email}
                  onChange={(e) =>
                    setEnterpriseForm({
                      ...enterpriseForm,
                      email: e.target.value,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label
                htmlFor={companyId}
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70"
              >
                Company
              </label>
              <input
                type="text"
                id={companyId}
                value={enterpriseForm.company}
                onChange={(e) =>
                  setEnterpriseForm({
                    ...enterpriseForm,
                    company: e.target.value,
                  })
                }
                className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                placeholder="Your company name"
              />
            </div>
            <div>
              <label
                htmlFor={messageId}
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70"
              >
                Message *
              </label>
              <textarea
                id={messageId}
                value={enterpriseForm.message}
                onChange={(e) =>
                  setEnterpriseForm({
                    ...enterpriseForm,
                    message: e.target.value,
                  })
                }
                rows={4}
                className="w-full resize-none rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                placeholder="Tell us about your needs..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{
                background:
                  'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
              }}
            >
              <Send className="size-3.5" />
              Send Message
            </button>
          </form>
        </div>
      )}

      {/* Manage Subscription (for Pro users) */}
      {currentTier !== 'free' && organization.stripeCustomerId && (
        <div
          className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '240ms', animationFillMode: 'both' }}
        >
          <h2 className="mb-1.5 font-heading text-lg font-semibold tracking-tight text-foreground">
            Manage Subscription
          </h2>
          <p className="mb-4 text-[13px] text-muted-foreground/60">
            Update payment method, view invoices, or cancel your subscription
          </p>
          <button
            type="button"
            onClick={handleManageSubscription}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.05] disabled:opacity-50"
          >
            <CreditCard className="size-3.5" />
            Open Customer Portal
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Credit Packs */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '320ms', animationFillMode: 'both' }}
      >
        <h2 className="mb-1 font-heading text-lg font-semibold tracking-tight text-foreground">
          Buy Additional Credits
        </h2>
        <p className="mb-4 text-[13px] text-muted-foreground/60">
          One-time credit top-ups. Credits never expire.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {creditPacks.map((pack) => {
            const pricePerCredit = (
              (pack.priceUsd / pack.credits) *
              100
            ).toFixed(2);
            return (
              <div
                key={pack.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6"
              >
                <h3 className="mb-1 font-heading text-xl font-bold">
                  {pack.label}
                </h3>
                <p className="mb-1 font-heading text-3xl font-bold text-foreground">
                  ${pack.priceUsd}
                </p>
                <p className="mb-4 text-[12px] text-muted-foreground/50">
                  ${pricePerCredit} per 100 credits
                </p>
                <button
                  type="button"
                  onClick={() => handleBuyCreditPack(pack.id)}
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.05] disabled:opacity-50"
                >
                  Buy Now
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Analytics */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '400ms', animationFillMode: 'both' }}
      >
        <h2 className="mb-4 font-heading text-lg font-semibold tracking-tight text-foreground">
          Usage This Cycle
        </h2>

        {/* Stats Row */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground/60">
                Credits Used
              </span>
              <TrendingUp className="size-4 text-primary/60" />
            </div>
            <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-foreground">
              {usage.totalCreditsUsed.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground/60">
                Renders Completed
              </span>
              <CheckCircle2 className="size-4 text-green-500/60" />
            </div>
            <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-foreground">
              {completedRenders}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground/60">
                Renders Failed
              </span>
              <AlertCircle className="size-4 text-red-500/60" />
            </div>
            <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-foreground">
              {failedRenders}
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="overflow-hidden rounded-xl border border-white/[0.07]">
          <div className="border-b border-white/[0.07] bg-white/[0.02] px-5 py-3.5">
            <h3 className="text-[13px] font-semibold text-foreground">
              Credit Transaction History
            </h3>
          </div>
          <div className="overflow-x-auto">
            {usage.transactions.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground/50">
                No transactions yet
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                      Date
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                      Description
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                      Amount
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                      Balance After
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usage.transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3.5 text-sm tabular-nums text-muted-foreground/60">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-foreground">
                        {getTransactionDescription(tx.reason)}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right text-sm font-medium tabular-nums ${tx.amount >= 0 ? 'text-green-500' : 'text-red-400'}`}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {tx.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-medium tabular-nums text-muted-foreground/60">
                        {tx.balanceAfter.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
