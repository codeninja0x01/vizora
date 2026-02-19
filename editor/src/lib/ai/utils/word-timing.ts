/**
 * Word timing utilities for subtitle generation
 *
 * Handles grouping words into phrase-level cues with sentence boundary detection
 * and timing drift compensation
 */

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SubtitleCue {
  id: number;
  start: number;
  end: number;
  text: string;
  words: WordTiming[];
  mode: 'karaoke' | 'phrase';
}

export interface GroupWordsOptions {
  maxDuration?: number; // Maximum duration per cue in seconds (default: 5)
  maxWords?: number; // Maximum words per cue (default: 10)
  mode: 'karaoke' | 'phrase';
}

const SENTENCE_ENDINGS = ['.', '!', '?'];
const MAX_WORD_GAP = 1.5; // seconds - if gap between words exceeds this, start new cue
const TIMING_OFFSET = 0.05; // 50ms offset adjustment for timing drift compensation

/**
 * Check if a word ends with a sentence boundary marker
 */
function isSentenceEnding(word: string): boolean {
  if (!word || word.length === 0) return false;
  const lastChar = word.charAt(word.length - 1);
  return SENTENCE_ENDINGS.includes(lastChar);
}

/**
 * Group words into phrase-level subtitle cues
 *
 * Applies intelligent grouping based on:
 * - Sentence boundaries (period, exclamation, question mark)
 * - Word gaps (pauses > 1.5s trigger new cue)
 * - Maximum duration (default 5 seconds)
 * - Maximum words per cue (default 10)
 *
 * @param words - Array of word timings from transcription
 * @param options - Grouping options
 * @returns Array of subtitle cues sorted by start time
 */
export function groupWordsIntoCues(
  words: WordTiming[],
  options: GroupWordsOptions
): SubtitleCue[] {
  const { maxDuration = 5, maxWords = 10, mode } = options;

  if (!words || words.length === 0) {
    return [];
  }

  const cues: SubtitleCue[] = [];
  let currentCue: WordTiming[] = [];
  let cueStartTime = 0;
  let cueId = 1;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const _nextWord = words[i + 1];

    // Apply timing offset adjustment
    const adjustedWord: WordTiming = {
      ...word,
      start: Math.max(0, word.start - TIMING_OFFSET),
      end: Math.max(0, word.end - TIMING_OFFSET),
    };

    // Start new cue if this is the first word
    if (currentCue.length === 0) {
      cueStartTime = adjustedWord.start;
      currentCue.push(adjustedWord);
      continue;
    }

    const currentDuration = adjustedWord.end - cueStartTime;
    const wordCount = currentCue.length;
    const lastWord = currentCue[currentCue.length - 1];
    const wordGap = adjustedWord.start - lastWord.end;

    // Check if we should start a new cue
    const shouldStartNewCue =
      // Exceeded max duration
      currentDuration >= maxDuration ||
      // Exceeded max words
      wordCount >= maxWords ||
      // Large gap between words (pause detected)
      wordGap > MAX_WORD_GAP ||
      // Previous word ended a sentence
      isSentenceEnding(lastWord.word);

    if (shouldStartNewCue) {
      // Finalize current cue
      const cueEnd = lastWord.end;
      const cueText = currentCue.map((w) => w.word).join(' ');

      cues.push({
        id: cueId++,
        start: cueStartTime,
        end: cueEnd,
        text: cueText,
        words: currentCue,
        mode,
      });

      // Start new cue
      currentCue = [adjustedWord];
      cueStartTime = adjustedWord.start;
    } else {
      // Add word to current cue
      currentCue.push(adjustedWord);
    }
  }

  // Finalize last cue if it has words
  if (currentCue.length > 0) {
    const lastWord = currentCue[currentCue.length - 1];
    const cueText = currentCue.map((w) => w.word).join(' ');

    cues.push({
      id: cueId++,
      start: cueStartTime,
      end: lastWord.end,
      text: cueText,
      words: currentCue,
      mode,
    });
  }

  return cues;
}
