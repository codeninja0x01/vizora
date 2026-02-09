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
  if (!billingResult.success || !usageResult.success) {
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
            {billingResult.error || usageResult.error || 'Unable to load billing data'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <BillingContent
      billing={billingResult.data!}
      usage={usageResult.data!}
      showSuccess={params.success === 'true'}
      showCreditsAdded={params.credits_added === 'true'}
    />
  );
}
