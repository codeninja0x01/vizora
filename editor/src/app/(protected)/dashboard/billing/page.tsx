import { getBillingOverview, getUsageData } from './actions';
import { BillingContent } from './billing-content';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; credits_added?: string }>;
}) {
  const params = await searchParams;
  const billingResult = await getBillingOverview();
  const usageResult = await getUsageData();

  // Handle error states
  if (
    !billingResult.success ||
    !usageResult.success ||
    !billingResult.data ||
    !usageResult.data
  ) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Billing & Usage
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground/70">
            Manage your subscription and view usage analytics
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-14 text-center">
          <p className="text-sm text-muted-foreground/60">
            {billingResult.error ||
              usageResult.error ||
              'Unable to load billing data'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <BillingContent
      billing={billingResult.data}
      usage={usageResult.data}
      showSuccess={params.success === 'true'}
      showCreditsAdded={params.credits_added === 'true'}
    />
  );
}
