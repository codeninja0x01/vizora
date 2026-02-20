'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTemplateStore } from '@/stores/template-store';
import { useStudioStore } from '@/stores/studio-store';
import { updateTemplate } from '@/app/(protected)/dashboard/templates/actions';
import { extractMergeFields } from '@/lib/merge-fields';
import { Layers, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function TemplateBar() {
  const { templateName, templateId, markedFields, exitTemplateMode } =
    useTemplateStore();
  const { studio } = useStudioStore();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleExit = () => {
    exitTemplateMode();
    // Navigate back to templates dashboard
    router.push('/dashboard/templates');
  };

  const handleSave = async () => {
    if (!studio || !templateId) return;

    setIsSaving(true);
    try {
      const projectData = studio.exportToJSON() as unknown as Record<
        string,
        unknown
      >;

      // Capture thumbnail from canvas
      const canvas = document.querySelector('canvas');
      let thumbnailUrl = '';
      if (canvas) {
        try {
          thumbnailUrl = canvas.toDataURL('image/png');
        } catch {
          // ignore canvas security errors
        }
      }

      const mergeFields = extractMergeFields(projectData, markedFields);

      const result = await updateTemplate(templateId, {
        projectData,
        thumbnailUrl: thumbnailUrl || undefined,
        mergeFields,
      });

      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Template saved');
      }
    } catch {
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-8 w-full bg-primary/20 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <Layers className="size-4 text-primary" />
        <span className="font-medium text-foreground">Template Mode</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{templateName}</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="h-6 px-2 text-xs gap-1"
        >
          <Save className="size-3" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="h-6 px-2 text-xs gap-1"
        >
          <X className="size-3" />
          <span>Exit</span>
        </Button>
      </div>
    </div>
  );
}
