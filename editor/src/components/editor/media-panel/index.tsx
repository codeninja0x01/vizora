'use client';

import { ActivityBar } from './tabbar';
import { useMediaPanelStore, type Tab } from './store';
import PanelUploads from './panel/uploads';
import PanelImages from './panel/images';
import PanelVideos from './panel/videos';
import PanelEffect from './panel/effects';
import PanelTransition from './panel/transition';
import PanelText from './panel/text';
import PanelCaptions from './panel/captions';
import PanelMusic from './panel/music';
import PanelVoiceovers from './panel/voiceovers';
import PanelSFX from './panel/sfx';
import PanelElements from './panel/elements';
import { PropertiesPanel } from '../properties-panel';
import { MergeFieldPanel } from '../template-mode/merge-field-panel';
import type { IClip } from 'openvideo';
import { useEffect, useState } from 'react';
import { useStudioStore } from '@/stores/studio-store';
import { useTemplateStore } from '@/stores/template-store';

const viewMap: Record<Tab, React.ReactNode> = {
  uploads: <PanelUploads />,
  images: <PanelImages />,
  videos: <PanelVideos />,
  music: <PanelMusic />,
  voiceovers: <PanelVoiceovers />,
  sfx: <PanelSFX />,
  text: <PanelText />,
  captions: <PanelCaptions />,
  transitions: <PanelTransition />,
  effects: <PanelEffect />,
  elements: <PanelElements />,
};

export function MediaPanel() {
  const { activeTab, isPanelOpen } = useMediaPanelStore();
  const [selectedClips, setSelectedClips] = useState<IClip[]>([]);
  const { studio, setSelectedClips: setStudioSelectedClips } = useStudioStore();
  const { isTemplateMode } = useTemplateStore();
  const [showProperties, setShowProperties] = useState(false);

  useEffect(() => {
    if (!studio) return;

    const handleSelection = (data: any) => {
      setSelectedClips(data.selected);
      setStudioSelectedClips(data.selected);
      setShowProperties(true);
    };

    const handleClear = () => {
      setSelectedClips([]);
      setShowProperties(false);
    };

    studio.on('selection:created', handleSelection);
    studio.on('selection:updated', handleSelection);
    studio.on('selection:cleared', handleClear);

    return () => {
      studio.off('selection:created', handleSelection);
      studio.off('selection:updated', handleSelection);
      studio.off('selection:cleared', handleClear);
    };
  }, [studio]);

  useEffect(() => {
    if (activeTab) {
      setShowProperties(false);
    }
  }, [activeTab]);

  return (
    <div className="h-full flex overflow-hidden w-full">
      {/* Activity Bar - always visible */}
      <ActivityBar />

      {/* Panel Content - conditionally visible based on isPanelOpen */}
      {isPanelOpen && (
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden bg-[var(--panel-background)] flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto">
            {selectedClips.length > 0 && showProperties ? (
              <PropertiesPanel selectedClips={selectedClips} />
            ) : (
              <>{viewMap[activeTab]}</>
            )}
          </div>
          {/* Merge Field Panel - shows when in template mode with a selected clip */}
          {isTemplateMode && selectedClips.length > 0 && <MergeFieldPanel />}
        </div>
      )}
    </div>
  );
}
