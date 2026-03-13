import { usePlaybackStore } from '@/stores/playback-store';
import {
  Video,
  Image,
  Text,
  Audio,
  type Studio,
  Effect,
  type IClip,
  fontManager,
  jsonToClip,
} from 'openvideo';
import { duplicateClip, splitClip, trimClip } from './action-handlers';
import { useTimelineStore } from '@/stores/timeline-store';
import { generateCaptionClips } from '@/lib/caption-generator';

// ---------- Tool input interfaces ----------

interface AddClipInput {
  text?: string;
  prompt?: string;
  assetType?: 'video' | 'image' | 'text' | 'audio';
  targetId?: string;
  duration?: number;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  action?: 'add_text' | 'add_image' | 'add_video' | 'add_audio';
  from?: number;
  to?: number;
}

interface UpdateClipInput {
  targetId?: string;
  clipId?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  start?: number;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  opacity?: number;
  volume?: number;
  playbackRate?: number;
}

interface ClipTargetInput {
  targetId?: string;
  clipId?: string;
}

interface SplitClipInput extends ClipTargetInput {
  time?: number;
}

interface TrimClipInput extends ClipTargetInput {
  trimFrom?: number;
}

interface AddTransitionInput {
  fromId?: string;
  toId?: string;
  transitionType?: string;
}

interface AddEffectInput {
  effectName: string;
  from?: number;
  to?: number;
}

interface SearchAndAddMediaInput {
  query: string;
  type?: 'video' | 'image';
  targetId?: string;
  from?: number;
}

interface GenerateVoiceoverInput {
  text: string;
  voiceId?: string;
  provider?: string;
  targetId?: string;
  from?: number;
}

interface SeekToTimeInput {
  time: number;
}

interface GenerateCaptionsInput {
  clipIds?: string[];
}

interface GenerateTemplateInput {
  prompt: string;
  styleId?: string;
}

// ---------- Template track shape from API ----------

interface TemplateTrack {
  id: string;
  name: string;
  type: string;
  clipIds?: string[];
}

// ---------- Tool handlers ----------

export const handleAddClip = async (input: AddClipInput, studio: Studio) => {
  const {
    text,
    prompt,
    assetType,
    targetId,
    duration,
    width,
    height,
    left,
    top,
    action,
  } = input;
  const from = input.from ?? 0;
  const to = input.to ? (input.to - from < 1 ? 1 : input.to) : from + 5;

  let clip: IClip | undefined;
  const type =
    assetType ||
    (action === 'add_text'
      ? 'text'
      : action === 'add_image'
        ? 'image'
        : action === 'add_video'
          ? 'video'
          : action === 'add_audio'
            ? 'audio'
            : 'video');

  if (type === 'video' && prompt) {
    console.log('video prompt: ', prompt);
    const url =
      'https://cdn.scenify.io/AUTOCROP/VIDEO/e4545b0a-56e8-4982-80af-9b51094909f7/ec042fbe-01d8-4ef2-8389-c166eae76a77.mp4';
    clip = await Video.fromUrl(url);
  } else if (type === 'image' && prompt) {
    console.log('image prompt: ', prompt);
    const url = 'https://picsum.photos/800/600';
    clip = await Image.fromUrl(url);
  } else if (type === 'text' && (text || input.text)) {
    clip = new Text(text || input.text || '', {
      fontSize: 100,
      fill: '#ffffff',
      fontFamily: 'Inter',
    });
  } else if (type === 'audio' && prompt) {
    console.log('audio prompt: ', prompt);
    const url =
      'https://cdn.scenify.io/AUTOCROP/VIDEO/e4545b0a-56e8-4982-80af-9b51094909f7/ec042fbe-01d8-4ef2-8389-c166eae76a77.mp4';
    clip = await Audio.fromUrl(url);
  }

  if (clip) {
    if (targetId) clip.id = targetId;
    if (width) clip.width = width;
    if (height) clip.height = height;
    if (left !== undefined) clip.left = left;
    if (top !== undefined) clip.top = top;
    if (duration) clip.duration = duration * 1000000;

    // Apply display timing (convert to microseconds)
    clip.update({
      duration: (to - from) * 1000000,
      display: {
        from: from * 1000000,
        to: to * 1000000,
      },
    });

    studio.addClip(clip);
  }
};

export const handleUpdateClip = async (
  input: UpdateClipInput,
  studio: Studio,
) => {
  const {
    left,
    top,
    width,
    height,
    start,
    targetId,
    clipId,
    fontSize,
    fontFamily,
    fill,
    opacity,
    volume,
    playbackRate,
  } = input;
  const id = targetId || clipId;
  if (!id) return;

  const updates: Partial<IClip> = {};
  if (left !== undefined) updates.left = left;
  if (top !== undefined) updates.top = top;
  if (width !== undefined) updates.width = width;
  if (height !== undefined) updates.height = height;
  if (start !== undefined)
    updates.display = { ...updates.display, from: start * 1000000 } as IClip['display'];
  if (fontSize !== undefined) (updates as Record<string, unknown>).fontSize = fontSize;
  if (fontFamily !== undefined) (updates as Record<string, unknown>).fontFamily = fontFamily;
  if (fill !== undefined) (updates as Record<string, unknown>).fill = fill;
  if (opacity !== undefined) updates.opacity = opacity;
  if (volume !== undefined) (updates as Record<string, unknown>).volume = volume;
  if (playbackRate !== undefined) updates.playbackRate = playbackRate;

  await studio.updateClip(id, updates);
};

export const handleRemoveClip = async (
  input: ClipTargetInput,
  studio: Studio,
) => {
  const id = input.targetId || input.clipId;
  if (!id) return;
  const clip = studio.getClipById(id);
  if (clip) {
    console.log('delete clip:', clip);
    await studio.removeClip(id);
  }
};

export const handleSplitClip = async (
  input: SplitClipInput,
  studio: Studio,
) => {
  const id = input.targetId || input.clipId;
  const splitTime = input.time || usePlaybackStore.getState().currentTime;
  if (!splitTime) return;
  const clip = id ? studio.getClipById(id) : undefined;
  if (clip && id) {
    await splitClip(
      id,
      splitTime,
      studio,
      useTimelineStore,
      useTimelineStore.getState().updateClip,
    );
  } else {
    await studio.splitSelected(splitTime * 1_000_000);
  }
};

export const handleTrimClip = async (
  input: TrimClipInput,
  studio: Studio,
) => {
  const id = input.targetId || input.clipId;
  if (!id) return;
  const clip = studio.getClipById(id);
  if (clip) {
    await trimClip(
      id,
      { from: input.trimFrom, to: 0 }, // This handler expects timeline and display, need to check logic
      { from: 0, to: 0 },
      studio,
      useTimelineStore.getState().updateClip,
    );
  } else if (input.trimFrom !== undefined) {
    await studio.trimSelected(input.trimFrom);
  }
};

export const handleAddTransition = async (
  input: AddTransitionInput,
  studio: Studio,
) => {
  const { fromId, toId, transitionType } = input;
  if (fromId && toId && transitionType) {
    await studio.addTransition(
      transitionType || 'GridFlip',
      2_000_000,
      fromId,
      toId,
    );
  }
};

export const handleAddEffect = async (
  input: AddEffectInput,
  studio: Studio,
) => {
  const from = input.from ?? 0;
  const to = input.to ? (input.to - from < 1 ? 1 : input.to) : from + 5;

  const effectClip = new Effect(input.effectName);

  // Default positioning (5 seconds)
  effectClip.display.from = from * 1_000_000;
  effectClip.duration = (to - from) * 1_000_000;
  effectClip.display.to = to * 1_000_000;

  // In a real scenario, we might want to attach this effect to the targetId
  // For now, we just add it to the timeline as requested by the tool
  await studio.addClip(effectClip);
};

export const handleDuplicateClip = async (
  input: ClipTargetInput,
  studio: Studio,
) => {
  const id = input.targetId || input.clipId;
  if (!id) {
    await studio.duplicateSelected();
    return;
  }
  const clip = studio.getClipById(id);
  if (clip) {
    console.log('duplicate clip:', clip);
    await duplicateClip(id, studio, useTimelineStore);
  } else {
    await studio.duplicateSelected();
  }
};

export const handleSearchAndAddMedia = async (
  input: SearchAndAddMediaInput,
  studio: Studio,
) => {
  const { query, type, targetId, from: fromTime } = input;
  const _from = fromTime ?? usePlaybackStore.getState().currentTime / 1000;
  console.log({ input });
  try {
    const response = await fetch(
      `/api/pexels?query=${encodeURIComponent(query)}&type=${type || 'video'}`,
    );
    const data = await response.json();

    let clip: IClip | undefined;
    if (type === 'image') {
      const imageUrl = data.photos?.[0]?.src?.large;
      if (imageUrl) {
        clip = await Image.fromUrl(imageUrl);
      }
    } else {
      const videoUrl = data.videos?.[0]?.video_files?.[0]?.link;
      if (videoUrl) {
        clip = await Video.fromUrl(videoUrl);
      }
    }

    if (clip) {
      if (targetId) clip.id = targetId;
      // clip.update({
      //   display: {
      //     from: from * 1000000,
      //     to: (from + 5) * 1000000,
      //   },
      // });
      await studio.scaleToFit(clip);
      await studio.centerClip(clip);
      studio.addClip(clip);
    }
  } catch (error) {
    console.error('Failed to search and add media:', error);
  }
};

export const handleGenerateVoiceover = async (
  input: GenerateVoiceoverInput,
  studio: Studio,
) => {
  const { text, voiceId, provider, targetId, from: fromTime } = input;
  const from = fromTime ?? usePlaybackStore.getState().currentTime / 1000;

  try {
    const response = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceId: voiceId || '21m00Tcm4TlvDq8ikWAM',
        provider: provider || 'elevenlabs',
      }),
    });
    const data = await response.json();

    if (data.url) {
      const clip = await Audio.fromUrl(data.url);
      if (targetId) clip.id = targetId;
      clip.update({
        display: {
          from: from * 1000000,
          to: (from + clip.duration / 1000000) * 1000000,
        },
      });
      studio.addClip(clip);
    }
  } catch (error) {
    console.error('Failed to generate voiceover:', error);
  }
};

export const handleSeekToTime = async (
  input: SeekToTimeInput,
  _studio: Studio,
) => {
  const { time } = input;
  usePlaybackStore.getState().seek(time * 1000); // seeks uses ms
};

export const handleGenerateCaptions = async (
  input: GenerateCaptionsInput,
  studio: Studio,
) => {
  const { clipIds } = input;
  const targetIds =
    clipIds ||
    studio.clips
      .filter((c: IClip) => c.type === 'video' || c.type === 'audio')
      .map((c: IClip) => c.id);

  console.log({ clipIds, targetIds });

  try {
    const captionTrackId = `track_captions_${Date.now()}`;
    const clipsToAdd: IClip[] = [];

    for (const id of targetIds) {
      const clip = studio.getClipById(id);
      console.log({ clip });
      if (!clip || !clip.src) continue;

      try {
        // Try new subtitle API first
        const subtitleResponse = await fetch('/api/ai/subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: clip.src,
            presetId: 'modern-karaoke',
            format: 'clips',
            videoWidth: studio.opts.width,
            videoHeight: studio.opts.height,
          }),
        });

        if (subtitleResponse.ok) {
          const subtitleData = await subtitleResponse.json();
          if (subtitleData.success && subtitleData.data?.clips) {
            for (const clipJson of subtitleData.data.clips) {
              const captionClip = await jsonToClip(clipJson);
              clipsToAdd.push(captionClip);
            }
            continue; // Success, skip to next clip
          }
        }

        // Fallback to old approach
        const fontName = 'Bangers-Regular';
        const fontUrl =
          'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf';

        await fontManager.addFont({
          name: fontName,
          url: fontUrl,
        });

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: clip.src }),
        });
        const data = await response.json();

        const words = data.results?.main?.words || data.words || [];

        if (words.length > 0) {
          const captionClipsJSON = await generateCaptionClips({
            videoWidth: studio.opts.width,
            videoHeight: studio.opts.height,
            words,
          });

          for (const json of captionClipsJSON) {
            const enrichedJson = {
              ...json,
              mediaId: clip.id,
              metadata: {
                ...json.metadata,
                sourceClipId: clip.id,
              },
              display: {
                from: json.display.from + clip.display.from,
                to: json.display.to + clip.display.from,
              },
            };
            const captionClip = await jsonToClip(enrichedJson);
            clipsToAdd.push(captionClip);
          }
        }
      } catch (error) {
        console.error(`Failed to generate captions for clip ${id}:`, error);
      }
    }

    if (clipsToAdd.length > 0) {
      await studio.addClip(clipsToAdd, { trackId: captionTrackId });
    }
  } catch (error) {
    console.error('Failed to generate captions:', error);
  }
};

export const handleGenerateTemplate = async (
  input: GenerateTemplateInput,
  studio: Studio,
) => {
  const { prompt, styleId } = input;

  try {
    const response = await fetch('/api/ai/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        styleId: styleId || 'corporate',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate template');
    }

    const data = await response.json();

    if (data.success && data.template) {
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
      if (data.template.tracks && Array.isArray(data.template.tracks)) {
        for (const track of data.template.tracks) {
          studio.addTrack({
            id: track.id,
            name: track.name,
            type: track.type,
          });
        }
      }

      // Add clips from template
      if (data.template.clips && Array.isArray(data.template.clips)) {
        for (const clipData of data.template.clips) {
          try {
            // Convert clip data to proper format
            const clip = await jsonToClip(clipData);

            // Find the track for this clip
            const trackId = data.template.tracks?.find(
              (t: TemplateTrack) => t.clipIds?.includes(clipData.id),
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
    }
  } catch (error) {
    console.error('Failed to generate template:', error);
  }
};
