'use client';

import { TEMPLATE_STYLE_PRESETS } from '@/lib/ai/presets/template-style-presets';
import { cn } from '@/lib/utils';

interface TemplateStylePickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
}

export function TemplateStylePicker({
  selectedId,
  onSelect,
  compact = false,
}: TemplateStylePickerProps) {
  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 px-4">
        {TEMPLATE_STYLE_PRESETS.map((preset) => {
          const isSelected = selectedId === preset.id;
          return (
            <button
              type="button"
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className={cn(
                'flex-shrink-0 w-32 p-2 rounded-md border transition-all',
                'hover:border-muted-foreground/50',
                isSelected
                  ? 'ring-2 ring-primary bg-primary/5 border-primary'
                  : 'border-border bg-background'
              )}
            >
              <div className="space-y-1.5">
                <div className="font-semibold text-xs">{preset.name}</div>
                <div className="flex gap-1 justify-center">
                  {preset.colorPalette.slice(0, 5).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {preset.aspectRatio}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {TEMPLATE_STYLE_PRESETS.map((preset) => {
        const isSelected = selectedId === preset.id;
        return (
          <button
            type="button"
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={cn(
              'p-3 rounded-lg border transition-all text-left',
              'hover:border-muted-foreground/50',
              isSelected
                ? 'ring-2 ring-primary bg-primary/5 border-primary'
                : 'border-border bg-background'
            )}
          >
            <div className="space-y-2">
              <div className="font-semibold text-sm">{preset.name}</div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {preset.description}
              </p>
              <div className="flex gap-1.5">
                {preset.colorPalette.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                  {preset.mood.split(',')[0]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {preset.aspectRatio}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
