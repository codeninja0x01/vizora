import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  Layers,
  Film,
  Zap,
  Key,
  ArrowRight,
  Plus,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { RenderStatusBadge } from '@/components/render/render-status-badge';

type RenderStatus = 'queued' | 'active' | 'completed' | 'failed';

interface RenderCountGroup {
  status: string;
  _count: number;
}

interface RecentRender {
  id: string;
  status: string;
  queuedAt: Date;
  template: { name: string };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { user } = session;
  const activeOrgId = session.session.activeOrganizationId;

  const [templateCount, renderCounts, apiKeyCount, recentRenders] =
    await Promise.all([
      prisma.template.count({
        where: { userId: user.id },
      }),
      activeOrgId
        ? prisma.render.groupBy({
            by: ['status'],
            where: { organizationId: activeOrgId },
            _count: true,
          })
        : Promise.resolve([]),
      activeOrgId
        ? prisma.apiKey.count({
            where: { organizationId: activeOrgId, revokedAt: null },
          })
        : Promise.resolve(0),
      activeOrgId
        ? prisma.render.findMany({
            where: { organizationId: activeOrgId },
            include: {
              template: { select: { name: true } },
            },
            orderBy: { queuedAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

  const renderCountsTyped = renderCounts as RenderCountGroup[];
  const totalRenders = renderCountsTyped.reduce((sum, r) => sum + r._count, 0);
  const activeRenders =
    renderCountsTyped.find((r) => r.status === 'active')?._count || 0;

  const stats = [
    {
      label: 'Templates',
      value: templateCount,
      icon: Layers,
      href: '/dashboard/templates',
      accent: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Total Renders',
      value: totalRenders,
      icon: Film,
      href: '/dashboard/renders',
      accent: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Active Now',
      value: activeRenders,
      icon: Zap,
      href: '/dashboard/renders?status=rendering',
      accent: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      pulse: activeRenders > 0,
    },
    {
      label: 'API Keys',
      value: apiKeyCount,
      icon: Key,
      href: '/dashboard/api-keys',
      accent: 'from-violet-500 to-violet-600',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-400',
    },
  ];

  const quickActions = [
    {
      label: 'Create Template',
      description: 'Open the editor to build a new template',
      icon: Plus,
      href: '/editor',
    },
    {
      label: 'Browse Gallery',
      description: 'Discover and clone pre-built templates',
      icon: LayoutGrid,
      href: '/gallery',
    },
    {
      label: 'Generate API Key',
      description: 'Create a key for programmatic access',
      icon: Key,
      href: '/dashboard/api-keys',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero greeting */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
        style={{ animationFillMode: 'both' }}
      >
        <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
          {getGreeting()}, {user.name?.trim().split(/\s+/)[0] || 'there'}
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          Your video creation command center
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/40 p-5 transition-all duration-200 hover:border-border/80 hover:bg-card/70 hover:shadow-lg hover:shadow-black/5 animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
            style={{
              animationDelay: `${40 + i * 30}ms`,
              animationFillMode: 'both',
            }}
          >
            {/* Top accent gradient */}
            <div
              className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${stat.accent} opacity-80`}
            />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground font-heading">
                  {stat.value}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${stat.iconBg}`}
              >
                <stat.icon className={`size-5 ${stat.iconColor}`} />
              </div>
            </div>

            {/* Pulse indicator for active renders */}
            {stat.pulse && (
              <div className="absolute right-3 top-3">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                </span>
              </div>
            )}

            {/* Hover arrow */}
            <ArrowRight className="absolute bottom-4 right-4 size-4 translate-x-1 text-muted-foreground/0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-muted-foreground/50" />
          </Link>
        ))}
      </div>

      {/* Bottom section: Recent Renders + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Renders */}
        <div
          className="rounded-xl border border-border/50 bg-card/40 p-6 lg:col-span-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          style={{ animationDelay: '160ms', animationFillMode: 'both' }}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight font-heading text-foreground">
              Recent Renders
            </h2>
            <Link
              href="/dashboard/renders"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {recentRenders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted/50">
                <Film className="size-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No renders yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Queue a render from a template to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {(recentRenders as RecentRender[]).map((render) => (
                <Link
                  key={render.id}
                  href="/dashboard/renders"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                >
                  <RenderStatusBadge status={render.status as RenderStatus} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {render.template.name}
                  </span>
                  <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground/70">
                    {formatRelativeTime(render.queuedAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Quick Actions + Getting Started */}
        <div
          className="space-y-5 lg:col-span-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          style={{ animationDelay: '200ms', animationFillMode: 'both' }}
        >
          {/* Quick Actions */}
          <div className="rounded-xl border border-border/50 bg-card/40 p-6">
            <h2 className="mb-4 text-lg font-semibold tracking-tight font-heading text-foreground">
              Quick Actions
            </h2>
            <div className="space-y-1.5">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-lg p-3 transition-all duration-150 hover:bg-white/[0.04]"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <action.icon className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {action.label}
                    </p>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="size-4 translate-x-1 text-muted-foreground/0 transition-all duration-150 group-hover:translate-x-0 group-hover:text-muted-foreground/50" />
                </Link>
              ))}
            </div>
          </div>

          {/* Getting Started */}
          <div className="rounded-xl border border-dashed border-border/50 bg-card/20 p-6">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Getting Started
              </h3>
            </div>
            <ol className="space-y-2.5 text-[13px] text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  1
                </span>
                <span>Create an API key for programmatic access</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  2
                </span>
                <span>Save a video template with merge fields</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  3
                </span>
                <span>Queue renders via API and track progress</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
