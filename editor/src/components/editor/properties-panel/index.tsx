import { useEffect, useState } from 'react';
import { TextProperties } from './text-properties';
import { ImageProperties } from './image-properties';
import { VideoProperties } from './video-properties';
import { AudioProperties } from './audio-properties';
import { CaptionProperties } from './caption-properties';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { IClip } from 'openvideo';
import { EffectProperties } from './effect-properties';
import { TransitionProperties } from './transition-properties';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  ChevronRightIcon,
  MousePointerClickIcon,
  LayersIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertySectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function PropertySection({
  title,
  defaultOpen = true,
  children,
}: PropertySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center gap-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRightIcon
          className={cn(
            'size-3.5 transition-transform duration-150',
            isOpen && 'rotate-90'
          )}
        />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pb-3 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PropertiesPanel({ selectedClips }: { selectedClips: IClip[] }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (selectedClips.length !== 1) return;

    const clip = selectedClips[0];

    const onPropsChange = () => {
      setTick((t) => t + 1);
    };

    clip.on('propsChange', onPropsChange);

    return () => {
      clip.off('propsChange', onPropsChange);
    };
  }, [selectedClips]);

  // Multi-select state
  if (selectedClips.length > 1) {
    return (
      <div className="bg-[var(--panel-background)] h-full flex flex-col items-center justify-center gap-2">
        <LayersIcon className="size-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">Group</div>
      </div>
    );
  }

  // Empty state - no selection
  if (selectedClips.length === 0) {
    return (
      <div className="bg-[var(--panel-background)] h-full flex flex-col items-center justify-center gap-2">
        <MousePointerClickIcon className="size-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          Select a clip to edit its properties
        </div>
      </div>
    );
  }

  const clip = selectedClips[0];

  const renderSpecificProperties = () => {
    switch (clip.type) {
      case 'Text':
        return <TextProperties clip={clip} />;
      case 'Caption':
        return <CaptionProperties clip={clip} />;
      case 'Image':
        return <ImageProperties clip={clip} />;
      case 'Video':
        return <VideoProperties clip={clip} />;
      case 'Audio':
        return <AudioProperties clip={clip} />;
      case 'Effect':
        return <EffectProperties clip={clip} />;
      case 'Transition':
        return <TransitionProperties clip={clip} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-[var(--panel-background)] h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 text-sm font-medium border-b border-white/5">
        Properties
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-1">{renderSpecificProperties()}</div>
      </ScrollArea>
    </div>
  );
}
