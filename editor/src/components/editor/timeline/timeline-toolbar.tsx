import { usePlaybackStore } from '@/stores/playback-store';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Magnet,
  ZoomOut,
  ZoomIn,
  Copy,
  Trash2,
  Scissors,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { DEFAULT_FPS } from '@/stores/project-store';
import { formatTimeCode } from '@/lib/time';
import { EditableTimecode } from '@/components/ui/editable-timecode';

export function TimelineToolbar({
  zoomLevel,
  setZoomLevel,
  onDelete,
  onDuplicate,
  onSplit,
}: {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSplit?: () => void;
}) {
  const { currentTime, duration, isPlaying, toggle, seek } = usePlaybackStore();

  const handleZoomIn = () => {
    setZoomLevel(Math.min(3.5, zoomLevel + 0.15));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(0.15, zoomLevel - 0.15));
  };

  const handleZoomSliderChange = (values: number[]) => {
    setZoomLevel(values[0]);
  };

  return (
    <div className="flex items-center justify-between px-2 py-1 h-10 bg-[var(--panel-background)] border-b border-white/5">
      <TooltipProvider delayDuration={300}>
        {/* Left section - Edit tools */}
        <div className="flex items-center gap-0.5 bg-white/5 rounded-md p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onSplit}>
                <Scissors className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split element (Ctrl+S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onDuplicate}>
                <Copy className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate element (Ctrl+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete element (Delete)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Magnet className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Auto snapping</TooltipContent>
          </Tooltip>
        </div>

        {/* Center section - Playback controls */}
        <div className="flex items-center gap-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-7"
                variant="ghost"
                size="icon"
                onClick={() => seek(0)}
              >
                <SkipBack className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Return to Start (Home / Enter)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="size-9 bg-white/10 rounded-full hover:bg-white/15"
              >
                {isPlaying ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="size-5 fill-current" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-7"
                variant="ghost"
                size="icon"
                onClick={() => seek(duration)}
              >
                <SkipForward className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Skip to End</TooltipContent>
          </Tooltip>

          {/* Time Display */}
          <div className="flex flex-row items-center justify-center px-2">
            <EditableTimecode
              time={currentTime}
              duration={duration}
              format="MM:SS"
              fps={DEFAULT_FPS}
              onTimeChange={seek}
              className="text-center"
            />
            <div className="text-xs text-muted-foreground px-2">/</div>
            <div className="text-xs text-muted-foreground text-center">
              {formatTimeCode(duration, 'MM:SS')}
            </div>
          </div>
        </div>

        {/* Right section - Zoom controls */}
        <div className="flex items-center gap-0.5 bg-white/5 rounded-md p-0.5">
          <Button variant="ghost" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="size-4" />
          </Button>
          <Slider
            className="w-24"
            value={[zoomLevel]}
            onValueChange={handleZoomSliderChange}
            min={0.15}
            max={3.5}
            step={0.15}
          />
          <Button variant="ghost" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="size-4" />
          </Button>
        </div>
      </TooltipProvider>
    </div>
  );
}
