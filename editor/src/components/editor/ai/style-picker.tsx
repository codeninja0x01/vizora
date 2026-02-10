'use client';

import {
  VIDEO_STYLE_PRESETS,
  type VideoStylePreset,
} from '@/lib/ai/presets/video-style-presets';
import { Check } from 'lucide-react';

interface StylePickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

const pacingColors = {
  slow: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-amber-500/20 text-amber-400',
  fast: 'bg-red-500/20 text-red-400',
};

const styleAccents = {
  corporate: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20',
  'social-media': 'bg-gradient-to-r from-pink-500/20 to-purple-600/20',
  cinematic: 'bg-gradient-to-r from-slate-500/20 to-slate-600/20',
  tutorial: 'bg-gradient-to-r from-green-500/20 to-emerald-600/20',
  energetic: 'bg-gradient-to-r from-orange-500/20 to-red-600/20',
  elegant: 'bg-gradient-to-r from-purple-500/20 to-indigo-600/20',
};

export function StylePicker({ selectedId, onSelect }: StylePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {VIDEO_STYLE_PRESETS.map((preset: VideoStylePreset) => {
        const isSelected = preset.id === selectedId;
        const accentClass =
          styleAccents[preset.id as keyof typeof styleAccents] ||
          'bg-gradient-to-r from-gray-500/20 to-gray-600/20';

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.id)}
            className={`group relative overflow-hidden rounded-xl border-2 bg-card p-4 text-left transition-all duration-200 ${
              isSelected
                ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                : 'border-border/50 hover:border-muted-foreground/50 hover:shadow-md'
            }`}
          >
            {/* Top accent bar */}
            <div className={`absolute inset-x-0 top-0 h-1.5 ${accentClass}`} />

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary">
                <Check className="size-4 text-primary-foreground" />
              </div>
            )}

            <div className="space-y-2.5">
              {/* Title */}
              <h3
                className={`text-base font-semibold tracking-tight ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
              >
                {preset.name}
              </h3>

              {/* Description */}
              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {preset.description}
              </p>

              {/* Metadata badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    pacingColors[preset.pacing]
                  }`}
                >
                  {preset.pacing}
                </span>
                <span className="inline-flex items-center rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {preset.transitionType}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
