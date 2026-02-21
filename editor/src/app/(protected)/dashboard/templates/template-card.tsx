'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, FileSpreadsheet, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TEMPLATE_CATEGORIES } from '@/types/template';
import type { getTemplates } from './actions';
import { DeleteButton } from './delete-button';

interface TemplateCardProps {
  template: Awaited<ReturnType<typeof getTemplates>>[number];
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter();

  const mergeFieldCount = Array.isArray(template.mergeFields)
    ? template.mergeFields.length
    : 0;

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200 hover:border-white/[0.13] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/10"
      onClick={() => router.push(`/editor?templateId=${template.id}`)}
    >
      {/* Thumbnail — 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-[oklch(0.18_0.008_285)]">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Layers className="size-10 text-muted-foreground/20" />
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <h3 className="truncate text-[14px] font-medium text-foreground">
          {template.name}
        </h3>

        {/* Badges */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {mergeFieldCount} {mergeFieldCount === 1 ? 'field' : 'fields'}
          </span>
          {template.category && (
            <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground/60">
              {TEMPLATE_CATEGORIES[template.category]}
            </span>
          )}
        </div>

        {/* Footer row */}
        <div
          className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] text-muted-foreground/50">
            {formatRelativeTime(template.updatedAt)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0 text-muted-foreground/40 hover:text-muted-foreground"
              title="API Reference & Test Render"
              aria-label="API Reference & Test Render"
              onClick={() => router.push(`/dashboard/templates/${template.id}`)}
            >
              <Code2 className="size-3.5" />
            </Button>
            <Link
              href={`/dashboard/bulk-generate?templateId=${template.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 text-muted-foreground/40 hover:text-muted-foreground"
                title="Bulk Generate"
                aria-label="Bulk Generate"
              >
                <FileSpreadsheet className="size-3.5" />
              </Button>
            </Link>
            <DeleteButton
              templateId={template.id}
              templateName={template.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
