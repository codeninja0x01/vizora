'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStoryboardStore } from '@/stores/storyboard-store';
import { SceneEditor } from './scene-editor';
import { StylePicker } from './style-picker';
import { Button } from '@/components/ui/button';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  ChevronUp,
  ChevronDown,
  Film,
  Palette,
  Video,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { getVideoStyleById } from '@/lib/ai/presets/video-style-presets';

const STEPS = [
  { num: 1, label: 'Scenes', icon: Film },
  { num: 2, label: 'Style', icon: Palette },
  { num: 3, label: 'Generate', icon: Video },
];

const LOADING_MESSAGES = [
  'Analyzing your scenes...',
  'Searching stock footage...',
  'Matching visual elements...',
  'Assembling composition...',
];

export function StoryboardWizard() {
  const router = useRouter();
  const {
    scenes,
    selectedStyleId,
    isGenerating,
    scenesWithClips,
    addScene,
    removeScene,
    updateScene,
    reorderScenes,
    setStyle,
    setGenerating,
    setComposition,
  } = useStoryboardStore();

  const [step, setStep] = useState(1);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const canProceedFromStep1 = scenes.every((scene) => scene.description.trim());
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingMsgIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const moveSceneUp = (index: number) => {
    if (index > 0) reorderScenes(index, index - 1);
  };

  const moveSceneDown = (index: number) => {
    if (index < scenes.length - 1) reorderScenes(index, index + 1);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/ai/text-to-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: scenes.map((s) => ({
            description: s.description,
            duration: s.duration,
            textOverlay: s.textOverlay || undefined,
          })),
          styleId: selectedStyleId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate video');
      }

      const data = await response.json();

      if (!data.composition || !data.scenesWithClips) {
        throw new Error('Invalid response from server');
      }

      setComposition(data.composition, data.scenesWithClips);
      toast.success('Video generated successfully!');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate video'
      );
      setGenerating(false);
    }
  };

  const handleOpenInEditor = () => {
    const { composition } = useStoryboardStore.getState();
    if (!composition) return;
    sessionStorage.setItem('pendingComposition', JSON.stringify(composition));
    router.push('/editor');
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="space-y-3">
          {scenes.map((scene, index) => (
            <div key={scene.id} className="relative">
              <SceneEditor
                scene={scene}
                index={index}
                onUpdate={(updates) => updateScene(scene.id, updates)}
                onRemove={() => removeScene(scene.id)}
                canRemove={scenes.length > 1}
              />
              <div className="absolute right-10 top-3 flex flex-col gap-1">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveSceneUp(index)}
                    className="flex size-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-white/[0.06] hover:text-muted-foreground"
                    aria-label="Move scene up"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                )}
                {index < scenes.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveSceneDown(index)}
                    className="flex size-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-white/[0.06] hover:text-muted-foreground"
                    aria-label="Move scene down"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addScene}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] py-3 text-sm text-muted-foreground/50 transition-all duration-150 hover:border-white/[0.18] hover:bg-white/[0.02] hover:text-muted-foreground/80"
          >
            <Plus className="size-3.5" />
            Add Scene
          </button>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[12px] text-muted-foreground/40">
              {scenes.length} scene{scenes.length !== 1 ? 's' : ''} ·{' '}
              {totalDuration}s total
            </span>
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canProceedFromStep1}
            >
              Next
              <ChevronRight className="ml-1.5 size-3.5" />
            </Button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <StylePicker selectedId={selectedStyleId} onSelect={setStyle} />
          <div className="flex justify-between pt-1">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1.5 size-3.5" />
              Back
            </Button>
            <Button type="button" onClick={() => setStep(3)}>
              Next
              <ChevronRight className="ml-1.5 size-3.5" />
            </Button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      const selectedStyle = getVideoStyleById(selectedStyleId);

      // Results state
      if (scenesWithClips.length > 0 && !isGenerating) {
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              {scenesWithClips.map(({ scene, clip }, index) => (
                <SceneEditor
                  key={scene.id ?? index}
                  scene={scene}
                  index={index}
                  onUpdate={() => {}}
                  onRemove={() => {}}
                  clipPreview={clip}
                  canRemove={false}
                />
              ))}
            </div>
            <Button
              type="button"
              onClick={handleOpenInEditor}
              className="w-full"
              size="lg"
            >
              <Sparkles className="mr-2 size-4" />
              Open in Editor
            </Button>
          </div>
        );
      }

      // Loading state
      if (isGenerating) {
        return (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div
                className="absolute inset-0 animate-ping rounded-full opacity-15"
                style={{
                  backgroundColor: 'oklch(0.60 0.24 285)',
                  animationDuration: '2s',
                }}
              />
              <div className="relative flex size-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
                <Loader2
                  className="size-6 animate-spin"
                  style={{ color: 'oklch(0.60 0.24 285)' }}
                />
              </div>
            </div>
            <p className="text-base font-semibold text-foreground transition-all duration-500">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/50">
              This may take 10–30 seconds
            </p>
          </div>
        );
      }

      // Summary / pre-generation
      return (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07] bg-white/[0.02]">
            {[
              { label: 'Scenes', value: String(scenes.length) },
              { label: 'Duration', value: `${totalDuration}s` },
              { label: 'Style', value: selectedStyle?.name ?? '—' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-sm text-muted-foreground/60">
                  {label}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Scene list */}
          <div className="space-y-1.5">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5"
              >
                <span className="mt-0.5 shrink-0 text-[11px] font-bold tabular-nums text-muted-foreground/40">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="line-clamp-1 flex-1 text-sm text-muted-foreground/70">
                  {scene.description}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/40">
                  {scene.duration}s
                </span>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={handleGenerate}
            className="w-full"
            size="lg"
          >
            <Sparkles className="mr-2 size-4" />
            Generate Video
          </Button>

          <div className="flex justify-start">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-1.5 size-3.5" />
              Back
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-start">
          {STEPS.map((s, i) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            const StepIcon = s.icon;

            return (
              <div key={s.num} className="flex flex-1 items-start">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="flex size-8 items-center justify-center rounded-full border transition-all duration-300"
                    style={{
                      borderColor: isCompleted
                        ? 'oklch(0.60 0.24 285 / 0.4)'
                        : isCurrent
                          ? 'oklch(1 0 0 / 0.15)'
                          : 'oklch(1 0 0 / 0.05)',
                      backgroundColor: isCompleted
                        ? 'oklch(0.60 0.24 285 / 0.15)'
                        : isCurrent
                          ? 'oklch(1 0 0 / 0.06)'
                          : 'transparent',
                    }}
                  >
                    {isCompleted ? (
                      <Check
                        className="size-3.5"
                        style={{ color: 'oklch(0.60 0.24 285)' }}
                      />
                    ) : (
                      <StepIcon
                        className="size-3.5 transition-colors duration-300"
                        style={{
                          color: isCurrent
                            ? 'oklch(0.93 0 0)'
                            : 'oklch(0.45 0 0)',
                        }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest transition-colors duration-300"
                    style={{
                      color: isCurrent
                        ? 'oklch(0.93 0 0)'
                        : isCompleted
                          ? 'oklch(0.60 0.24 285 / 0.7)'
                          : 'oklch(0.38 0 0)',
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                {i < STEPS.length - 1 && (
                  <div className="mb-[22px] flex-1 px-2 pt-4">
                    <div className="h-px w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: step > s.num ? '100%' : '0%',
                          backgroundColor: 'oklch(0.60 0.24 285)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      {renderStepContent()}
    </div>
  );
}
