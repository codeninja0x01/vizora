import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Webhook, Plus, Shield, AlertTriangle } from 'lucide-react';
import { CreateWebhookDialog } from './create-dialog';
import {
  DeleteWebhookButton,
  RotateSecretButton,
  ToggleWebhookSwitch,
} from './webhook-actions';

function formatDate(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default async function WebhooksPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please log in to view webhooks.</p>
      </div>
    );
  }

  const activeOrgId = session.session.activeOrganizationId;

  if (!activeOrgId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            Webhooks
          </h1>
          <p className="mt-1 text-muted-foreground">
            Receive notifications when renders complete or fail
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-12 text-center">
          <Webhook className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <h2 className="mb-2 text-xl font-semibold">
            No Organization Selected
          </h2>
          <p className="text-muted-foreground">
            Please create or select an organization to manage webhooks.
          </p>
        </div>
      </div>
    );
  }

  const webhooks = await prisma.webhookConfig.findMany({
    where: {
      organizationId: activeOrgId,
    },
    select: {
      id: true,
      url: true,
      enabled: true,
      createdAt: true,
      lastDeliveryAt: true,
      lastSuccessAt: true,
      lastFailureAt: true,
      consecutiveFailures: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="flex items-start justify-between animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationFillMode: 'both' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <Webhook className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight font-heading">
              Webhooks
            </h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Receive notifications when renders complete or fail
          </p>
        </div>
        <CreateWebhookDialog />
      </div>

      {/* Webhooks List */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'both' }}
      >
        {webhooks.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card/40 p-12 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/50">
              <Webhook className="size-7 text-muted-foreground/40" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No Webhooks Yet</h2>
            <p className="mb-5 text-muted-foreground">
              Create your first webhook to receive notifications when renders
              complete or fail.
            </p>
            <CreateWebhookDialog>
              <span className="flex items-center gap-2">
                <Plus className="size-4" />
                Create Webhook
              </span>
            </CreateWebhookDialog>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => {
              const hasFailures = webhook.consecutiveFailures > 0;
              const highFailures = webhook.consecutiveFailures > 3;

              return (
                <div
                  key={webhook.id}
                  className="rounded-xl border border-border/50 bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: URL and metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <code className="break-all rounded-md bg-white/[0.04] px-2 py-1 font-mono text-sm">
                          {webhook.url}
                        </code>
                        <div className="flex items-center gap-2">
                          {webhook.enabled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
                              <span className="size-1.5 rounded-full bg-green-500" />
                              Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delivery metadata */}
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Created:</span>{' '}
                          {formatDate(webhook.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">Last delivery:</span>{' '}
                          {formatDate(webhook.lastDeliveryAt)}
                        </div>
                        <div>
                          <span className="font-medium">Last success:</span>{' '}
                          {formatDate(webhook.lastSuccessAt)}
                        </div>
                        {webhook.lastFailureAt && (
                          <div>
                            <span className="font-medium">Last failure:</span>{' '}
                            {formatDate(webhook.lastFailureAt)}
                          </div>
                        )}
                      </div>

                      {/* Failure warning */}
                      {hasFailures && (
                        <div
                          className={`mt-3 flex items-start gap-2 rounded-md p-2 text-xs ${
                            highFailures
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                          <span>
                            {webhook.consecutiveFailures} consecutive failure
                            {webhook.consecutiveFailures !== 1 ? 's' : ''}.
                            {highFailures &&
                              ' Webhook may be automatically disabled after too many failures.'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <ToggleWebhookSwitch
                        webhookId={webhook.id}
                        enabled={webhook.enabled}
                      />
                      <RotateSecretButton webhookId={webhook.id} />
                      <DeleteWebhookButton
                        webhookId={webhook.id}
                        webhookUrl={webhook.url}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div
        className="flex gap-3 rounded-xl border border-border/40 bg-card/20 p-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '200ms', animationFillMode: 'both' }}
      >
        <Shield className="mt-0.5 size-5 flex-shrink-0 text-muted-foreground/50" />
        <div>
          <h3 className="mb-2 text-sm font-semibold">Webhook Security</h3>
          <ul className="space-y-1 text-[13px] text-muted-foreground">
            <li>
              Webhook secrets are shown only once during creation - copy them
              immediately
            </li>
            <li>
              All webhook requests are signed with HMAC-SHA256 for verification
            </li>
            <li>Rotate secrets immediately if they are compromised</li>
            <li>
              Webhooks include timestamp verification to prevent replay attacks
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
