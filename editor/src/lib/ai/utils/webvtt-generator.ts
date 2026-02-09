/**
 * WebVTT generation utilities for subtitles
 *
 * Generates valid WebVTT files with word-level timing metadata for karaoke rendering
 */

import type { SubtitleCue } from './word-timing';
import type { SubtitlePreset } from '../presets/subtitle-presets';

/**
 * Format seconds to WebVTT timestamp format (HH:MM:SS.mmm)
 */
function formatWebVTTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Generate WebVTT subtitle file from subtitle cues
 *
 * For karaoke mode cues, embeds word-level timing metadata as WebVTT NOTE comments
 *
 * @param cues - Array of subtitle cues
 * @returns Valid WebVTT file content
 */
export function generateWebVTT(cues: SubtitleCue[]): string {
  let webvtt = 'WEBVTT\n\n';

  for (const cue of cues) {
    const startTime = formatWebVTTTimestamp(cue.start);
    const endTime = formatWebVTTTimestamp(cue.end);

    // Add word timing metadata for karaoke mode
    if (cue.mode === 'karaoke' && cue.words.length > 0) {
      webvtt += `NOTE words=${JSON.stringify(cue.words)}\n`;
    }

    // Add cue
    webvtt += `${cue.id}\n`;
    webvtt += `${startTime} --> ${endTime}\n`;
    webvtt += `${cue.text}\n\n`;
  }

  return webvtt;
}

/**
 * Generate Caption clip data compatible with existing caption-generator.ts format
 *
 * Converts SubtitleCues into clip JSON objects that match the Caption clip format
 * used by the video editor
 *
 * @param cues - Array of subtitle cues
 * @param preset - Subtitle preset with styling
 * @param videoWidth - Canvas width for positioning
 * @param videoHeight - Canvas height for positioning
 * @returns Array of Caption clip objects
 */
export function generateSubtitleClipData(
  cues: SubtitleCue[],
  preset: SubtitlePreset,
  videoWidth: number,
  videoHeight: number
): any[] {
  const clips: any[] = [];

  // Calculate vertical position based on preset position
  const getVerticalPosition = (captionHeight: number): number => {
    const padding = 80;

    switch (preset.position) {
      case 'top':
        return padding;
      case 'center':
        return (videoHeight - captionHeight) / 2;
      case 'bottom':
      default:
        return videoHeight - captionHeight - padding;
    }
  };

  for (const cue of cues) {
    // Convert seconds to microseconds
    const fromUs = Math.floor(cue.start * 1000000);
    const toUs = Math.floor(cue.end * 1000000);
    const durationUs = toUs - fromUs;

    // Estimate caption dimensions
    const estimatedWidth = Math.min(videoWidth * 0.8, videoWidth - 200);
    const estimatedHeight = preset.style.fontSize * 1.5;

    // Convert WordTiming to caption word format
    const captionWords = cue.words.map((word) => {
      // Calculate relative timing within the cue (in milliseconds)
      const relativeFromMs = Math.floor((word.start - cue.start) * 1000);
      const relativeToMs = Math.floor((word.end - cue.start) * 1000);

      return {
        text: word.word,
        from: relativeFromMs,
        to: relativeToMs,
        isKeyWord: false,
        paragraphIndex: 0,
      };
    });

    const clip = {
      type: 'Caption',
      src: '',
      display: {
        from: fromUs,
        to: toUs,
      },
      playbackRate: 1,
      duration: durationUs,
      left: (videoWidth - estimatedWidth) / 2, // Center horizontally
      top: getVerticalPosition(estimatedHeight),
      width: estimatedWidth,
      height: estimatedHeight,
      angle: 0,
      zIndex: 10,
      opacity: 1,
      flip: null,
      text: cue.text,
      style: {
        fontSize: preset.style.fontSize,
        fontFamily: preset.style.fontFamily,
        fontWeight: preset.style.fontWeight,
        fontStyle: 'normal',
        color: preset.style.color,
        align: preset.style.align,
        fontUrl: preset.style.fontUrl,
        ...(preset.style.stroke && {
          stroke: preset.style.stroke,
        }),
        ...(preset.style.shadow && {
          shadow: preset.style.shadow,
        }),
      },
      caption: {
        words: captionWords,
        colors: preset.colors,
        preserveKeywordColor: false,
        positioning: {
          videoWidth,
          videoHeight,
        },
      },
      wordsPerLine: 'multiple', // Both karaoke and phrase use multiple words
    };

    clips.push(clip);
  }

  return clips;
}
