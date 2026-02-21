'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studio-store';
import { usePanelStore } from '@/stores/panel-store';
import { useProjectStore } from '@/stores/project-store';
import { DEFAULT_CANVAS_PRESETS } from '@/lib/editor-utils';
import { Log, type IClip } from 'openvideo';
import { ExportModal } from './export-modal';
import { Icons } from '../shared/icons';
import {
  Keyboard,
  FilePlus,
  Download,
  Upload,
  Layout,
  ArrowLeft,
  Pencil,
  Check,
} from 'lucide-react';
import { ShortcutsModal } from './shortcuts-modal';
import { SaveTemplateDialog } from './save-template-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AutoClipLogo } from '../shared/autoclip-logo';
import Link from 'next/link';

const isSourcelessClipType = (type: string) =>
  ['Text', 'Caption', 'Effect', 'Transition'].includes(type);

const filterValidClips = (clips: any[]) =>
  clips.filter((clipJSON: any) => {
    if (isSourcelessClipType(clipJSON.type)) return true;
    return clipJSON.src && clipJSON.src.trim() !== '';
  });

export default function Header() {
  const { studio } = useStudioStore();
  const { toggleCopilot, isCopilotVisible } = usePanelStore();
  const { aspectRatio, setCanvasSize } = useProjectStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [title, setTitle] = useState('Untitled video');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

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
      const clips = (studio as any).clips as IClip[];
      if (clips.length === 0) {
        alert('No clips to export');
        return;
      }
      const json = studio.exportToJSON();
      const jsonString = JSON.stringify(json, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement('a');
      document.body.appendChild(aEl);
      aEl.href = url;
      aEl.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
      aEl.click();
      setTimeout(() => {
        if (document.body.contains(aEl)) document.body.removeChild(aEl);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      Log.error('Export to JSON error:', error);
      alert(`Failed to export to JSON: ${(error as Error).message}`);
    }
  };

  const processImportFile = useCallback(
    async (file: File, inputEl: HTMLInputElement) => {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (!json.clips || !Array.isArray(json.clips))
          throw new Error('Invalid JSON format: missing clips array');
        if (!studio) throw new Error('Studio not initialized');
        const validClips = filterValidClips(json.clips);
        if (validClips.length === 0)
          throw new Error(
            'No valid clips found in JSON. All clips have empty source URLs.'
          );
        await studio.loadFromJSON({ ...json, clips: validClips });
      } catch (error) {
        Log.error('Load from JSON error:', error);
        alert(`Failed to load from JSON: ${(error as Error).message}`);
      } finally {
        if (document.body.contains(inputEl)) document.body.removeChild(inputEl);
      }
    },
    [studio]
  );

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) processImportFile(file, input);
    };
    document.body.appendChild(input);
    input.click();
  };

  return (
    <TooltipProvider delayDuration={600}>
      <header className="relative flex h-[52px] w-full shrink-0 items-center justify-between px-3 bg-[var(--panel-background)] border-b border-white/[0.06]">
        {/* ── Left: Brand + Back + Undo/Redo ── */}
        <div className="flex items-center gap-1">
          {/* Back to Dashboard */}
          <Link href="/dashboard">
            <button
              type="button"
              className="group flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all duration-150"
            >
              <ArrowLeft className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
              <AutoClipLogo size="sm" showWordmark={false} />
              <span className="hidden sm:block font-heading text-[13px] font-semibold tracking-tight">
                Dashboard
              </span>
            </button>
          </Link>

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] px-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => studio?.undo()}
                  disabled={!canUndo}
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-sm hover:bg-white/[0.06] disabled:opacity-30"
                >
                  <Icons.undo className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Undo
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => studio?.redo()}
                  disabled={!canRedo}
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-sm hover:bg-white/[0.06] disabled:opacity-30"
                >
                  <Icons.redo className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Redo
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          {/* File action buttons */}
          <div className="flex items-center gap-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] px-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleImportJSON}
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-sm hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
                >
                  <Upload className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Import JSON
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleExportJSON}
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-sm hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
                >
                  <Download className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Export JSON
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsSaveTemplateOpen(true)}
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-sm hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
                >
                  <Layout className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Save as Template
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleNew}
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-sm hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
                >
                  <FilePlus className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                New Project
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Center: Editable project title ── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  setTitle(trimmed || 'Untitled video');
                  setIsEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = e.currentTarget.value.trim();
                    setTitle(trimmed || 'Untitled video');
                    setIsEditingTitle(false);
                  }
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                ref={titleInputRef}
                className="text-sm font-semibold font-heading text-foreground text-center bg-white/[0.06] border border-white/[0.12] focus:outline-none focus:border-accent-purple-500/60 rounded-md px-2 h-7 w-44 tracking-tight"
              />
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="text-accent-purple-400 hover:text-accent-purple-300 transition-colors"
              >
                <Check className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="group flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-colors"
            >
              <span className="text-sm font-semibold font-heading text-foreground/80 group-hover:text-foreground tracking-tight transition-colors">
                {title}
              </span>
              <Pencil className="size-3 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
            </button>
          )}
        </div>

        {/* ── Right: Tools + Export ── */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                onClick={() => setIsShortcutsModalOpen(true)}
              >
                <Keyboard className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Keyboard Shortcuts
            </TooltipContent>
          </Tooltip>

          <Button
            variant={isCopilotVisible ? 'accent' : 'ghost'}
            onClick={toggleCopilot}
            className={`h-7 px-2.5 gap-1.5 text-xs font-medium rounded-md transition-all ${
              isCopilotVisible
                ? ''
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-white/[0.06]'
            }`}
            title="Toggle AI Copilot"
          >
            <Icons.ai className="size-3.5" />
            <span className="hidden md:block">AI Chat</span>
          </Button>

          {studio && (
            <>
              <div className="h-4 w-px bg-white/[0.08]" />
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/[0.06] gap-1.5 rounded-md border border-white/[0.06]"
                      >
                        <Icons.crop className="size-3 text-muted-foreground/70" />
                        {aspectRatio}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Canvas Size
                  </TooltipContent>
                </Tooltip>
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
            </>
          )}

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* Export CTA — gradient to match dashboard brand */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background:
                'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
              boxShadow: '0 1px 8px 0 oklch(0.60 0.24 285 / 0.35)',
            }}
          >
            <Download className="size-3.5" />
            <span>Export</span>
          </button>
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
    </TooltipProvider>
  );
}
