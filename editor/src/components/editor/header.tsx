import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studio-store';
import { usePanelStore } from '@/stores/panel-store';
import { useProjectStore } from '@/stores/project-store';
import { DEFAULT_CANVAS_PRESETS } from '@/lib/editor-utils';
import { Log, type IClip } from 'openvideo';
import { ExportModal } from './export-modal';
import { LogoIcons } from '../shared/logos';
import Link from 'next/link';
import { Icons } from '../shared/icons';
import { Keyboard, FilePlus, Download, Upload, Layout } from 'lucide-react';
import { ShortcutsModal } from './shortcuts-modal';
import { SaveTemplateDialog } from './save-template-dialog';
import { useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const { studio } = useStudioStore();
  const { toggleCopilot, isCopilotVisible } = usePanelStore();
  const { aspectRatio, setCanvasSize } = useProjectStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [_isExporting, _setIsExporting] = useState(false);
  const [_isBatchExporting, _setIsBatchExporting] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!studio) return;

    setCanUndo(studio.history.canUndo());
    setCanRedo(studio.history.canRedo());

    const handleHistoryChange = ({
      canUndo,
      canRedo,
    }: {
      canUndo: boolean;
      canRedo: boolean;
    }) => {
      setCanUndo(canUndo);
      setCanRedo(canRedo);
    };

    studio.on('history:changed', handleHistoryChange);

    return () => {
      studio.off('history:changed', handleHistoryChange);
    };
  }, [studio]);

  const handleNew = () => {
    if (!studio) return;
    const confirmed = window.confirm(
      'Are you sure you want to start a new project? Unsaved changes will be lost.'
    );
    if (confirmed) {
      studio.clear();
    }
  };

  const handleExportJSON = () => {
    if (!studio) return;

    try {
      // Get all clips from studio
      const clips = (studio as any).clips as IClip[];
      if (clips.length === 0) {
        alert('No clips to export');
        return;
      }

      // Export to JSON
      const json = studio.exportToJSON();
      const jsonString = JSON.stringify(json, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Download the JSON file
      const aEl = document.createElement('a');
      document.body.appendChild(aEl);
      aEl.href = url;
      aEl.download = `combo-project-${Date.now()}.json`;
      aEl.click();

      // Cleanup
      setTimeout(() => {
        if (document.body.contains(aEl)) {
          document.body.removeChild(aEl);
        }
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      Log.error('Export to JSON error:', error);
      alert(`Failed to export to JSON: ${(error as Error).message}`);
    }
  };

  const isSourcelessClipType = (type: string) => {
    return ['Text', 'Caption', 'Effect', 'Transition'].includes(type);
  };

  const filterValidClips = (clips: any[]) => {
    return clips.filter((clipJSON: any) => {
      if (isSourcelessClipType(clipJSON.type)) {
        return true;
      }
      return clipJSON.src && clipJSON.src.trim() !== '';
    });
  };

  const processImportedJSON = async (file: File) => {
    const text = await file.text();
    const json = JSON.parse(text);

    if (!json.clips || !Array.isArray(json.clips)) {
      throw new Error('Invalid JSON format: missing clips array');
    }

    if (!studio) {
      throw new Error('Studio not initialized');
    }

    const validClips = filterValidClips(json.clips);

    if (validClips.length === 0) {
      throw new Error(
        'No valid clips found in JSON. All clips have empty source URLs.'
      );
    }

    const validJson = { ...json, clips: validClips };
    await studio.loadFromJSON(validJson);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await processImportedJSON(file);
      } catch (error) {
        Log.error('Load from JSON error:', error);
        alert(`Failed to load from JSON: ${(error as Error).message}`);
      } finally {
        document.body.removeChild(input);
      }
    };

    document.body.appendChild(input);
    input.click();
  };

  return (
    <header className="relative flex h-[52px] w-full shrink-0 items-center justify-between px-4 bg-[var(--panel-background)] border-b border-white/5">
      {/* Left Section */}
      <div className="flex items-center gap-1">
        <div className="pointer-events-auto flex size-8 bg-accent-purple-500/15 items-center justify-center rounded-lg">
          <LogoIcons.scenify width={24} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">File</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-popover">
            <DropdownMenuItem onClick={handleExportJSON}>
              <Download className="mr-2 size-4" />
              <span>Export (to JSON)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportJSON}>
              <Upload className="mr-2 size-4" />
              <span>Import from JSON</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsSaveTemplateOpen(true)}>
              <Layout className="mr-2 size-4" />
              <span>Save as Template</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNew}>
              <FilePlus className="mr-2 size-4" />
              <span>Clear or New project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="pointer-events-auto flex h-10 items-center px-1.5">
          <Button
            onClick={() => studio?.undo()}
            disabled={!canUndo}
            variant="ghost"
            size="icon"
            className="size-8"
          >
            <Icons.undo className="size-4" />
          </Button>
          <Button
            onClick={() => studio?.redo()}
            disabled={!canRedo}
            variant="ghost"
            size="icon"
            className="size-8"
          >
            <Icons.redo className="size-4" />
          </Button>
        </div>
      </div>

      {/* Center Section */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-muted-foreground">
        Untitled video
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setIsShortcutsModalOpen(true)}
        >
          <Keyboard className="size-4" />
        </Button>

        <Button
          variant={isCopilotVisible ? 'accent' : 'outline'}
          onClick={toggleCopilot}
          className="h-8 px-3 gap-1.5"
          title="Toggle Chat Copilot"
        >
          <Icons.ai className="size-4" />
          <span className="hidden md:block">AI Chat</span>
        </Button>

        {studio && (
          <div className="flex items-center gap-1 border-x border-border/50 px-2 h-8 mx-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-semibold"
                >
                  <Icons.crop className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  {aspectRatio}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {DEFAULT_CANVAS_PRESETS.map((preset) => (
                  <DropdownMenuItem
                    key={preset.name}
                    onClick={() =>
                      setCanvasSize(
                        { width: preset.width, height: preset.height },
                        preset.name
                      )
                    }
                    className="text-xs"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{preset.name}</span>
                      {aspectRatio === preset.name && (
                        <Icons.check className="h-3 w-3" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <Link href="/dashboard">
          <Button variant="outline" className="h-8 px-3 rounded-lg gap-1.5">
            <Layout className="size-4" />
            <span className="hidden md:block">Dashboard</span>
          </Button>
        </Link>

        <Button
          variant="default"
          className="h-8 px-4 rounded-lg font-medium gap-1.5"
          onClick={() => setIsExportModalOpen(true)}
        >
          <Download className="size-4" />
          <span>Download</span>
        </Button>
      </div>

      <ExportModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
      />
      <ShortcutsModal
        open={isShortcutsModalOpen}
        onOpenChange={setIsShortcutsModalOpen}
      />
      <SaveTemplateDialog
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
      />
    </header>
  );
}
