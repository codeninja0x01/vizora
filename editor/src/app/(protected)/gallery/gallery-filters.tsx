'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '@/types/template';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GalleryFiltersProps {
  categories: TemplateCategory[];
  allTags: string[];
  selectedCategory?: string;
  selectedTags?: string[];
}

export function GalleryFilters({
  categories,
  allTags,
  selectedCategory,
  selectedTags = [],
}: GalleryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setCategory = (category: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    router.push(`/gallery?${params.toString()}`);
  };

  const toggleTag = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentTags = params.get('tags')?.split(',').filter(Boolean) || [];

    if (currentTags.includes(tag)) {
      // Remove tag
      const newTags = currentTags.filter((t) => t !== tag);
      if (newTags.length > 0) {
        params.set('tags', newTags.join(','));
      } else {
        params.delete('tags');
      }
    } else {
      // Add tag
      currentTags.push(tag);
      params.set('tags', currentTags.join(','));
    }

    router.push(`/gallery?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/gallery');
  };

  const hasActiveFilters = selectedCategory || selectedTags.length > 0;

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {/* All categories tab */}
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            !selectedCategory
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          All
        </button>

        {/* Individual category tabs */}
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setCategory(category)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              selectedCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {TEMPLATE_CATEGORIES[category]}
          </button>
        ))}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-2"
          >
            <X className="size-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Tag filters (horizontal scrollable) */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <span className="text-sm text-muted-foreground shrink-0">Tags:</span>
          {allTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0',
                  isSelected
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-background border border-border text-foreground/70 hover:border-primary/50'
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
