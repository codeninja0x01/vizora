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
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable video templates with dynamic merge fields
          </p>
        </div>
        <Link href="/">
          <Button>
            <Plus className="mr-2 size-4" />
            Create Template
          </Button>
        </Link>
      </div>

      {/* Templates grid or empty state */}
      {templates.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/50 p-12 text-center">
          <Layers className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">No templates yet</h2>
          <p className="mb-4 text-muted-foreground">
            Create your first template from the editor by clicking File &gt;
            Save as Template.
          </p>
          <Link href="/">
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
  );
}
