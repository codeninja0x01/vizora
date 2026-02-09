'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

interface LowCreditBannerProps {
  creditBalance: number;
  monthlyAllotment: number;
  tier: string;
}

export function LowCreditBanner({
  creditBalance,
  monthlyAllotment,
  tier,
}: LowCreditBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Calculate if credits are low (<=20% of monthly allotment)
  const isLow = monthlyAllotment > 0 && creditBalance <= monthlyAllotment * 0.2;

  // Don't show banner if:
  // - Credits are not low
  // - User dismissed it (client-side only, resets on page reload)
  // - Free tier with no subscription (monthlyAllotment would be 0)
  if (!isLow || dismissed || (tier === 'free' && monthlyAllotment === 0)) {
    return null;
  }

  const percentage = Math.round((creditBalance / monthlyAllotment) * 100);
  const isZero = creditBalance === 0;

  return (
    <div
      className={`mb-6 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
        isZero
          ? 'border-red-500/20 bg-red-500/10'
          : 'border-amber-500/20 bg-amber-500/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle
          className={`size-5 flex-shrink-0 ${
            isZero ? 'text-red-400' : 'text-amber-400'
          }`}
        />
        <p
          className={`text-sm font-medium ${
            isZero ? 'text-red-400' : 'text-amber-400'
          }`}
        >
          {isZero ? (
            <>
              You&apos;re out of credits. Renders are blocked until you upgrade
              or buy credits.
            </>
          ) : (
            <>
              Your credits are running low ({percentage}% remaining).{' '}
              {creditBalance.toLocaleString()} credits left.
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/billing"
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            isZero
              ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
              : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
          }`}
        >
          {isZero ? 'Buy Credits' : 'Upgrade Plan'}
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
            isZero
              ? 'text-red-400/60 hover:bg-red-500/10 hover:text-red-400'
              : 'text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-400'
          }`}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
