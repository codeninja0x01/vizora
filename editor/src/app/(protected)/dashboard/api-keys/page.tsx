import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { KeyRound, Plus } from 'lucide-react';
import { CreateApiKeyDialog } from './create-dialog';
import { RevokeButton } from './revoke-button';

/**
 * Format date to relative time (e.g., "2 days ago") or absolute date
 */
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
  // Get authenticated session
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

  // Get active organization from session
  const activeOrgId = session.session.activeOrganizationId;

  // If no active organization, show message
  if (!activeOrgId) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access to OpenVideo
          </p>
        </div>

        <div className="border-border bg-card text-card-foreground rounded-lg border p-12 text-center">
          <KeyRound className="text-muted-foreground mx-auto mb-4 size-12" />
          <h2 className="mb-2 text-xl font-semibold">
            No Organization Selected
          </h2>
          <p className="text-muted-foreground mb-4">
            Please create or select an organization to manage API keys.
          </p>
        </div>
      </div>
    );
  }

  // Query active API keys for the organization
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
    <div className="mx-auto max-w-5xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access to OpenVideo
          </p>
        </div>
        <CreateApiKeyDialog />
      </div>

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="border-border bg-card text-card-foreground rounded-lg border p-12 text-center">
          <KeyRound className="text-muted-foreground mx-auto mb-4 size-12" />
          <h2 className="mb-2 text-xl font-semibold">No API Keys Yet</h2>
          <p className="text-muted-foreground mb-4">
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
        <div className="border-border rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-border border-b">
                <th className="p-4 text-left text-sm font-medium">Name</th>
                <th className="p-4 text-left text-sm font-medium">Key</th>
                <th className="p-4 text-left text-sm font-medium">Created</th>
                <th className="p-4 text-left text-sm font-medium">Last Used</th>
                <th className="p-4 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr
                  key={key.id}
                  className="border-border hover:bg-white/5 border-b last:border-0 transition-colors"
                >
                  <td className="p-4 font-medium">{key.name}</td>
                  <td className="p-4">
                    <code className="rounded bg-white/5 px-2 py-1 text-xs font-mono">
                      {key.keyPrefix}...
                    </code>
                  </td>
                  <td className="text-muted-foreground p-4 text-sm">
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="text-muted-foreground p-4 text-sm">
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

      {/* Security Notice */}
      <div className="border-border bg-white/5 mt-8 rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">Security Best Practices</h3>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>
            • API keys are shown only once during creation - copy them
            immediately
          </li>
          <li>
            • Store API keys securely and never commit them to version control
          </li>
          <li>• Revoke keys immediately if they are compromised</li>
          <li>
            • Use separate API keys for different applications or environments
          </li>
        </ul>
      </div>
    </div>
  );
}
