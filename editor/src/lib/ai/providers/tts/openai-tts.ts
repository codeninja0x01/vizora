import type { AIProvider } from '@/lib/ai/types';
import { stripPauseMarkers } from '@/lib/ai/utils/pause-markers';
import OpenAI from 'openai';
import type { ITTSProvider, TTSRequest, Voice } from './types';

interface OpenAITTSConfig {
  apiKey: string;
}

const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', language: 'en-US', gender: 'neutral' },
  { id: 'ash', name: 'Ash', language: 'en-US', gender: 'neutral' },
  { id: 'ballad', name: 'Ballad', language: 'en-US', gender: 'neutral' },
  { id: 'coral', name: 'Coral', language: 'en-US', gender: 'female' },
  { id: 'echo', name: 'Echo', language: 'en-US', gender: 'male' },
  { id: 'fable', name: 'Fable', language: 'en-US', gender: 'neutral' },
  { id: 'nova', name: 'Nova', language: 'en-US', gender: 'female' },
  { id: 'onyx', name: 'Onyx', language: 'en-US', gender: 'male' },
  { id: 'sage', name: 'Sage', language: 'en-US', gender: 'neutral' },
  { id: 'shimmer', name: 'Shimmer', language: 'en-US', gender: 'female' },
];

export class OpenAITTSProvider implements ITTSProvider {
  private client: OpenAI;

  constructor(config: Partial<OpenAITTSConfig>) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({ apiKey });
  }

  getProvider(): AIProvider {
    return 'openai';
  }

  async listVoices(): Promise<Voice[]> {
    return OPENAI_VOICES.map((voice) => ({
      id: voice.id,
      name: voice.name,
      provider: 'openai' as AIProvider,
      language: voice.language,
      gender: voice.gender,
    }));
  }

  async synthesize(request: TTSRequest): Promise<ArrayBuffer> {
    const cleanText = stripPauseMarkers(request.text);

    const response = await this.client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: request.voiceId as any,
      input: cleanText,
      speed: request.speed || 1.0,
    });

    return response.arrayBuffer();
  }
}
