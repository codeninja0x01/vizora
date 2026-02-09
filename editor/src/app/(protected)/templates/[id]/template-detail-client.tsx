'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MergeFieldForm } from '@/components/merge-field-form';
import { TemplatePreviewPlayer } from '@/components/template-preview-player';
import { applyMergeData } from '@/lib/merge-fields';
import type { Template } from '@/types/template';
import { Copy, Edit, Loader2 } from 'lucide-react';
import { cloneTemplate } from './clone-action';
import { toast } from 'sonner';

interface TemplateDetailClientProps {
  template: Template;
}

export function TemplateDetailClient({ template }: TemplateDetailClientProps) {
  const router = useRouter();
  const [previewProjectData, setPreviewProjectData] = useState<
    Record<string, unknown>
  >(template.projectData);
  const [isCloning, setIsCloning] = useState(false);

  // Handle merge field form changes
  const handleMergeDataChange = useCallback(
    (mergeData: Record<string, unknown>) => {
      // Apply merge data to get updated project data
      const updatedProjectData = applyMergeData(
        template.projectData,
        template.mergeFields,
        mergeData
      );

      setPreviewProjectData(updatedProjectData);
    },
    [template.projectData, template.mergeFields]
  );

  // Handle template cloning
  const handleClone = useCallback(async () => {
    setIsCloning(true);

    try {
      const result = await cloneTemplate(template.id);

      // Show success toast
      toast.success('Template cloned! Customize it in the editor.');

      // Redirect to editor with the cloned template
      router.push(`/?templateId=${result.id}`);
    } catch (error) {
      // Show error toast
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to clone template. Please try again.'
      );
      setIsCloning(false);
    }
  }, [template.id, router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">
                {template.name}
              </h1>
              {template.description && (
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/gallery">Back to Gallery</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content - side by side layout */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-6">
          {/* Left panel: Merge field form */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Customize Template
              </h2>
              <MergeFieldForm
                mergeFields={template.mergeFields}
                onChange={handleMergeDataChange}
              />
            </div>

            {/* Action buttons */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <h3 className="text-sm font-medium text-foreground mb-3">
                Actions
              </h3>

              <Button
                className="w-full"
                size="lg"
                onClick={handleClone}
                disabled={isCloning}
              >
                {isCloning ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <Copy className="size-4 mr-2" />
                    Clone to My Templates
                  </>
                )}
              </Button>

              <Button variant="outline" className="w-full" size="lg" asChild>
                <Link href={`/?templateId=${template.id}`}>
                  <Edit className="size-4 mr-2" />
                  Edit in Editor
                </Link>
              </Button>

              <p className="text-xs text-muted-foreground">
                Clone this template to customize and use it in your projects.
              </p>
            </div>
          </div>

          {/* Right panel: Video preview */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Preview
              </h2>
              <TemplatePreviewPlayer
                projectData={previewProjectData}
                key={JSON.stringify(previewProjectData)} // Force re-render on data change
              />
            </div>

            {/* Template info */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                Template Info
              </h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Merge Fields:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {template.mergeFields.length}
                  </span>
                </div>

                {template.category && (
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {template.category}
                    </span>
                  </div>
                )}
              </div>

              {template.tags.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Tags:</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-background border border-border text-foreground/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
