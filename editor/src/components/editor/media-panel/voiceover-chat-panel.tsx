'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { IconLoader2, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useGeneratedStore } from '@/stores/generated-store';
import { VoiceSelector } from './voice-selector';
import { useStudioStore } from '@/stores/studio-store';
import { Audio } from 'openvideo';

interface SelectedVoice {
  provider: string;
  voiceId: string;
  name: string;
}

export const VoiceoverChatPanel = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(
    null
  );
  const { addAsset, voiceovers } = useGeneratedStore();
  const studio = useStudioStore((state) => state.studio);

  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice) {
      toast.error('Please enter text and select a voice');
      return;
    }

    if (text.length > 5000) {
      toast.error('Text exceeds maximum length of 5000 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice.voiceId,
          provider: selectedVoice.provider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate voiceover');
      }

      const data = await response.json();

      addAsset({
        id: crypto.randomUUID(),
        url: data.url,
        text: text,
        type: 'voiceover',
        createdAt: Date.now(),
        provider: selectedVoice.provider,
        voiceId: selectedVoice.voiceId,
        voiceName: selectedVoice.name,
      });

      toast.success('Voiceover generated!');
      setText('');
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate voiceover'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTimeline = async (url: string) => {
    if (!studio) {
      toast.error('Studio not ready');
      return;
    }

    try {
      const clip = await Audio.fromUrl(url);
      clip.update({
        display: {
          from: 0,
          to: clip.duration,
        },
      });
      studio.addClip(clip);
      toast.success('Added to timeline');
    } catch (error) {
      console.error('Failed to add to timeline:', error);
      toast.error('Failed to add to timeline');
    }
  };

  const handlePlayAudio = (url: string) => {
    const audio = new window.Audio(url);
    audio.play().catch((error) => {
      console.error('Failed to play audio:', error);
      toast.error('Failed to play audio');
    });
  };

  const characterCount = text.length;
  const isOverLimit = characterCount > 5000;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="rounded-xl h-full p-3 flex flex-col gap-3 shadow-sm">
        {/* Voice Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="text-xs font-medium text-muted-foreground">Voice</div>
          <VoiceSelector
            value={
              selectedVoice
                ? {
                    provider: selectedVoice.provider,
                    voiceId: selectedVoice.voiceId,
                  }
                : null
            }
            onChange={setSelectedVoice}
          />
        </div>

        {/* Script Input */}
        <div className="flex flex-col gap-1.5 flex-1 min-h-0">
          <div className="text-xs font-medium text-muted-foreground">
            Script
            <span className="ml-2 font-normal opacity-70">
              Use [pause 1s] to add timing pauses
            </span>
          </div>
          <Textarea
            placeholder="Enter text for voiceover... e.g., Welcome to my video [pause 0.5s] let's get started!"
            className="resize-none text-sm min-h-[120px] flex-1 !bg-transparent border focus-visible:ring-1 px-3 py-2 shadow-none placeholder:text-muted-foreground"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div
            className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {characterCount} / 5000 characters
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex items-center gap-2 pt-1 w-full justify-end">
          <Button
            className="h-9 px-6 rounded-full text-sm relative"
            size="sm"
            onClick={handleGenerate}
            disabled={loading || !text.trim() || !selectedVoice || isOverLimit}
          >
            {loading ? (
              <>
                <IconLoader2 className="size-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </div>

        {/* Generated Voiceovers List */}
        {voiceovers.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t">
            <h3 className="text-xs font-medium text-muted-foreground">
              Generated Voiceovers
            </h3>
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
              {voiceovers.map((voiceover) => (
                <div
                  key={voiceover.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{voiceover.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {voiceover.voiceName && (
                        <span className="text-[10px] text-muted-foreground">
                          {voiceover.voiceName}
                        </span>
                      )}
                      {voiceover.provider && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary">
                          {voiceover.provider === 'elevenlabs'
                            ? 'ElevenLabs'
                            : 'OpenAI'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handlePlayAudio(voiceover.url)}
                    >
                      <IconPlayerPlay className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleAddToTimeline(voiceover.url)}
                    >
                      <IconPlus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
