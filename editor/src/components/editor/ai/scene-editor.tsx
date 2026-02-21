'use client';

import { X, Clock, Type } from 'lucide-react';
import type { Scene } from '@/stores/storyboard-store';

interface StockClip {
  url: string;
  previewUrl: string;
  thumbnailUrl: string;
  duration: number;
  provider: string;
}

interface SceneEditorProps {
  scene: Scene;
  index: number;
  onUpdate: (updates: Partial<Scene>) => void;
  onRemove: () => void;
  clipPreview?: StockClip | null;
  canRemove?: boolean;
}

const SCENE_ACCENTS = [
  { color: 'oklch(0.60 0.24 285)', bg: 'oklch(0.60 0.24 285 / 0.12)' },
  { color: '#22D3EE', bg: 'oklch(0.8 0.15 200 / 0.12)' },
  { color: '#3B82F6', bg: 'oklch(0.65 0.18 250 / 0.12)' },
  { color: 'oklch(0.65 0.18 155)', bg: 'oklch(0.65 0.18 155 / 0.12)' },
  { color: 'oklch(0.75 0.16 85)', bg: 'oklch(0.75 0.16 85 / 0.12)' },
];

export function SceneEditor({
  scene,
  index,
  onUpdate,
  onRemove,
  clipPreview,
  canRemove = true,
}: SceneEditorProps) {
  const accent = SCENE_ACCENTS[index % SCENE_ACCENTS.length];
  const descId = `scene-${scene.id}-desc`;
  const durationId = `scene-${scene.id}-duration`;
  const overlayId = `scene-${scene.id}-overlay`;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025] transition-colors duration-200 hover:border-white/[0.12]">
      {/* Left accent bar */}
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: accent.color }}
      />

      <div className="pl-5 pr-4 pt-3.5 pb-4">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums"
            style={{ backgroundColor: accent.bg, color: accent.color }}
          >
            {index + 1}
          </span>
          <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40">
            Scene {index + 1}
          </span>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground/30 opacity-0 transition-all duration-150 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              aria-label="Remove scene"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {/* Description */}
          <textarea
            id={descId}
            value={scene.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Describe what happens — what's visible, the mood, the action..."
            rows={2}
            className="w-full resize-none rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 transition-colors focus:border-white/[0.15] focus:outline-none"
          />

          {/* Duration + Text overlay in one compact row */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-1.5 transition-colors focus-within:border-white/[0.15]">
              <Clock className="size-3 shrink-0 text-muted-foreground/30" />
              <input
                id={durationId}
                type="number"
                value={scene.duration}
                onChange={(e) =>
                  onUpdate({ duration: parseFloat(e.target.value) || 1 })
                }
                min={1}
                max={30}
                step={0.5}
                className="w-10 bg-transparent text-sm text-foreground tabular-nums focus:outline-none"
              />
              <span className="text-[11px] text-muted-foreground/40">s</span>
            </div>
            <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-1.5 transition-colors focus-within:border-white/[0.15]">
              <Type className="size-3 shrink-0 text-muted-foreground/30" />
              <input
                id={overlayId}
                type="text"
                value={scene.textOverlay}
                onChange={(e) => onUpdate({ textOverlay: e.target.value })}
                placeholder="Text overlay (optional)"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Clip preview */}
          {clipPreview && (
            <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              {/* biome-ignore lint/performance/noImgElement: External stock footage URLs not compatible with Next.js Image */}
              <img
                src={clipPreview.thumbnailUrl || clipPreview.previewUrl}
                alt="Clip preview"
                className="size-14 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/40">
                  Matched Clip
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: accent.bg, color: accent.color }}
                  >
                    {clipPreview.provider}
                  </span>
                  <span className="text-[11px] text-muted-foreground/50">
                    {clipPreview.duration}s
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
