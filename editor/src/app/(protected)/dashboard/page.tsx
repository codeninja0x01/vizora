import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Key, Video } from 'lucide-react';

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Session is guaranteed to exist due to layout validation
  // but TypeScript doesn't know that, so we check again
  if (!session) {
    return null;
  }

  const { user } = session;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user.name || 'there'}!
        </h1>
        <p className="text-muted-foreground">
          Manage your video projects and API access from your dashboard.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Video className="size-5 text-primary" />
              </div>
              <span>Account Info</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm text-foreground">{user.email}</p>
            </div>
            {user.name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Name
                </p>
                <p className="text-sm text-foreground">{user.name}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Email Verified
              </p>
              <p className="text-sm text-foreground">
                {user.emailVerified ? 'Yes' : 'No'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Link href="/dashboard/api-keys" className="block">
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <Key className="size-5 text-primary" />
                </div>
                <span>API Keys</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage your API keys for programmatic access to OpenVideo
                services
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Quick Start
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Get started by creating an API key to access OpenVideo&apos;s
            programmatic video generation capabilities.
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>
              Navigate to{' '}
              <Link
                href="/dashboard/api-keys"
                className="font-medium text-primary hover:underline"
              >
                API Keys
              </Link>{' '}
              to create your first API key
            </li>
            <li>
              Use the API key to authenticate your requests to the OpenVideo API
            </li>
            <li>Start creating and rendering videos programmatically</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
