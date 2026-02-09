'use client';

import { useStudioStore } from '@/stores/studio-store';
import { useTemplateStore } from '@/stores/template-store';
import { getMergeableProperties, getPropertyValue } from '@/lib/merge-fields';
import { Switch } from '@/components/ui/switch';
import { Tag } from 'lucide-react';

// Group properties by category
const PROPERTY_GROUPS = {
  Content: ['text', 'src'],
  Position: ['left', 'top', 'width', 'height'],
  Style: [
    'style.fontSize',
    'style.fontFamily',
    'style.color',
    'opacity',
    'volume',
  ],
};

// Convert property paths to display names
function getPropertyDisplayName(property: string): string {
  // Handle style.* properties
  if (property.startsWith('style.')) {
    property = property.replace('style.', '');
  }

  // Convert camelCase to Title Case
  return property
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Format property values for display
function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 50) {
      return `${value.substring(0, 47)}...`;
    }
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  return String(value);
}

export function MergeFieldPanel() {
  const { selectedClips } = useStudioStore();
  const { isTemplateMode, toggleMergeField, isFieldMarked } =
    useTemplateStore();

  // Only show when in template mode and a single clip is selected
  if (!isTemplateMode || selectedClips.length !== 1) {
    return null;
  }

  const selectedClip = selectedClips[0];
  const clipType = selectedClip.type;
  const elementId = selectedClip.id;

  // Get mergeable properties for this clip type
  const mergeableProperties = getMergeableProperties(clipType);

  if (mergeableProperties.length === 0) {
    return (
      <div className="p-4 bg-[var(--panel-background)] border-t border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="size-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Merge Fields</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          This clip type does not support merge fields.
        </p>
      </div>
    );
  }

  // Group properties by category
  const groupedProperties: Record<string, string[]> = {};

  for (const property of mergeableProperties) {
    let categoryFound = false;

    for (const [category, properties] of Object.entries(PROPERTY_GROUPS)) {
      if (properties.includes(property)) {
        if (!groupedProperties[category]) {
          groupedProperties[category] = [];
        }
        groupedProperties[category].push(property);
        categoryFound = true;
        break;
      }
    }

    // If no category found, put in "Other"
    if (!categoryFound) {
      if (!groupedProperties.Other) {
        groupedProperties.Other = [];
      }
      groupedProperties.Other.push(property);
    }
  }

  return (
    <div className="bg-[var(--panel-background)] border-t border-white/5">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="size-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Merge Fields</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Toggle properties to make them editable when using this template.
        </p>

        <div className="space-y-4">
          {Object.entries(groupedProperties).map(([category, properties]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                {category}
              </h4>
              <div className="space-y-1">
                {properties.map((property) => {
                  const isMarked = isFieldMarked(elementId, property);
                  const currentValue = getPropertyValue(
                    selectedClip as unknown as Record<string, unknown>,
                    property
                  );

                  return (
                    <div
                      key={property}
                      className="flex items-center justify-between py-2 px-2 rounded hover:bg-white/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">
                            {getPropertyDisplayName(property)}
                          </span>
                          {isMarked && <Tag className="size-3 text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {formatPropertyValue(currentValue)}
                        </div>
                      </div>
                      <Switch
                        checked={isMarked}
                        onCheckedChange={() =>
                          toggleMergeField(elementId, property)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
