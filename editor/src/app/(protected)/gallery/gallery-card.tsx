'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Film, Star } from 'lucide-react';
import { TEMPLATE_CATEGORIES, type Template } from '@/types/template';

interface GalleryCardProps {
  template: Pick<
    Template,
    | 'id'
    | 'name'
    | 'description'
    | 'thumbnailUrl'
    | 'mergeFields'
    | 'category'
    | 'tags'
    | 'featured'
  >;
}

export function GalleryCard({ template }: GalleryCardProps) {
  const mergeFieldCount = template.mergeFields.length;
  const maxVisibleTags = 3;
  const visibleTags = template.tags.slice(0, maxVisibleTags);
  const remainingTagCount = template.tags.length - maxVisibleTags;

  return (
    <Link
      href={`/templates/${template.id}`}
      className="group block bg-card border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/30 cursor-pointer"
    >
      {/* Thumbnail section */}
      <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
        {template.thumbnailUrl ? (
          <Image
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-cover"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <Film className="size-12 text-muted-foreground/30" />
        )}

        {/* Featured badge */}
        {template.featured && (
          <div className="absolute top-2 right-2 bg-yellow-500/90 text-yellow-950 rounded-full p-1.5">
            <Star className="size-3 fill-current" />
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-4 space-y-2">
        {/* Template name */}
        <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {template.name}
        </h3>

        {/* Metadata badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Merge field count */}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
            {mergeFieldCount} {mergeFieldCount === 1 ? 'field' : 'fields'}
          </span>

          {/* Category badge */}
          {template.category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
              {TEMPLATE_CATEGORIES[template.category]}
            </span>
          )}
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-background border border-border text-foreground/70"
              >
                {tag}
              </span>
            ))}
            {remainingTagCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                +{remainingTagCount} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
