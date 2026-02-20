import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { RenderEventProvider } from '@/components/render/render-event-provider';
import { DashboardSidebar } from './dashboard-sidebar';
import { LowCreditBanner } from '@/components/billing/low-credit-banner';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

    await prisma.session.update({
      where: { id: session.session.id },
      data: { activeOrganizationId: orgId },
    });
    session.session.activeOrganizationId = orgId;
  }

  // Fetch billing data for low-credit banner
  const orgBilling = session.session.activeOrganizationId
    ? await prisma.organization.findUnique({
        where: { id: session.session.activeOrganizationId },
        select: { creditBalance: true, monthlyAllotment: true, tier: true },
      })
    : null;

  return (
    <RenderEventProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <DashboardSidebar
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? null,
          }}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10 lg:py-10">
            {orgBilling && (
              <LowCreditBanner
                creditBalance={orgBilling.creditBalance}
                monthlyAllotment={orgBilling.monthlyAllotment}
                tier={orgBilling.tier}
              />
            )}
            {children}
          </div>
        </main>
      </div>
    </RenderEventProvider>
  );
}
