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

const styleConfig: Record<
  string,
  { gradient: string; accent: string; emoji: string }
> = {
  corporate: {
    gradient:
      'linear-gradient(135deg, oklch(0.65 0.18 250 / 0.35) 0%, transparent 70%)',
    accent: '#3B82F6',
    emoji: '🏢',
  },
  'social-media': {
    gradient:
      'linear-gradient(135deg, oklch(0.65 0.18 340 / 0.35) 0%, oklch(0.60 0.24 285 / 0.2) 70%)',
    accent: '#EC4899',
    emoji: '📱',
  },
  cinematic: {
    gradient:
      'linear-gradient(135deg, oklch(0.45 0.04 250 / 0.5) 0%, transparent 70%)',
    accent: '#94A3B8',
    emoji: '🎬',
  },
  tutorial: {
    gradient:
      'linear-gradient(135deg, oklch(0.65 0.18 155 / 0.35) 0%, transparent 70%)',
    accent: 'oklch(0.65 0.18 155)',
    emoji: '📚',
  },
  energetic: {
    gradient:
      'linear-gradient(135deg, oklch(0.7 0.18 55 / 0.35) 0%, oklch(0.65 0.2 25 / 0.2) 70%)',
    accent: '#F97316',
    emoji: '⚡',
  },
  elegant: {
    gradient:
      'linear-gradient(135deg, oklch(0.60 0.24 285 / 0.35) 0%, oklch(0.55 0.18 320 / 0.2) 70%)',
    accent: 'oklch(0.60 0.24 285)',
    emoji: '✨',
  },
};

const pacingDot: Record<string, string> = {
  slow: 'oklch(0.65 0.18 250)',
  medium: 'oklch(0.75 0.16 85)',
  fast: 'oklch(0.65 0.2 25)',
};

export function StylePicker({ selectedId, onSelect }: StylePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {VIDEO_STYLE_PRESETS.map((preset: VideoStylePreset) => {
        const isSelected = preset.id === selectedId;
        const config = styleConfig[preset.id] ?? {
          gradient:
            'linear-gradient(135deg, oklch(0.5 0 0 / 0.3) 0%, transparent 70%)',
          accent: 'oklch(0.65 0 0)',
          emoji: '🎥',
        };

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.id)}
            className="group relative overflow-hidden rounded-xl border text-left transition-all duration-200"
            style={{
              borderColor: isSelected
                ? `${config.accent}60`
                : 'oklch(1 0 0 / 0.07)',
              boxShadow: isSelected
                ? `0 0 0 1px ${config.accent}30, 0 4px 24px ${config.accent}15`
                : 'none',
              backgroundColor: 'oklch(1 0 0 / 0.025)',
            }}
          >
            {/* Mood gradient header */}
            <div
              className="relative flex h-[52px] items-end justify-between px-3.5 pb-2.5"
              style={{ background: config.gradient }}
            >
              <span className="text-[22px] leading-none">{config.emoji}</span>
              {isSelected && (
                <div
                  className="flex size-[18px] items-center justify-center rounded-full"
                  style={{ backgroundColor: config.accent }}
                >
                  <Check className="size-3 text-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-3.5 pb-3.5 pt-2.5">
              <h3
                className="font-heading text-[13px] font-semibold tracking-tight transition-colors"
                style={{
                  color: isSelected ? config.accent : 'oklch(0.93 0 0)',
                }}
              >
                {preset.name}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/55">
                {preset.description}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: pacingDot[preset.pacing] }}
                />
                <span className="text-[10px] font-medium capitalize text-muted-foreground/50">
                  {preset.pacing} pacing
                </span>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-[10px] font-medium capitalize text-muted-foreground/50">
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
