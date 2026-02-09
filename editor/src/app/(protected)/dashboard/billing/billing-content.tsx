'use client';

import { useEffect, useState, useTransition } from 'react';
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
    tierConfig: Record<string, {
      monthlyAllotment: number;
      concurrentLimit: number;
      displayName: string;
      priceMonthly: number | null;
      maxRollover: number;
    }>;
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

  const { organization, creditPercentage, daysUntilRenewal, isLowCredit, tierConfig, creditPacks } = billing;
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
        toast.success('Your message has been sent! We\'ll be in touch soon.');
        setEnterpriseForm({ name: '', email: '', company: '', message: '' });
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    });
  };

  // Get render stats
  const completedRenders = usage.renderStats.find(s => s.status === 'completed')?._count || 0;
  const failedRenders = usage.renderStats.find(s => s.status === 'failed')?._count || 0;

  // Format transaction description
  const getTransactionDescription = (reason: string) => {
    switch (reason) {
      case 'render': return 'Render';
      case 'subscription_renewal': return 'Subscription Renewal';
      case 'credit_pack': return 'Credit Pack';
      case 'system_refund': return 'System Refund';
      default: return reason;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationFillMode: 'both' }}
      >
        <h1 className="text-2xl font-bold tracking-tight font-heading">
          Billing & Usage
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and view usage analytics
        </p>
      </div>

      {/* Plan Overview Card */}
      <div
        className="rounded-xl border border-border/50 bg-card/40 p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'both' }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight font-heading text-foreground mb-2">
              Current Plan
            </h2>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierBadgeColor()}`}>
                {currentTierConfig.displayName}
              </span>
              {organization.cancelAtPeriodEnd && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                  Cancels at period end
                </span>
              )}
            </div>
          </div>
          {currentTier !== 'free' && organization.subscriptionStatus === 'past_due' && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="size-4" />
              <span>Payment failed</span>
            </div>
          )}
        </div>

        {/* Payment Failed Warning */}
        {organization.subscriptionStatus === 'past_due' && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">
              Payment failed - rendering suspended. Please update your payment method.
            </p>
          </div>
        )}

        {/* Credit Balance */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-muted-foreground">Credit Balance</span>
            <span className="text-2xl font-bold tabular-nums font-heading">
              {organization.creditBalance.toLocaleString()} / {organization.monthlyAllotment.toLocaleString()}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min(creditPercentage, 100)}%` }}
            />
          </div>
          {isLowCredit && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-400">
              <AlertCircle className="size-3" />
              <span>Credit balance is low</span>
            </div>
          )}
        </div>

        {/* Billing Cycle */}
        <div className="text-sm text-muted-foreground">
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
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '200ms', animationFillMode: 'both' }}
      >
        <h2 className="text-lg font-semibold tracking-tight font-heading text-foreground mb-4">
          Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free Plan */}
          <div className={`rounded-xl border ${currentTier === 'free' ? 'border-primary/50 bg-primary/5' : 'border-border/40 bg-card/50'} p-6`}>
            <div className="mb-4">
              {currentTier === 'free' && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                  Current Plan
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold font-heading mb-2">Free</h3>
            <p className="text-3xl font-bold font-heading mb-4">$0<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>3,000 credits/month</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>5 concurrent renders</span>
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className={`rounded-xl border ${currentTier === 'pro' ? 'border-primary/50 bg-primary/5' : 'border-border/40 bg-card/50'} p-6 relative`}>
            {currentTier !== 'pro' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300">
                  Recommended
                </span>
              </div>
            )}
            {currentTier === 'pro' && (
              <div className="mb-4">
                <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                  Current Plan
                </span>
              </div>
            )}
            <h3 className="text-xl font-bold font-heading mb-2">Pro</h3>
            <p className="text-3xl font-bold font-heading mb-4">$29<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
            <ul className="space-y-2 text-sm mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>30,000 credits/month</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>50 concurrent renders</span>
              </li>
            </ul>
            {currentTier === 'free' && (
              <button
                onClick={handleUpgradeToPro}
                disabled={isPending}
                className="w-full px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors disabled:opacity-50"
              >
                Upgrade to Pro
              </button>
            )}
            {currentTier === 'pro' && organization.stripeCustomerId && (
              <button
                onClick={handleManageSubscription}
                disabled={isPending}
                className="w-full px-4 py-2 rounded-lg border border-border/40 hover:bg-white/[0.03] text-foreground font-medium transition-colors disabled:opacity-50"
              >
                Manage Subscription
              </button>
            )}
          </div>

          {/* Enterprise Plan */}
          <div className={`rounded-xl border ${currentTier === 'enterprise' ? 'border-primary/50 bg-primary/5' : 'border-border/40 bg-card/50'} p-6`}>
            {currentTier === 'enterprise' && (
              <div className="mb-4">
                <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                  Current Plan
                </span>
              </div>
            )}
            <h3 className="text-xl font-bold font-heading mb-2">Enterprise</h3>
            <p className="text-3xl font-bold font-heading mb-4">Custom</p>
            <ul className="space-y-2 text-sm mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>1M+ credits/month</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>Unlimited concurrent renders</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Enterprise Contact Form (shown when on free/pro or inside enterprise card) */}
      {currentTier !== 'enterprise' && (
        <div
          className="rounded-xl border border-border/40 bg-card/50 p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-semibold tracking-tight font-heading text-foreground mb-4">
            Contact Sales for Enterprise
          </h2>
          <form onSubmit={handleEnterpriseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={enterpriseForm.name}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={enterpriseForm.email}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-foreground mb-1.5">
                Company
              </label>
              <input
                type="text"
                id="company"
                value={enterpriseForm.company}
                onChange={(e) => setEnterpriseForm({ ...enterpriseForm, company: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Your company name"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">
                Message *
              </label>
              <textarea
                id="message"
                value={enterpriseForm.message}
                onChange={(e) => setEnterpriseForm({ ...enterpriseForm, message: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Tell us about your needs..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="size-4" />
              Send Message
            </button>
          </form>
        </div>
      )}

      {/* Manage Subscription (for Pro users) */}
      {currentTier !== 'free' && organization.stripeCustomerId && (
        <div
          className="rounded-xl border border-border/40 bg-card/50 p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-semibold tracking-tight font-heading text-foreground mb-2">
            Manage Subscription
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Update payment method, view invoices, or cancel your subscription
          </p>
          <button
            onClick={handleManageSubscription}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-border/40 hover:bg-white/[0.03] text-foreground font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <CreditCard className="size-4" />
            Open Customer Portal
            <ArrowUpRight className="size-4" />
          </button>
        </div>
      )}

      {/* Credit Packs */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '400ms', animationFillMode: 'both' }}
      >
        <h2 className="text-lg font-semibold tracking-tight font-heading text-foreground mb-2">
          Buy Additional Credits
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          One-time credit top-ups. Credits never expire.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {creditPacks.map((pack) => {
            const pricePerCredit = (pack.priceUsd / pack.credits * 100).toFixed(2);
            return (
              <div key={pack.id} className="rounded-xl border border-border/40 bg-card/50 p-6">
                <h3 className="text-xl font-bold font-heading mb-1">{pack.label}</h3>
                <p className="text-3xl font-bold font-heading text-primary mb-2">
                  ${pack.priceUsd}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  ${pricePerCredit} per 100 credits
                </p>
                <button
                  onClick={() => handleBuyCreditPack(pack.id)}
                  disabled={isPending}
                  className="w-full px-4 py-2 rounded-lg border border-border/40 hover:bg-white/[0.03] text-foreground font-medium transition-colors disabled:opacity-50"
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
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '500ms', animationFillMode: 'both' }}
      >
        <h2 className="text-lg font-semibold tracking-tight font-heading text-foreground mb-4">
          Usage This Cycle
        </h2>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Credits Used</span>
              <TrendingUp className="size-4 text-primary" />
            </div>
            <p className="text-2xl font-bold font-heading mt-2 tabular-nums">
              {usage.totalCreditsUsed.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Renders Completed</span>
              <CheckCircle2 className="size-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold font-heading mt-2 tabular-nums">
              {completedRenders}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Renders Failed</span>
              <AlertCircle className="size-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold font-heading mt-2 tabular-nums">
              {failedRenders}
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
          <div className="p-4 border-b border-border/20">
            <h3 className="font-semibold text-foreground">Credit Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            {usage.transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/20">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/20 hover:bg-white/[0.02]">
                      <td className="p-3 text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="p-3 text-foreground">
                        {getTransactionDescription(tx.reason)}
                      </td>
                      <td className={`p-3 text-right font-medium tabular-nums ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums text-foreground">
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
