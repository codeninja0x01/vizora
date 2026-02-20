import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Layers } from 'lucide-react';
import { getTemplateById } from '../actions';
import { TemplateApiPage } from './template-api-page';
import type { MergeField } from '@/types/template';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TemplatePage({ params }: Props) {
  const { id } = await params;
  const template = await getTemplateById(id).catch(() => null);

  if (!template) {
    notFound();
  }

  const mergeFieldCount = Array.isArray(template.mergeFields)
    ? (template.mergeFields as MergeField[]).length
    : 0;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-3 duration-300"
        style={{ animationFillMode: 'both' }}
      >
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <Link
            href="/dashboard/templates"
            className="transition-colors hover:text-foreground"
          >
            Templates
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground/80">{template.name}</span>
        </nav>

        {/* Title row */}
        <div className="flex items-start gap-4">
          {/* Thumbnail or icon */}
          <div className="mt-0.5 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/30">
            {template.thumbnailUrl ? (
              <img
                src={template.thumbnailUrl}
                alt={template.name}
                className="size-12 object-cover"
              />
            ) : (
              <div className="flex size-12 items-center justify-center">
                <Layers className="size-5 text-muted-foreground/40" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight font-heading">
              {template.name}
            </h1>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="text-xs text-muted-foreground/60">
                {mergeFieldCount} {mergeFieldCount === 1 ? 'field' : 'fields'}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="font-mono text-[10px] text-muted-foreground/40 select-all">
                {template.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-3 duration-300"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        <TemplateApiPage template={template} />
      </div>
    </div>
  );
}
