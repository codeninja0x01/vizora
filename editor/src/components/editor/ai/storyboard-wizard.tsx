'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { getVideoStyleById } from '@/lib/ai/presets/video-style-presets';

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

  // Step 1 validation
  const canProceedFromStep1 = scenes.every((scene) => scene.description.trim());

  // Calculate total duration
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

  // Scene reordering
  const moveSceneUp = (index: number) => {
    if (index > 0) {
      reorderScenes(index, index - 1);
    }
  };

  const moveSceneDown = (index: number) => {
    if (index < scenes.length - 1) {
      reorderScenes(index, index + 1);
    }
  };

  // Generate video
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
      console.error('Generation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate video'
      );
      setGenerating(false);
    }
  };

  // Open in editor
  const handleOpenInEditor = () => {
    const { composition } = useStoryboardStore.getState();
    if (!composition) return;

    // Store composition in sessionStorage
    sessionStorage.setItem('pendingComposition', JSON.stringify(composition));

    // Navigate to editor
    router.push('/editor');
  };

  // Render step content
  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight font-heading text-foreground">
              Describe Your Video
            </h2>
            <p className="text-muted-foreground">
              Add scenes to build your storyboard
            </p>
          </div>

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
                <div className="absolute right-2 top-2 flex flex-col gap-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveSceneUp(index)}
                      className="flex size-6 items-center justify-center rounded bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Move scene up"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                  )}
                  {index < scenes.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveSceneDown(index)}
                      className="flex size-6 items-center justify-center rounded bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Move scene down"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addScene}
            className="w-full"
          >
            <Plus className="mr-2 size-4" />
            Add Scene
          </Button>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canProceedFromStep1}
            >
              Next
              <ChevronRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight font-heading text-foreground">
              Choose a Style
            </h2>
            <p className="text-muted-foreground">
              Select a mood for your video
            </p>
          </div>

          <StylePicker selectedId={selectedStyleId} onSelect={setStyle} />

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-2 size-4" />
              Back
            </Button>
            <Button type="button" onClick={() => setStep(3)}>
              Next
              <ChevronRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      const selectedStyle = getVideoStyleById(selectedStyleId);

      // Show results if generation complete
      if (scenesWithClips.length > 0 && !isGenerating) {
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight font-heading text-foreground">
                Video Generated!
              </h2>
              <p className="text-muted-foreground">
                Your video is ready to edit
              </p>
            </div>

            <div className="space-y-3">
              {scenesWithClips.map(({ scene, clip }, index) => (
                <SceneEditor
                  key={scene.id || index}
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

      // Show generation UI
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight font-heading text-foreground">
              Review & Generate
            </h2>
            <p className="text-muted-foreground">Ready to create your video</p>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Scenes</span>
              <span className="font-medium text-foreground">
                {scenes.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Duration</span>
              <span className="font-medium text-foreground">
                {totalDuration}s
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Style</span>
              <span className="font-medium text-foreground">
                {selectedStyle?.name}
              </span>
            </div>
          </div>

          {/* Scene list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Scenes:</h3>
            <div className="space-y-1.5">
              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  className="rounded-lg bg-muted/50 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {index + 1}.
                    </span>
                    <span className="flex-1 text-muted-foreground line-clamp-2">
                      {scene.description}
                    </span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {scene.duration}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {isGenerating && (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Generating your video...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This may take 10-30 seconds
              </p>
            </div>
          )}

          {/* Actions */}
          {!isGenerating && (
            <>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  <ChevronLeft className="mr-2 size-4" />
                  Back
                </Button>
              </div>
            </>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((stepNum) => (
          <div key={stepNum} className="flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                step === stepNum
                  ? 'bg-primary text-primary-foreground'
                  : step > stepNum
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {stepNum}
            </div>
            {stepNum < 3 && (
              <div
                className={`h-px w-12 transition-colors ${
                  step > stepNum ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {renderStepContent()}
    </div>
  );
}
