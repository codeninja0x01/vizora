import { Suspense } from 'react';
import { getGalleryTemplates } from '@/app/(protected)/dashboard/templates/actions';
import { GalleryCard } from './gallery-card';
import { GalleryFilters } from './gallery-filters';
import { Skeleton } from '@/components/ui/skeleton';
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '@/types/template';

interface GalleryPageProps {
  searchParams: Promise<{
    category?: string;
    tags?: string;
  }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const category = params.category;
  const tags = params.tags ? params.tags.split(',') : undefined;

  // Fetch templates with filters
  const templates = await getGalleryTemplates({
    category,
    tags,
  });

  // Extract all unique tags from templates for filter UI
  const allTags = Array.from(new Set(templates.flatMap((t) => t.tags))).sort();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Template Gallery
          </h1>
          <p className="text-muted-foreground">
            Discover pre-built templates to jumpstart your video projects
          </p>
        </div>

        {/* Filters */}
        <GalleryFilters
          categories={Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[]}
          allTags={allTags}
          selectedCategory={category}
          selectedTags={tags}
        />

        {/* Template grid */}
        <Suspense fallback={<GalleryGridSkeleton />}>
          {templates.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-lg text-muted-foreground">
                No templates found
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or browse all templates
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {templates.map((template) => (
                <GalleryCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}

function GalleryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-video rounded-lg" />
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
