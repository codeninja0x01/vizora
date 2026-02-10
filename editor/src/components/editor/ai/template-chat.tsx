'use client';

import { useState } from 'react';
import { useTemplateGenerationStore } from '@/stores/template-generation-store';
import { useStudioStore } from '@/stores/studio-store';
import { TemplateStylePicker } from './template-style-picker';
import { IconSparkles, IconX, IconPlus, IconCheck } from '@tabler/icons-react';
import { jsonToClip } from 'openvideo';
import type { MergeFieldSuggestion } from '@/lib/ai/utils/merge-field-detector';
import { cn } from '@/lib/utils';

export function TemplateChat() {
  const {
    selectedStyleId,
    isGenerating,
    generatedTemplate,
    mergeFields,
    conversationId,
    messages,
    setStyle,
    setGenerating,
    setTemplate,
    addMessage,
    removeMergeField,
  } = useTemplateGenerationStore();

  const { studio } = useStudioStore();
  const [promptText, setPromptText] = useState('');
  const [refinementText, setRefinementText] = useState('');
  const [showMergeFields, setShowMergeFields] = useState(true);

  const applyTemplateToCanvas = async (template: any) => {
    if (!studio) return;

    // Clear existing clips
    const allClipIds = studio.clips.map((c) => c.id);
    for (const clipId of allClipIds) {
      await studio.removeClipById(clipId);
    }

    // Remove all tracks
    const allTracks = studio.getTracks();
    for (const track of allTracks) {
      studio.removeTrack(track.id);
    }

    // Add tracks from template
    if (template.tracks && Array.isArray(template.tracks)) {
      for (const track of template.tracks) {
        studio.addTrack({
          id: track.id,
          name: track.name,
          type: track.type,
        });
      }
    }

    // Add clips from template
    if (template.clips && Array.isArray(template.clips)) {
      for (const clipData of template.clips) {
        try {
          // Convert clip data to proper format
          const clip = await jsonToClip(clipData);

          // Find the track for this clip
          const trackId = template.tracks?.find((t: any) =>
            t.clipIds?.includes(clipData.id)
          )?.id;

          if (trackId) {
            await studio.addClip(clip, { trackId });
          } else {
            // If no specific track, add to first compatible track
            await studio.addClip(clip);
          }
        } catch (error) {
          console.error('Failed to add clip:', error);
        }
      }
    }
  };

  const handleGenerate = async () => {
    if (!promptText.trim() || isGenerating) return;

    setGenerating(true);
    addMessage('user', promptText);

    try {
      const response = await fetch('/api/ai/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          styleId: selectedStyleId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate template');
      }

      const data = await response.json();
      setTemplate(data.template, data.mergeFields, data.conversationId);

      const templateName = data.template.name || 'your template';
      const templateDesc = data.template.description || 'a video template';
      addMessage(
        'assistant',
        `Template generated! Here's what I created: ${templateName} - ${templateDesc}`
      );

      await applyTemplateToCanvas(data.template);
      setPromptText('');
    } catch (error) {
      console.error('Generation error:', error);
      addMessage(
        'assistant',
        `Sorry, I couldn't generate the template. ${error instanceof Error ? error.message : 'Please try again.'}`
      );
      setGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (
      !refinementText.trim() ||
      isGenerating ||
      !generatedTemplate ||
      !conversationId
    ) {
      return;
    }

    setGenerating(true);
    addMessage('user', refinementText);

    try {
      const response = await fetch('/api/ai/template/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          prompt: refinementText,
          currentTemplate: generatedTemplate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refine template');
      }

      const data = await response.json();
      setTemplate(data.template, data.mergeFields, data.conversationId);
      addMessage('assistant', 'Template updated based on your feedback.');

      await applyTemplateToCanvas(data.template);
      setRefinementText('');
    } catch (error) {
      console.error('Refinement error:', error);
      addMessage(
        'assistant',
        `Sorry, I couldn't refine the template. ${error instanceof Error ? error.message : 'Please try again.'}`
      );
      setGenerating(false);
    }
  };

  const getMergeFieldTypeBadge = (type: MergeFieldSuggestion['type']) => {
    const colors = {
      text: 'bg-blue-500/10 text-blue-500',
      image: 'bg-purple-500/10 text-purple-500',
      video: 'bg-green-500/10 text-green-500',
      color: 'bg-orange-500/10 text-orange-500',
      number: 'bg-pink-500/10 text-pink-500',
    };

    return (
      <span className={cn('px-1.5 py-0.5 rounded text-xs', colors[type])}>
        {type}
      </span>
    );
  };

  // Initial state - no template generated yet
  if (!generatedTemplate) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <IconSparkles className="size-5 text-primary" />
          <h2 className="font-semibold">AI Template Generator</h2>
        </div>

        {/* Style Picker */}
        <div className="py-3 border-b border-border">
          <TemplateStylePicker
            selectedId={selectedStyleId}
            onSelect={setStyle}
            compact={true}
          />
        </div>

        {/* Prompt Input */}
        <div className="flex-1 flex flex-col p-4 gap-3">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Describe the template you want to create..."
            className="flex-1 min-h-[120px] p-3 rounded-md border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isGenerating}
          />

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Examples:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>A product launch video with logo reveal</li>
              <li>Social media ad for a restaurant</li>
              <li>Corporate presentation with data slides</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!promptText.trim() || isGenerating}
            className="w-full py-2.5 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    );
  }

  // After generation - show chat and refinement
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <IconSparkles className="size-5 text-primary" />
        <h2 className="font-semibold">AI Template Generator</h2>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] px-3 py-2 rounded-lg text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Merge Fields Section */}
      {mergeFields.length > 0 && (
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setShowMergeFields(!showMergeFields)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <span>Merge Fields ({mergeFields.length})</span>
            <IconCheck
              className={cn(
                'size-4 transition-transform',
                showMergeFields ? 'rotate-180' : ''
              )}
            />
          </button>

          {showMergeFields && (
            <div className="px-4 py-2 space-y-2 max-h-40 overflow-y-auto">
              {mergeFields.map((field, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {getMergeFieldTypeBadge(field.type)}
                    <span className="text-sm">{field.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      removeMergeField(field.elementId, field.property)
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <IconX className="size-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="w-full py-1.5 px-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors flex items-center justify-center gap-1"
              >
                <IconPlus className="size-3" />
                Add merge field
              </button>
            </div>
          )}
        </div>
      )}

      {/* Refinement Input */}
      <div className="border-t border-border p-4 space-y-2">
        <textarea
          value={refinementText}
          onChange={(e) => setRefinementText(e.target.value)}
          placeholder="Refine your template... e.g., 'Make the intro shorter', 'Change the font to something bolder'"
          className="w-full min-h-[60px] p-2 rounded-md border border-border bg-background resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isGenerating}
        />
        <button
          type="button"
          onClick={handleRefine}
          disabled={!refinementText.trim() || isGenerating}
          className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
        >
          {isGenerating ? 'Refining...' : 'Refine'}
        </button>
      </div>

      {/* Save as Template Button */}
      <div className="border-t border-border p-4">
        <button
          type="button"
          className="w-full py-2 px-4 rounded-md border border-border bg-background hover:bg-muted font-medium transition-all text-sm"
        >
          Save as Template
        </button>
      </div>
    </div>
  );
}
