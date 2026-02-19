'use client';

import Link from 'next/link';
import { Layers, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TEMPLATE_CATEGORIES } from '@/types/template';
import type { getTemplates } from './actions';
import { DeleteButton } from './delete-button';

interface TemplateCardProps {
  template: Awaited<ReturnType<typeof getTemplates>>[number];
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Updated just now';
  if (diffMins < 60) return `Updated ${diffMins}m ago`;
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  if (diffDays < 7) return `Updated ${diffDays}d ago`;

  return `Updated ${new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const mergeFieldCount = Array.isArray(template.mergeFields)
    ? template.mergeFields.length
    : 0;

  return (
    <Link href={`/?templateId=${template.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg">
        {/* Thumbnail area - 16:9 aspect ratio */}
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {template.thumbnailUrl ? (
            <img
              src={template.thumbnailUrl}
              alt={template.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Layers className="size-12 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Card content */}
        <CardContent className="space-y-3 p-4">
          {/* Template name */}
          <h3 className="truncate font-medium text-foreground">
            {template.name}
          </h3>

          {/* Badges row */}
          <div className="flex items-center gap-2">
            {/* Merge field count badge */}
            <div className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {mergeFieldCount} {mergeFieldCount === 1 ? 'field' : 'fields'}
            </div>

            {/* Category badge if present */}
            {template.category && (
              <div className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {TEMPLATE_CATEGORIES[template.category]}
              </div>
            )}
          </div>

          {/* Last updated time and action buttons */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(template.updatedAt)}
            </p>
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.preventDefault()}
            >
              <Link href={`/dashboard/bulk-generate?templateId=${template.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  title="Bulk Generate"
                >
                  <FileSpreadsheet className="size-4" />
                </Button>
              </Link>
              <DeleteButton
                templateId={template.id}
                templateName={template.name}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
