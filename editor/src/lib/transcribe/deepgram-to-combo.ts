import type { SyncPrerecordedResponse } from '@deepgram/sdk';
import { detectLanguage } from './detect-language';
import type { Paragraph, TranscriptObject, Word } from './types';

/** Word entry from a Deepgram prerecorded response. */
interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

/** Sentence within a Deepgram paragraph. */
interface DeepgramSentence {
  text: string;
  start: number;
  end: number;
}

/** Paragraph entry from a Deepgram prerecorded response. */
interface DeepgramParagraph {
  sentences: DeepgramSentence[];
  num_words: number;
  start: number;
  end: number;
}

const getWords = (deepgramResult: SyncPrerecordedResponse): Word[] => {
  const alternative = deepgramResult?.results?.channels?.[0]?.alternatives?.[0];
  if (!alternative?.words) {
    return [];
  }

  return alternative.words.map((w: DeepgramWord) => {
    return {
      word: w.punctuated_word ?? w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    };
  });
};

const getParagraphs = (deepgramResult: SyncPrerecordedResponse): Paragraph[] => {
  const alternative = deepgramResult?.results?.channels?.[0]?.alternatives?.[0];
  if (!alternative?.paragraphs?.paragraphs) {
    return [];
  }

  const paragraphs = alternative.paragraphs.paragraphs
    .map((p: DeepgramParagraph) => {
      return {
        sentences: p.sentences.map((s: DeepgramSentence) => {
          return {
            text: s.text,
            start: s.start,
            end: s.end,
          };
        }),
        numWords: p.num_words,
        start: p.start,
        end: p.end,
      };
    })
    .filter((p: Paragraph) => p.sentences.length > 0);

  return paragraphs;
};

export async function deepgramToCombo(
  deepgramResult: SyncPrerecordedResponse
): Promise<Partial<TranscriptObject> | null> {
  const alternative = deepgramResult?.results?.channels?.[0]?.alternatives?.[0];
  const text = alternative?.transcript;

  if (!text) {
    return null;
  }

  const language = await detectLanguage(text);
  const words = getWords(deepgramResult);
  const duration = deepgramResult?.metadata?.duration || 0;
  const paragraphs = getParagraphs(deepgramResult);

  return {
    duration,
    results: {
      main: {
        language,
        paragraphs,
        text,
        words,
      },
    },
  };
}
