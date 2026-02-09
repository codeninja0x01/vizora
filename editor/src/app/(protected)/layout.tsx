import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignOutButton } from './sign-out-button';
import Link from 'next/link';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side session validation - the real security boundary
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/login');
  }

  // Auto-create personal organization if user has none
  if (!session.session.activeOrganizationId) {
    const existingMember = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    let orgId: string;
    if (existingMember) {
      orgId = existingMember.organizationId;
    } else {
      const slug = `personal-${session.user.id.slice(0, 8)}`;
      const org = await prisma.organization.create({
        data: {
          name: `${session.user.name || session.user.email}'s Org`,
          slug,
          members: {
            create: { userId: session.user.id, role: 'owner' },
          },
        },
      });
      orgId = org.id;
    }

    // Set as active organization on the session
    await prisma.session.update({
      where: { id: session.session.id },
      data: { activeOrganizationId: orgId },
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link
                href="/dashboard"
                className="text-lg font-bold text-foreground"
              >
                OpenVideo
              </Link>
              <div className="hidden space-x-4 md:flex">
                <Link
                  href="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/api-keys"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  API Keys
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {session.user.name || session.user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
