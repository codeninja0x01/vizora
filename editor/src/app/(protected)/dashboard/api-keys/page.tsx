import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { KeyRound, Shield } from 'lucide-react';
import { CreateApiKeyDialog } from './create-dialog';
import { RevokeButton } from './revoke-button';

function formatDate(date: Date | null): string {
  if (!date) return '—';

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

export default async function ApiKeysPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please log in to view API keys.</p>
      </div>
    );
  }

  const activeOrgId = session.session.activeOrganizationId;

  if (!activeOrgId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            API Keys
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground/70">
            Manage API keys for programmatic access to AutoClip
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-14 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <KeyRound className="size-6 text-muted-foreground/30" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            No organization selected
          </h2>
          <p className="mt-2 text-sm text-muted-foreground/60">
            Please create or select an organization to manage API keys.
          </p>
        </div>
      </div>
    );
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { organizationId: activeOrgId, revokedAt: null },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="flex items-start justify-between animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: 'both' }}
      >
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            API Keys
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground/70">
            Manage API keys for programmatic access to AutoClip
          </p>
        </div>
        <CreateApiKeyDialog />
      </div>

      {/* API Keys */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        {apiKeys.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-14 text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <KeyRound className="size-6 text-muted-foreground/30" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              No API keys yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground/60">
              Create your first API key to start using the AutoClip API.
            </p>
            <div className="mt-6">
              <CreateApiKeyDialog />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/[0.07]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                    Name
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                    Key prefix
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                    Created
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                    Last used
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                      {key.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[12px] text-muted-foreground">
                        {key.keyPrefix}…
                      </code>
                    </td>
                    <td className="px-5 py-3.5 text-sm tabular-nums text-muted-foreground/60">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-sm tabular-nums text-muted-foreground/60">
                      {formatDate(key.lastUsedAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <RevokeButton keyId={key.id} keyName={key.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security notice */}
      <div
        className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '160ms', animationFillMode: 'both' }}
      >
        <Shield className="mt-0.5 size-4 shrink-0 text-muted-foreground/30" />
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-foreground">
            Security best practices
          </h3>
          <ul className="space-y-1.5 text-[12.5px] text-muted-foreground/60">
            <li>
              API keys are shown only once during creation — copy them
              immediately
            </li>
            <li>
              Store API keys securely and never commit them to version control
            </li>
            <li>Revoke keys immediately if they are compromised</li>
            <li>
              Use separate API keys for different applications or environments
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
