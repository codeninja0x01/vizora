'use client';

import { useEffect, useState } from 'react';
import type { MergeField } from '@/types/template';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface MergeFieldFormProps {
  mergeFields: MergeField[];
  onChange: (mergeData: Record<string, unknown>) => void;
}

// Convert merge field key to display name
// Example: "text_abc_fontSize" -> "Font Size"
function getFieldDisplayName(key: string): string {
  const parts = key.split('_');
  const lastPart = parts[parts.length - 1];

  // Convert camelCase to Title Case
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function MergeFieldForm({ mergeFields, onChange }: MergeFieldFormProps) {
  // Initialize form state with default values
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const initialData: Record<string, unknown> = {};
    for (const field of mergeFields) {
      initialData[field.key] = field.defaultValue;
    }
    return initialData;
  });

  // Call onChange when form data changes
  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const handleInputChange = (key: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (mergeFields.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        This template has no customizable fields.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mergeFields.map((field) => {
        const displayName = getFieldDisplayName(field.key);
        const currentValue = formData[field.key];

        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{displayName}</Label>

            {field.fieldType === 'text' && (
              <Input
                id={field.key}
                type="text"
                value={String(currentValue || '')}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                className="w-full"
              />
            )}

            {field.fieldType === 'url' && (
              <Input
                id={field.key}
                type="text"
                placeholder="https://example.com/image.jpg"
                value={String(currentValue || '')}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                className="w-full"
              />
            )}

            {field.fieldType === 'number' && (
              <Input
                id={field.key}
                type="number"
                step="any"
                value={Number(currentValue || 0)}
                onChange={(e) =>
                  handleInputChange(field.key, Number(e.target.value))
                }
                className="w-full"
              />
            )}

            {field.fieldType === 'color' && (
              <div className="flex gap-2">
                <input
                  id={field.key}
                  type="color"
                  value={String(currentValue || '#000000')}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="h-9 w-16 cursor-pointer rounded border border-input"
                />
                <Input
                  type="text"
                  value={String(currentValue || '#000000')}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
