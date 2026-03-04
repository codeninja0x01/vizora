'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Layers,
  Film,
  LayoutGrid,
  Key,
  Webhook,
  LogOut,
  Loader2,
  Menu,
  X,
  FileSpreadsheet,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { VizoraLogo } from '@/components/shared/vizora-logo';
import { useRenderEventContext } from '@/components/render/render-event-provider';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

interface DashboardSidebarProps {
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
}

const mainNav = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Overview',
    exact: true,
  },
  { href: '/dashboard/templates', icon: Layers, label: 'Templates' },
  { href: '/dashboard/renders', icon: Film, label: 'Renders', showBadge: true },
  {
    href: '/dashboard/bulk-generate',
    icon: FileSpreadsheet,
    label: 'Bulk Generate',
  },
  {
    href: '/dashboard/text-to-video',
    icon: Sparkles,
    label: 'Text to Video',
  },
  {
    href: '/dashboard/billing',
    icon: CreditCard,
    label: 'Billing',
  },
  { href: '/gallery', icon: LayoutGrid, label: 'Gallery' },
];

const devNav = [
  { href: '/dashboard/api-keys', icon: Key, label: 'API Keys' },
  { href: '/dashboard/webhooks', icon: Webhook, label: 'Webhooks' },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { activeCount } = useRenderEventContext();

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileOpen]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.success('Signed out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to sign out');
      setSigningOut(false);
    }
  };

  const navLink = (item: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    exact?: boolean;
    showBadge?: boolean;
  }) => {
    const active = isActive(item.href, item.exact);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
          active
            ? 'bg-white/[0.07] text-foreground'
            : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground/90'
        }`}
      >
        {/* Active left accent — gradient pill */}
        {active && (
          <span
            className="absolute left-0 top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-r-full"
            style={{
              background:
                'linear-gradient(180deg, #A855F7 0%, #7C3AED 60%, #4F46E5 100%)',
              boxShadow: '0 0 10px oklch(0.60 0.24 285 / 0.45)',
            }}
          />
        )}
        <Icon
          className={`size-[17px] shrink-0 transition-colors ${
            active
              ? 'text-foreground'
              : 'text-muted-foreground/60 group-hover:text-muted-foreground'
          }`}
        />
        <span className="flex-1 leading-none">{item.label}</span>
        {item.showBadge && activeCount > 0 && (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums text-white"
            style={{
              background: 'linear-gradient(135deg, #A855F7, #4F46E5)',
            }}
          >
            {activeCount}
          </span>
        )}
      </Link>
    );
  };

  const initials = (user.name?.[0] || user.email?.[0] || 'U').toUpperCase();

  const sidebarContent = (
    <div className="relative flex h-full flex-col">
      {/* Atmospheric bottom glow */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-48 -translate-x-1/2 opacity-[0.12]"
        style={{
          background:
            'radial-gradient(ellipse, oklch(0.60 0.24 285) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Logo */}
      <div className="flex h-[58px] shrink-0 items-center px-5">
        <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
          <VizoraLogo size="sm" />
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">{mainNav.map(navLink)}</div>

        {/* Developer section */}
        <div
          className="mt-5 pt-4"
          style={{ borderTop: '1px solid oklch(1 0 0 / 0.06)' }}
        >
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
            Developer
          </p>
          <div className="space-y-0.5">{devNav.map(navLink)}</div>
        </div>
      </nav>

      {/* User area */}
      <div className="shrink-0 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.04]">
          {/* Avatar */}
          <div
            className="relative flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold text-white shadow-sm"
            style={{
              background:
                'linear-gradient(135deg, #A855F7 0%, #7C3AED 50%, #4F46E5 100%)',
            }}
          >
            {initials}
          </div>

          {/* Name + email */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-tight text-foreground">
              {user.name || 'User'}
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground/60">
              {user.email}
            </p>
          </div>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-white/[0.06] hover:text-muted-foreground disabled:opacity-40"
            aria-label="Sign out"
          >
            {signingOut ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <LogOut className="size-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed left-4 top-4 z-50 flex size-9 items-center justify-center rounded-lg border border-white/10 bg-card/80 shadow-md backdrop-blur-md transition-colors hover:bg-card/90 lg:hidden"
      >
        <Menu className="size-4 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[260px] flex-col border-r border-white/[0.06] bg-[oklch(0.165_0.008_285)] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-3 top-3.5 flex size-7 items-center justify-center rounded-md text-muted-foreground/50 hover:text-muted-foreground"
            >
              <X className="size-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[oklch(0.155_0.008_285)] lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
