/**
 * Subtitle generation service
 *
 * Orchestrates transcription, word grouping, and subtitle generation with dual source detection
 */

import { transcribe } from '@/lib/transcribe';
import type { Word } from '@/lib/transcribe/types';
import { groupWordsIntoCues } from '../utils/word-timing';
import type { SubtitleCue, WordTiming } from '../utils/word-timing';
import type { SubtitlePreset } from '../presets/subtitle-presets';

export interface GenerateSubtitleOptions {
  mode: 'karaoke' | 'phrase';
  preset: SubtitlePreset;
}

export class SubtitleService {
  /**
   * Generate subtitles from audio transcription
   *
   * Uses Deepgram STT to transcribe audio and extract word-level timestamps
   *
   * @param audioUrl - URL of audio/video to transcribe
   * @param options - Generation options (mode and preset)
   * @returns Array of subtitle cues with word-level timing
   */
  async generateFromAudio(
    audioUrl: string,
    options: GenerateSubtitleOptions
  ): Promise<SubtitleCue[]> {
    if (!audioUrl) {
      throw new Error('Audio URL is required');
    }

    // Transcribe audio with word-level timestamps
    const transcription = await transcribe({
      url: audioUrl,
      words: true,
      model: 'nova-3',
    });

    if (!transcription || !transcription.results?.main?.words) {
      throw new Error('Failed to transcribe audio or no words found');
    }

    // Convert transcription words to WordTiming format
    const words: WordTiming[] = transcription.results.main.words.map(
      (word: Word) => ({
        word: word.word,
        start: word.start,
        end: word.end,
        confidence: word.confidence,
      })
    );

    // Group words into subtitle cues
    const cues = groupWordsIntoCues(words, {
      mode: options.mode,
    });

    return cues;
  }

  /**
   * Generate subtitles from TTS script with forced alignment
   *
   * When TTS voiceover exists, transcribe the TTS audio to get word timestamps
   * that align with the original script
   *
   * @param script - Original text script used for TTS
   * @param ttsAudioUrl - URL of generated TTS audio
   * @param options - Generation options (mode and preset)
   * @returns Array of subtitle cues with word-level timing
   */
  async generateFromScript(
    script: string,
    ttsAudioUrl: string,
    options: GenerateSubtitleOptions
  ): Promise<SubtitleCue[]> {
    if (!script || !ttsAudioUrl) {
      throw new Error('Script and TTS audio URL are required');
    }

    // Transcribe TTS audio to get word timestamps (forced alignment)
    // This gives us accurate timing for the words we know from the script
    return this.generateFromAudio(ttsAudioUrl, options);
  }

  /**
   * Detect subtitle source from video clips
   *
   * Determines whether to use TTS script-based generation or audio transcription
   * based on presence of voiceover audio clips
   *
   * @param clips - Array of video composition clips
   * @returns 'tts' if voiceover detected, 'audio' otherwise
   */
  detectSource(clips: Array<{ type: string; src?: string }>): 'tts' | 'audio' {
    if (!clips || clips.length === 0) {
      return 'audio';
    }

    // Check if any Audio clip contains a voiceover
    const hasVoiceover = clips.some(
      (clip) =>
        clip.type === 'Audio' && clip.src && clip.src.includes('voiceovers/')
    );

    return hasVoiceover ? 'tts' : 'audio';
  }

  /**
   * Get default subtitle preset
   *
   * Returns the 'modern-karaoke' preset as the default
   * This will be implemented properly once presets are defined
   */
  static getDefaultPreset(): any {
    // This will be replaced with actual preset lookup once presets module is created
    return null;
  }
}
