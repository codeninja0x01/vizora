import Link from 'next/link';
import { Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTemplates } from './actions';
import { TemplateCard } from './template-card';

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="flex items-start justify-between animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationFillMode: 'both' }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            My Templates
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage reusable video templates with dynamic merge fields
          </p>
        </div>
        <Link href="/editor">
          <Button>
            <Plus className="mr-2 size-4" />
            Create Template
          </Button>
        </Link>
      </div>

      {/* Templates grid or empty state */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'both' }}
      >
        {templates.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card/40 p-12 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/50">
              <Layers className="size-7 text-muted-foreground/40" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No templates yet</h2>
            <p className="mb-5 text-muted-foreground">
              Create your first template from the editor by clicking File &gt;
              Save as Template.
            </p>
            <Link href="/editor">
              <Button>
                <Plus className="mr-2 size-4" />
                Go to Editor
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
