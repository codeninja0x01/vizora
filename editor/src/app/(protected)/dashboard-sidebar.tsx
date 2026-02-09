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
} from 'lucide-react';
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

  // Close mobile menu on Escape key
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
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
        }`}
      >
        {active && (
          <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_8px_oklch(0.60_0.24_285_/_0.5)]" />
        )}
        <Icon
          className={`size-[18px] flex-shrink-0 transition-colors ${
            active
              ? 'text-primary'
              : 'text-muted-foreground/70 group-hover:text-foreground'
          }`}
        />
        <span className="flex-1">{item.label}</span>
        {item.showBadge && activeCount > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
            {activeCount}
          </span>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_12px_oklch(0.60_0.24_285_/_0.3)]">
            <Film className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight font-heading">
            OpenVideo
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 px-3 py-4">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Main
          </p>
          <div className="space-y-0.5">{mainNav.map(navLink)}</div>
        </div>

        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Developer
          </p>
          <div className="space-y-0.5">{devNav.map(navLink)}</div>
        </div>
      </nav>

      {/* User area */}
      <div className="border-t border-border/40 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary ring-1 ring-primary/20">
            {(user.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name || 'User'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-white/[0.04] hover:text-foreground disabled:opacity-50"
            aria-label="Sign out"
          >
            {signingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed left-4 top-4 z-50 flex size-10 items-center justify-center rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-lg transition-colors hover:bg-card lg:hidden"
      >
        <Menu className="size-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[280px] flex-col bg-card shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] flex-shrink-0 flex-col border-r border-border/40 bg-card/30 lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
