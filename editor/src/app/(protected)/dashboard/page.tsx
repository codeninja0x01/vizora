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

// Status color map for render rows
const statusBarColor: Record<string, string> = {
  queued: 'oklch(0.75 0.16 85)',
  active: '#3B82F6',
  completed: 'oklch(0.65 0.18 155)',
  failed: 'oklch(0.6368 0.2078 25.33)',
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { user } = session;
  const activeOrgId = session.session.activeOrganizationId;
  const firstName = user.name?.trim().split(/\s+/)[0] || 'there';

  const [templateCount, renderCounts, apiKeyCount, recentRenders] =
    await Promise.all([
      prisma.template.count({ where: { userId: user.id } }),
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
            include: { template: { select: { name: true } } },
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
      iconColor: '#3B82F6',
      glowColor: 'oklch(0.65 0.18 250 / 0.15)',
    },
    {
      label: 'Total Renders',
      value: totalRenders,
      icon: Film,
      href: '/dashboard/renders',
      iconColor: 'oklch(0.65 0.18 155)',
      glowColor: 'oklch(0.65 0.18 155 / 0.15)',
    },
    {
      label: 'Active Now',
      value: activeRenders,
      icon: Zap,
      href: '/dashboard/renders?status=rendering',
      iconColor: 'oklch(0.75 0.16 85)',
      glowColor: 'oklch(0.75 0.16 85 / 0.15)',
      pulse: activeRenders > 0,
    },
    {
      label: 'API Keys',
      value: apiKeyCount,
      icon: Key,
      href: '/dashboard/api-keys',
      iconColor: 'oklch(0.65 0.18 320)',
      glowColor: 'oklch(0.65 0.18 320 / 0.15)',
    },
  ];

  const quickActions = [
    {
      label: 'Create Template',
      description: 'Build a new video template in the editor',
      icon: Plus,
      href: '/editor',
      iconBg: 'linear-gradient(135deg, #A855F7, #7C3AED)',
    },
    {
      label: 'Browse Gallery',
      description: 'Discover and clone pre-built templates',
      icon: LayoutGrid,
      href: '/gallery',
      iconBg: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
    },
    {
      label: 'Generate API Key',
      description: 'Create a key for programmatic access',
      icon: Key,
      href: '/dashboard/api-keys',
      iconBg: 'linear-gradient(135deg, #4F46E5, #3730A3)',
    },
  ];

  return (
    <div className="space-y-10">
      {/* ── Hero greeting ──────────────────────────────────────────── */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: 'both' }}
      >
        <h1 className="font-heading text-[2rem] font-bold leading-tight tracking-tight text-foreground lg:text-[2.4rem]">
          {getGreeting()},{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(105deg, #A855F7 0%, #7C3AED 50%, #4F46E5 100%)',
            }}
          >
            {firstName}
          </span>
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground/70">
          Your video creation command center
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.05] animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
            style={{
              animationDelay: `${50 + i * 35}ms`,
              animationFillMode: 'both',
            }}
          >
            {/* Icon — top right */}
            <div
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: stat.glowColor }}
            >
              <stat.icon
                className="size-[18px]"
                style={{ color: stat.iconColor }}
              />
            </div>

            {/* Pulse dot for active renders */}
            {stat.pulse && (
              <span className="absolute right-4 top-[52px]">
                <span className="relative flex size-2">
                  <span
                    className="absolute inline-flex size-full animate-ping rounded-full opacity-75"
                    style={{ backgroundColor: stat.iconColor }}
                  />
                  <span
                    className="relative inline-flex size-2 rounded-full"
                    style={{ backgroundColor: stat.iconColor }}
                  />
                </span>
              </span>
            )}

            {/* Number */}
            <p className="mt-1 font-heading text-4xl font-bold tabular-nums tracking-tight text-foreground">
              {stat.value}
            </p>

            {/* Label row */}
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: stat.iconColor }}
              />
              <p className="text-[12px] font-medium text-muted-foreground/70">
                {stat.label}
              </p>
            </div>

            {/* Hover arrow */}
            <ArrowRight className="absolute bottom-4 right-4 size-3.5 translate-x-1 text-muted-foreground/0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-muted-foreground/40" />
          </Link>
        ))}
      </div>

      {/* ── Bottom section ──────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Recent Renders — 3 cols */}
        <div
          className="rounded-xl border border-white/[0.07] bg-white/[0.02] lg:col-span-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '190ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h2 className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
              Recent Renders
            </h2>
            <Link
              href="/dashboard/renders"
              className="flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              View all
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {recentRenders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                <Film className="size-5 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground/60">
                No renders yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/40">
                Queue a render from a template to see it here
              </p>
            </div>
          ) : (
            <div className="px-2 py-2">
              {(recentRenders as RecentRender[]).map((render) => (
                <Link
                  key={render.id}
                  href="/dashboard/renders"
                  className="group flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                >
                  {/* Status color bar */}
                  <span
                    className="h-5 w-[3px] shrink-0 rounded-full opacity-70"
                    style={{
                      backgroundColor: statusBarColor[render.status] ?? '#666',
                    }}
                  />
                  <RenderStatusBadge status={render.status as RenderStatus} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">
                    {render.template.name}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/50">
                    {formatRelativeTime(render.queuedAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column — 2 cols */}
        <div
          className="space-y-4 lg:col-span-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '230ms', animationFillMode: 'both' }}
        >
          {/* Quick Actions */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
                Quick Actions
              </h2>
            </div>
            <div className="px-2 py-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
                    style={{ background: action.iconBg }}
                  >
                    <action.icon className="size-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight text-foreground">
                      {action.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/60">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="size-3.5 translate-x-0.5 text-muted-foreground/0 transition-all duration-150 group-hover:translate-x-0 group-hover:text-muted-foreground/40" />
                </Link>
              ))}
            </div>
          </div>

          {/* Getting Started */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary/70" />
              <h3 className="text-[13px] font-semibold text-foreground">
                Getting Started
              </h3>
            </div>
            <ol className="space-y-3">
              {[
                'Create an API key for programmatic access',
                'Save a video template with merge fields',
                'Queue renders via API and track progress',
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #A855F7, #4F46E5)',
                      opacity: 0.85,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-muted-foreground/70">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
