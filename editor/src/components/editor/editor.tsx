'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MediaPanel } from '@/components/editor/media-panel';
import { CanvasPanel } from '@/components/editor/canvas-panel';
import { Timeline } from '@/components/editor/timeline';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { usePanelStore } from '@/stores/panel-store';
import { useStudioStore } from '@/stores/studio-store';
import { useTemplateStore } from '@/stores/template-store';
import Header from '@/components/editor/header';
import { Loading } from '@/components/editor/loading';
import FloatingControl from '@/components/editor/floating-controls/floating-control';
import { Compositor } from 'openvideo';
import { WebCodecsUnsupportedModal } from '@/components/editor/webcodecs-unsupported-modal';
import Assistant from './assistant/assistant';
import { TemplateBar } from './template-mode/template-bar';
import { getTemplateById } from '@/app/(protected)/dashboard/templates/actions';
import { DesktopOnlyModal } from './desktop-only-modal';

export default function Editor() {
  const {
    toolsPanel,
    copilotPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setCopilotPanel,
    setMainContent,
    setTimeline,
    isCopilotVisible,
  } = usePanelStore();

  const { studio } = useStudioStore();
  const { isTemplateMode, enterTemplateMode, setMarkedFields } =
    useTemplateStore();
  const searchParams = useSearchParams();

  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);
  const [templateLoadAttempted, setTemplateLoadAttempted] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = await Compositor.isSupported();
      setIsWebCodecsSupported(isSupported);
    };
    checkSupport();
  }, []);

  // Load template from URL parameter
  useEffect(() => {
    const loadTemplate = async () => {
      const templateId = searchParams.get('templateId');

      if (!templateId || !studio || templateLoadAttempted) {
        return;
      }

      setTemplateLoadAttempted(true);

      try {
        const template = await getTemplateById(templateId);

        if (!template) {
          console.error('Template not found');
          return;
        }

        // Load project data into studio
        await studio.loadFromJSON(template.projectData as any);

        // Enter template mode
        enterTemplateMode(template.id, template.name);

        // Set marked fields from template merge fields
        const markedFields = template.mergeFields.map((field: any) => ({
          elementId: field.elementId,
          property: field.property,
        }));
        setMarkedFields(markedFields);
      } catch (error) {
        console.error('Failed to load template:', error);
      }
    };

    loadTemplate();
  }, [
    searchParams,
    studio,
    templateLoadAttempted,
    enterTemplateMode,
    setMarkedFields,
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-50">
          <Loading />
        </div>
      )}
      {isTemplateMode && <TemplateBar />}
      <Header />
      <div className="flex-1 min-h-0 min-w-0">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full w-full gap-0"
        >
          {/* Left Column: Media Panel */}
          <ResizablePanel
            defaultSize={toolsPanel}
            minSize={15}
            maxSize={40}
            onResize={setToolsPanel}
            className="max-w-7xl relative overflow-visible! bg-[var(--panel-background)] min-w-0"
          >
            <MediaPanel />
            <FloatingControl />
          </ResizablePanel>

          <ResizableHandle className="w-0.5 bg-transparent hover:bg-accent-purple-500/30 transition-colors" />

          {/* Middle Column: Preview + Timeline */}
          <ResizablePanel
            defaultSize={
              isCopilotVisible
                ? 100 - copilotPanel - toolsPanel
                : 100 - toolsPanel
            }
            minSize={40}
            className="min-w-0 min-h-0 bg-background"
          >
            <ResizablePanelGroup
              direction="vertical"
              className="h-full w-full gap-0"
            >
              {/* Canvas Panel */}
              <ResizablePanel
                defaultSize={mainContent}
                minSize={30}
                maxSize={85}
                onResize={setMainContent}
                className="min-h-0 bg-background"
              >
                <CanvasPanel
                  onReady={() => {
                    setIsReady(true);
                  }}
                />
              </ResizablePanel>

              <ResizableHandle className="h-0.5 bg-transparent hover:bg-accent-purple-500/30 transition-colors" />

              {/* Timeline Panel */}
              <ResizablePanel
                defaultSize={timeline}
                minSize={15}
                maxSize={70}
                onResize={setTimeline}
                className="min-h-0 bg-background"
              >
                <Timeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          {isCopilotVisible && (
            <>
              <ResizableHandle className="w-0.5 bg-transparent hover:bg-accent-purple-500/30 transition-colors" />
              {/* Right Column: Chat Copilot */}
              <ResizablePanel
                defaultSize={copilotPanel}
                minSize={15}
                maxSize={40}
                onResize={setCopilotPanel}
                className="max-w-7xl relative overflow-visible! bg-[var(--panel-background)] min-w-0"
              >
                {/* Chat copilot */}
                <Assistant />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />

      {/* Desktop-only enforcement */}
      <DesktopOnlyModal />
    </div>
  );
}
