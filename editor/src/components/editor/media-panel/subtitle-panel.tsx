'use client';

import { useState } from 'react';
import {
  SUBTITLE_PRESETS,
  getDefaultPreset,
  type SubtitlePreset,
} from '@/lib/ai/presets/subtitle-presets';
import { SubtitlePresetCard } from './subtitle-preset-card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useStudioStore } from '@/stores/studio-store';
import { useTimelineStore } from '@/stores/timeline-store';
import { jsonToClip } from 'openvideo';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Helper: Detect audio source from timeline clips
function detectAudioSource(clipsRecord: Record<string, any>): string | null {
  const clipsArray = Object.values(clipsRecord);
  const audioVideoClips = clipsArray.filter(
    (clip) => clip.type === 'Audio' || clip.type === 'Video'
  );

  if (audioVideoClips.length === 0) return null;

  // Prioritize voiceover clips
  const voiceoverClip = audioVideoClips.find((clip) =>
    (clip as any).src?.includes('voiceovers/')
  );

  const sourceClip = voiceoverClip || audioVideoClips[0];
  return (sourceClip as any).src || null;
}

// Helper: Convert API response clips to openvideo clips
async function convertSubtitleClips(clipJsonArray: any[]) {
  const subtitleClips = [];
  for (const clipJson of clipJsonArray) {
    const clip = await jsonToClip(clipJson);
    subtitleClips.push(clip);
  }
  return subtitleClips;
}

export function SubtitlePanel() {
  const { studio } = useStudioStore();
  const [selectedPreset, setSelectedPreset] = useState<SubtitlePreset>(
    getDefaultPreset()
  );
  const [mode, setMode] = useState<'karaoke' | 'phrase'>(
    getDefaultPreset().mode
  );
  const [customStyle, setCustomStyle] = useState({
    fontSize: selectedPreset.style.fontSize,
    color: selectedPreset.style.color,
    fontFamily: selectedPreset.style.fontFamily,
    position: selectedPreset.position,
  });
  const [loading, setLoading] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const filteredPresets = SUBTITLE_PRESETS.filter(
    (preset) => preset.mode === mode
  );

  const handleModeChange = (newMode: 'karaoke' | 'phrase') => {
    setMode(newMode);
    // Find first preset matching the new mode
    const firstMatchingPreset = SUBTITLE_PRESETS.find(
      (p) => p.mode === newMode
    );
    if (firstMatchingPreset) {
      setSelectedPreset(firstMatchingPreset);
      setCustomStyle({
        fontSize: firstMatchingPreset.style.fontSize,
        color: firstMatchingPreset.style.color,
        fontFamily: firstMatchingPreset.style.fontFamily,
        position: firstMatchingPreset.position,
      });
    }
  };

  const handlePresetSelect = (preset: SubtitlePreset) => {
    setSelectedPreset(preset);
    setMode(preset.mode);
    setCustomStyle({
      fontSize: preset.style.fontSize,
      color: preset.style.color,
      fontFamily: preset.style.fontFamily,
      position: preset.position,
    });
  };

  const handleGenerate = async () => {
    if (!studio) {
      toast.error('Studio not initialized');
      return;
    }

    setLoading(true);
    try {
      // Detect audio source
      const clipsRecord = useTimelineStore.getState().clips;
      const audioUrl = detectAudioSource(clipsRecord);

      if (!audioUrl) {
        toast.error('No audio or video found in timeline');
        setLoading(false);
        return;
      }

      // Get video dimensions
      const videoWidth = (studio as any).opts?.width || 1920;
      const videoHeight = (studio as any).opts?.height || 1080;

      // Call subtitle API
      const response = await fetch('/api/ai/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          presetId: selectedPreset.id,
          mode,
          videoWidth,
          videoHeight,
          format: 'clips',
          // Include custom style overrides
          customizations: {
            fontSize: customStyle.fontSize,
            color: customStyle.color,
            fontFamily: customStyle.fontFamily,
            position: customStyle.position,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate subtitles');
      }

      const data = await response.json();

      if (!data.success || !data.data?.clips) {
        throw new Error('Invalid response from subtitle API');
      }

      // Convert clips and add to timeline
      const subtitleClips = await convertSubtitleClips(data.data.clips);

      if (subtitleClips.length > 0) {
        const trackId = `track_subtitles_${Date.now()}`;
        await studio.addClip(subtitleClips, { trackId });

        toast.success(
          `Added ${subtitleClips.length} subtitle clips to timeline`
        );
      }
    } catch (error) {
      console.error('Subtitle generation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate subtitles'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-3 overflow-auto">
      {/* Section 1: Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'karaoke' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => handleModeChange('karaoke')}
        >
          Karaoke
        </Button>
        <Button
          variant={mode === 'phrase' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => handleModeChange('phrase')}
        >
          Phrase
        </Button>
      </div>

      {/* Section 2: Preset Gallery */}
      <div className="grid grid-cols-2 gap-3">
        {filteredPresets.map((preset) => (
          <SubtitlePresetCard
            key={preset.id}
            preset={preset}
            selected={selectedPreset.id === preset.id}
            onClick={() => handlePresetSelect(preset)}
          />
        ))}
      </div>

      {/* Section 3: Customize (collapsible) */}
      <Collapsible open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span>Customize Style</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${customizeOpen ? 'rotate-180' : ''}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Font Size */}
          <div className="space-y-2">
            <Label>Font Size: {customStyle.fontSize}px</Label>
            <Slider
              min={24}
              max={120}
              step={4}
              value={[customStyle.fontSize]}
              onValueChange={(values) =>
                setCustomStyle({ ...customStyle, fontSize: values[0] })
              }
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Text Color</Label>
            <Input
              type="color"
              value={customStyle.color}
              onChange={(e) =>
                setCustomStyle({ ...customStyle, color: e.target.value })
              }
              className="h-10 w-full"
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label>Position</Label>
            <Select
              value={customStyle.position}
              onValueChange={(value: 'top' | 'center' | 'bottom') =>
                setCustomStyle({ ...customStyle, position: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label>Font Family</Label>
            <Select
              value={customStyle.fontFamily}
              onValueChange={(value) =>
                setCustomStyle({ ...customStyle, fontFamily: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Poppins">Poppins</SelectItem>
                <SelectItem value="Bangers">Bangers</SelectItem>
                <SelectItem value="Montserrat">Montserrat</SelectItem>
                <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                <SelectItem value="Impact">Impact</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 4: Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full mt-auto"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Subtitles'
        )}
      </Button>
    </div>
  );
}
