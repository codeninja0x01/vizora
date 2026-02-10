'use client';

import type { SubtitlePreset } from '@/lib/ai/presets/subtitle-presets';
import { cn } from '@/lib/utils';

interface SubtitlePresetCardProps {
  preset: SubtitlePreset;
  selected: boolean;
  onClick: () => void;
}

// Helper: compute text style from preset
function getTextStyle(preset: SubtitlePreset, isActive = false) {
  return {
    fontFamily: preset.style.fontFamily,
    fontWeight: preset.style.fontWeight,
    fontSize: '20px',
    color: isActive
      ? preset.colors.activeFill || preset.colors.active
      : preset.style.color,
    textShadow: preset.style.shadow
      ? `${preset.style.shadow.offsetX}px ${preset.style.shadow.offsetY}px ${preset.style.shadow.blur}px ${preset.style.shadow.color}`
      : undefined,
    WebkitTextStroke: preset.style.stroke
      ? `${preset.style.stroke.width}px ${preset.style.stroke.color}`
      : undefined,
  };
}

export function SubtitlePresetCard({
  preset,
  selected,
  onClick,
}: SubtitlePresetCardProps) {
  const positionIconMap = {
    top: '↑',
    center: '•',
    bottom: '↓',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative cursor-pointer rounded-lg border bg-card p-3 transition-all hover:border-muted-foreground/50',
        selected && 'ring-2 ring-primary border-primary'
      )}
    >
      {/* Header with name and mode badge */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm truncate">{preset.name}</h3>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            preset.mode === 'karaoke'
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-blue-500/20 text-blue-300'
          )}
        >
          {preset.mode === 'karaoke' ? 'Karaoke' : 'Phrase'}
        </span>
      </div>

      {/* Visual sample */}
      <div
        className="relative rounded bg-zinc-900 flex items-center justify-center mb-2 overflow-hidden"
        style={{ height: '60px' }}
      >
        {/* Background if specified */}
        {preset.style.background && (
          <div
            className="absolute inset-0"
            style={{ background: preset.style.background }}
          />
        )}

        {/* Sample text */}
        <div className="relative flex gap-2 items-center">
          {preset.mode === 'karaoke' ? (
            <>
              <span style={getTextStyle(preset, true)}>Hello</span>
              <span style={getTextStyle(preset, false)}>World</span>
            </>
          ) : (
            <span style={getTextStyle(preset, false)}>Hello World</span>
          )}
        </div>
      </div>

      {/* Position indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{preset.description.split('-')[0].trim()}</span>
        <span className="text-base">{positionIconMap[preset.position]}</span>
      </div>
    </div>
  );
}
