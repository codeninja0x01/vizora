'use client';

import { useEffect, useRef } from 'react';
import { TIMELINE_CONSTANTS } from '@/components/editor/timeline/timeline-constants';

const RULER_HEIGHT = 24;

interface TimelineRulerProps {
  zoomLevel: number;
  duration: number;
  width: number;
  scrollLeft: number;
}

export function TimelineRuler({
  zoomLevel,
  duration,
  width,
  scrollLeft,
}: TimelineRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI screens
    const dpr = window.devicePixelRatio || 1;
    // Set display size (css pixels)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${RULER_HEIGHT}px`;

    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(RULER_HEIGHT * dpr);

    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, RULER_HEIGHT);

    const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

    // Background for valid duration (slightly elevated from page bg)
    const durationX = duration * pixelsPerSecond;
    if (durationX > 0) {
      // Valid range: subtle dark fill
      ctx.fillStyle = 'rgba(26, 26, 30, 1)';
      const visibleStart = Math.max(0, scrollLeft);
      const visibleEnd = Math.min(scrollLeft + width, durationX);
      if (visibleEnd > visibleStart) {
        ctx.fillRect(
          visibleStart - scrollLeft,
          0,
          visibleEnd - visibleStart,
          RULER_HEIGHT
        );
      }
      // Beyond-duration: darker, receded
      const beyondStart = Math.max(durationX - scrollLeft, 0);
      if (beyondStart < width) {
        ctx.fillStyle = 'rgba(14, 14, 16, 1)';
        ctx.fillRect(beyondStart, 0, width - beyondStart, RULER_HEIGHT);
      }
    }

    // Drawing settings
    ctx.fillStyle = '#71717a'; // zinc-500 — refined, low-contrast labels
    ctx.strokeStyle = '#3f3f46'; // zinc-700 — subtle tick marks
    ctx.lineWidth = 1;
    ctx.font = '10px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Calculate intervals
    // We want main labels (text) to have enough space (min 50px)
    const minTextSpacing = 50;

    // Available intervals: 0.1s, 0.5s, 1s, 2s, 5s, 10s, 15s, 30s, 1m (60s), 2m (120s), 5m (300s)
    const intervalOptions = [0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    let mainInterval = 300; // Default to largest if none fit

    for (const opt of intervalOptions) {
      if (opt * pixelsPerSecond >= minTextSpacing) {
        mainInterval = opt;
        break;
      }
    }

    // Helper to format time
    const formatTime = (seconds: number) => {
      // If interval is sub-second, show decimal
      if (mainInterval < 1) {
        // Avoid long floating point errors
        return `${seconds.toFixed(1)}s`;
      }

      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);

      if (m > 0 && s === 0) {
        return `${m}m`;
      }
      if (m === 0 && s === 0) {
        return '0s';
      }
      return m > 0
        ? `${m}:${s.toString().padStart(2, '0')}`
        : s.toString().padStart(2, '0');
    };

    // Sub ticks
    // We try to find a nice sub-interval
    let subTickCount = 5;
    if (mainInterval === 0.1) subTickCount = 2; // 0.05
    if (mainInterval === 1) subTickCount = 5; // 0.2
    if (mainInterval === 60) subTickCount = 4; // 15s

    let subInterval = mainInterval / subTickCount;
    // Don't let sub-ticks get too crowded (min 5px)
    if (subInterval * pixelsPerSecond < 6) {
      subInterval = mainInterval; // No sub ticks
    }

    // Determine range to draw based on scrollLeft and width
    const startTime =
      Math.floor(scrollLeft / pixelsPerSecond / subInterval) * subInterval;
    const endTime = (scrollLeft + width) / pixelsPerSecond;

    const count = Math.ceil((endTime - startTime) / subInterval) + 1;

    for (let i = 0; i < count; i++) {
      const time = startTime + i * subInterval;
      if (time < 0) continue;

      const x = Math.floor(time * pixelsPerSecond - scrollLeft) + 0.5;

      if (x > width) break;
      if (x < -20) continue; // Skip if far left

      const isBeyondDuration = time > duration + 0.001;

      ctx.beginPath();
      // Check if main interval
      // Use epsilon for float comparison
      const isMain =
        Math.abs(time % mainInterval) < 0.001 ||
        Math.abs((time % mainInterval) - mainInterval) < 0.001;

      if (isMain) {
        // Main Tick — taller, brighter
        ctx.strokeStyle = isBeyondDuration ? '#27272a' : '#52525b';
        ctx.moveTo(x, 16);
        ctx.lineTo(x, 24);

        // Text label — top-aligned with padding
        ctx.fillStyle = isBeyondDuration ? '#3f3f46' : '#71717a';
        const text = formatTime(time);
        ctx.fillText(text, x, 3);
        ctx.strokeStyle = '#3f3f46'; // reset for sub ticks
      } else {
        // Sub Tick — shorter, dimmer
        if (subInterval !== mainInterval) {
          ctx.strokeStyle = isBeyondDuration ? '#1f1f23' : '#27272a';
          ctx.moveTo(x, 20);
          ctx.lineTo(x, 24);
          ctx.strokeStyle = '#3f3f46';
        }
      }
      ctx.stroke();
    }
  }, [zoomLevel, duration, width, scrollLeft]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ height: `${RULER_HEIGHT}px` }}
    />
  );
}
