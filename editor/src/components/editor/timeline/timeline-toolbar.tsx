import { usePlaybackStore } from '@/stores/playback-store';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Magnet, ZoomOut, ZoomIn, Copy, Trash2, Scissors } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { DEFAULT_FPS } from '@/stores/project-store';
import { formatTimeCode } from '@/lib/time';
import { EditableTimecode } from '@/components/ui/editable-timecode';

import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from '@tabler/icons-react';

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
    <div className="flex items-center justify-between px-2 border-b h-9 bg-[#0c0c0e]">
      {/* Left: Edit tools */}
      <div className="flex items-center gap-0.5">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSplit}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Scissors className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split (Ctrl+S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDuplicate}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate (Ctrl+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete (Del)</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border/50 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Magnet className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Snapping</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Center: Transport controls + timecode */}
      <div className="flex items-center gap-0">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => seek(0)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <IconPlayerSkipBack className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to Start (Home)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className={`h-8 w-8 transition-colors ${
                  isPlaying
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                    : 'text-foreground hover:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                {isPlaying ? (
                  <IconPlayerPauseFilled className="size-[18px]" />
                ) : (
                  <IconPlayerPlayFilled className="size-[18px]" />
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
                variant="ghost"
                size="icon"
                onClick={() => seek(duration)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <IconPlayerSkipForward className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to End</TooltipContent>
          </Tooltip>

          {/* Timecode display */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 ml-1 rounded bg-[#111114] border border-border/40">
            <EditableTimecode
              time={currentTime}
              duration={duration}
              format="MM:SS"
              fps={DEFAULT_FPS}
              onTimeChange={seek}
              className="font-mono tabular-nums text-[11px] text-foreground/90 tracking-wide"
            />
            <span className="font-mono text-[11px] text-muted-foreground/40">
              /
            </span>
            <span className="font-mono tabular-nums text-[11px] text-muted-foreground/60 tracking-wide">
              {formatTimeCode(duration, 'MM:SS')}
            </span>
          </div>
        </TooltipProvider>
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Slider
          className="w-20"
          value={[zoomLevel]}
          onValueChange={handleZoomSliderChange}
          min={0.15}
          max={3.5}
          step={0.15}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
