import type { AIProvider } from '@/lib/ai/types';
import { ElevenLabsProvider } from './elevenlabs';
import { OpenAITTSProvider } from './openai-tts';
import type { ITTSProvider } from './types';

export function createTTSProvider(provider: AIProvider): ITTSProvider {
  switch (provider) {
    case 'elevenlabs':
      if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error('ELEVENLABS_API_KEY not configured');
      }
      return new ElevenLabsProvider({
        apiKey: process.env.ELEVENLABS_API_KEY,
      });

    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      return new OpenAITTSProvider({
        apiKey: process.env.OPENAI_API_KEY,
      });

    default:
      throw new Error(`Unsupported TTS provider: ${provider}`);
  }
}

export function getAvailableTTSProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  if (process.env.ELEVENLABS_API_KEY) {
    providers.push('elevenlabs');
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push('openai');
  }

  return providers;
}
