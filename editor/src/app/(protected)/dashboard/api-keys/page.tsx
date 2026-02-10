import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { KeyRound, Plus, Shield } from 'lucide-react';
import { CreateApiKeyDialog } from './create-dialog';
import { RevokeButton } from './revoke-button';

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

export default async function ApiKeysPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            API Keys
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage API keys for programmatic access to OpenVideo
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-12 text-center">
          <KeyRound className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <h2 className="mb-2 text-xl font-semibold">
            No Organization Selected
          </h2>
          <p className="text-muted-foreground">
            Please create or select an organization to manage API keys.
          </p>
        </div>
      </div>
    );
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: {
      organizationId: activeOrgId,
      revokedAt: null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
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
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            API Keys
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage API keys for programmatic access to OpenVideo
          </p>
        </div>
        <CreateApiKeyDialog />
      </div>

      {/* API Keys List */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'both' }}
      >
        {apiKeys.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card/40 p-12 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/50">
              <KeyRound className="size-7 text-muted-foreground/40" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No API Keys Yet</h2>
            <p className="mb-5 text-muted-foreground">
              Create your first API key to get started with programmatic access.
            </p>
            <CreateApiKeyDialog>
              <span className="flex items-center gap-2">
                <Plus className="size-4" />
                Create API Key
              </span>
            </CreateApiKeyDialog>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/50">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-card/30">
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Key
                  </th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Created
                  </th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Last Used
                  </th>
                  <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-border/30 transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="p-4 font-medium">{key.name}</td>
                    <td className="p-4">
                      <code className="rounded-md bg-white/[0.04] px-2 py-1 font-mono text-xs text-muted-foreground">
                        {key.keyPrefix}...
                      </code>
                    </td>
                    <td className="p-4 text-sm tabular-nums text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="p-4 text-sm tabular-nums text-muted-foreground">
                      {formatDate(key.lastUsedAt)}
                    </td>
                    <td className="p-4 text-right">
                      <RevokeButton keyId={key.id} keyName={key.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <h3 className="mb-2 text-sm font-semibold">
            Security Best Practices
          </h3>
          <ul className="space-y-1 text-[13px] text-muted-foreground">
            <li>
              API keys are shown only once during creation - copy them
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
