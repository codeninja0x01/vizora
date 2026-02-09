'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStudioStore } from '@/stores/studio-store';
import { useTemplateStore } from '@/stores/template-store';
import { createTemplate } from '@/app/(protected)/dashboard/templates/actions';
import { extractMergeFields } from '@/lib/merge-fields';
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '@/types/template';
import { toast } from 'sonner';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
}: SaveTemplateDialogProps) {
  const { studio } = useStudioStore();
  const { markedFields, enterTemplateMode } = useTemplateStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '' as TemplateCategory | '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studio) {
      toast.error('Studio not initialized');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Export project data
      const projectData = studio.exportToJSON() as unknown as Record<
        string,
        unknown
      >;

      // 2. Capture thumbnail from canvas
      const canvas = document.querySelector('canvas');
      let thumbnailUrl = '';

      if (canvas) {
        try {
          thumbnailUrl = canvas.toDataURL('image/png');
        } catch (error) {
          console.warn('Failed to capture canvas thumbnail:', error);
        }
      }

      // 3. Extract merge fields from marked fields
      const mergeFields = extractMergeFields(projectData, markedFields);

      // 4. Call createTemplate server action
      const result = await createTemplate({
        name: formData.name,
        description: formData.description || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        projectData,
        mergeFields,
        category: formData.category || undefined,
        tags: [],
      });

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      // 5. Show success message
      toast.success(`Template "${formData.name}" created successfully`);

      // 6. Enter template mode with the new template ID
      enterTemplateMode(result.template.id, formData.name);

      // 7. Close dialog and reset form
      onOpenChange(false);
      setFormData({ name: '', description: '', category: '' });
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error(
        `Failed to create template: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[var(--panel-background)] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Save as Template
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a reusable template from your current project. Marked merge
            fields will be editable when using this template.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Product Launch Video"
              required
              className="bg-white/5 border-white/10 text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe when and how to use this template..."
              rows={3}
              className="bg-white/5 border-white/10 text-foreground resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-foreground">
              Category (optional)
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  category: value as TemplateCategory,
                })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-foreground">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-white/10">
                {Object.entries(TEMPLATE_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {markedFields.length > 0 && (
            <div className="rounded-md bg-white/5 border border-white/10 p-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {markedFields.length}
                </span>{' '}
                merge field{markedFields.length !== 1 ? 's' : ''} marked
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
