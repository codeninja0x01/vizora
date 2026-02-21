import Link from 'next/link';
import { Layers, Plus } from 'lucide-react';
import { getTemplates } from './actions';
import { TemplateCard } from './template-card';

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="flex items-start justify-between animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: 'both' }}
      >
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            My Templates
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground/70">
            Create and manage reusable video templates with dynamic merge fields
          </p>
        </div>
        <Link href="/editor">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background:
                'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
            }}
          >
            <Plus className="size-4" />
            Create Template
          </button>
        </Link>
      </div>

      {/* Templates grid or empty state */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        {templates.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-14 text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <Layers className="size-6 text-muted-foreground/30" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              No templates yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground/60">
              Create your first template from the editor by clicking File &gt;
              Save as Template.
            </p>
            <Link href="/editor">
              <button
                type="button"
                className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  background:
                    'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
                }}
              >
                <Plus className="size-4" />
                Go to Editor
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template, i) => (
              <div
                key={template.id}
                className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                style={{
                  animationDelay: `${i * 40}ms`,
                  animationFillMode: 'both',
                }}
              >
                <TemplateCard template={template} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
