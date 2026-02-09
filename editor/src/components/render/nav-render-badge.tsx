'use client';

import Link from 'next/link';
import { useRenderEventContext } from './render-event-provider';

export function NavRenderBadge() {
  const { activeCount } = useRenderEventContext();

  return (
    <Link
      href="/dashboard/renders"
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      Renders
      {activeCount > 0 && (
        <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-medium text-primary">
          {activeCount}
        </span>
      )}
    </Link>
  );
}
