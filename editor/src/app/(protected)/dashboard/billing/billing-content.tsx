'use client';

// Stub component - full implementation in plan 09-04
// This temporary stub allows TypeScript to compile while plan 09-04 is pending
export function BillingContent({
  billing,
  usage,
  showSuccess,
  showCreditsAdded,
}: {
  billing: unknown;
  usage: unknown;
  showSuccess?: boolean;
  showCreditsAdded?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-heading">
          Billing & Usage
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and view usage analytics
        </p>
      </div>
      <div className="rounded-xl border border-border/50 bg-card/40 p-12 text-center">
        <p className="text-muted-foreground">
          Billing dashboard coming soon (Plan 09-04)
        </p>
      </div>
    </div>
  );
}
