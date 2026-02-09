'use client';

import { useEffect, useRef, useState } from 'react';
import { Studio } from 'openvideo';
import type { ProjectJSON } from 'openvideo';
import { Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface TemplatePreviewPlayerProps {
  projectData: Record<string, unknown>;
  width?: number;
  height?: number;
}

export function TemplatePreviewPlayer({
  projectData,
  width = 640,
  height = 360,
}: TemplatePreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<Studio | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Get dimensions from project settings if available
  const projectWidth = (projectData.settings as any)?.width || width;
  const projectHeight = (projectData.settings as any)?.height || height;

  // Initialize Studio and load project
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    let studio: Studio | null = null;

    const initializeStudio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create Studio instance with options
        studio = new Studio({
          width: projectWidth,
          height: projectHeight,
          canvas,
          fps: 30,
          bgColor: '#000000',
          interactivity: false, // No interactivity needed for preview
        });
        studioRef.current = studio;

        // Wait for Studio to be ready
        await studio.ready;

        // Load project data
        await studio.loadFromJSON(projectData as unknown as ProjectJSON);

        // Get duration
        const videoDuration = studio.getMaxDuration();
        setDuration(videoDuration);

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Studio:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load template preview'
        );
        setIsLoading(false);
      }
    };

    initializeStudio();

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (studio) {
        studio.destroy();
      }
      studioRef.current = null;
    };
  }, [projectData, projectWidth, projectHeight]);

  // Animation loop for updating current time
  useEffect(() => {
    if (!isPlaying || !studioRef.current) return;

    const updateTime = () => {
      if (studioRef.current) {
        const time = studioRef.current.getCurrentTime();
        setCurrentTime(time);

        // Stop playing when reached end
        if (time >= duration) {
          setIsPlaying(false);
          studioRef.current.pause();
        } else {
          animationFrameRef.current = requestAnimationFrame(updateTime);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, duration]);

  const handlePlayPause = () => {
    if (!studioRef.current) return;

    if (isPlaying) {
      studioRef.current.pause();
      setIsPlaying(false);
    } else {
      studioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (values: number[]) => {
    if (!studioRef.current) return;

    const newTime = values[0];
    studioRef.current.seek(newTime);
    setCurrentTime(newTime);
  };

  // Format time in seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Canvas container */}
      <div
        className="relative bg-black rounded-lg overflow-hidden"
        style={{
          aspectRatio: `${projectWidth} / ${projectHeight}`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={projectWidth}
          height={projectHeight}
          className="w-full h-full"
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-2 text-white">
              <Loader2 className="size-8 animate-spin" />
              <span className="text-sm">Loading preview...</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-2 text-red-400 max-w-md text-center">
              <AlertCircle className="size-8" />
              <span className="text-sm">{error}</span>
              <span className="text-xs text-muted-foreground">
                Note: Some media assets may not be accessible in preview mode.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Playback controls */}
      {!isLoading && !error && (
        <div className="space-y-3">
          {/* Seek slider */}
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration}
            step={0.01}
            className="cursor-pointer"
          />

          {/* Control bar */}
          <div className="flex items-center gap-3">
            {/* Play/Pause button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              className="shrink-0"
            >
              {isPlaying ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>

            {/* Time display */}
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
