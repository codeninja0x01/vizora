'use client';

import { GripVertical, X } from 'lucide-react';
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

export function SceneEditor({
  scene,
  index,
  onUpdate,
  onRemove,
  clipPreview,
  canRemove = true,
}: SceneEditorProps) {
  const descId = `scene-${scene.id}-desc`;
  const durationId = `scene-${scene.id}-duration`;
  const overlayId = `scene-${scene.id}-overlay`;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="size-4 text-muted-foreground" />
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Scene {index + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          aria-label="Remove scene"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Description textarea */}
        <div>
          <label
            htmlFor={descId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Description
          </label>
          <textarea
            id={descId}
            value={scene.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Describe what happens in this scene..."
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Duration input */}
        <div>
          <label
            htmlFor={durationId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Duration
          </label>
          <div className="flex items-center gap-2">
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
              className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">seconds</span>
          </div>
        </div>

        {/* Text overlay input */}
        <div>
          <label
            htmlFor={overlayId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Text Overlay (Optional)
          </label>
          <input
            id={overlayId}
            type="text"
            value={scene.textOverlay}
            onChange={(e) => onUpdate({ textOverlay: e.target.value })}
            placeholder="Text to display on screen"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Clip preview */}
        {clipPreview && (
          <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Selected Clip
            </p>
            <div className="flex items-center gap-3">
              {/* biome-ignore lint/performance/noImgElement: External stock footage URLs not compatible with Next.js Image */}
              <img
                src={clipPreview.thumbnailUrl || clipPreview.previewUrl}
                alt="Clip preview"
                className="size-16 rounded object-cover"
              />
              <div className="flex-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {clipPreview.provider}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {clipPreview.duration}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
