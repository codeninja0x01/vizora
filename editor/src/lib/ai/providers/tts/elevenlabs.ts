import type { AIProvider } from '@/lib/ai/types';
import { parsePauseMarkers } from '@/lib/ai/utils/pause-markers';
import type { ITTSProvider, TTSRequest, Voice } from './types';

interface ElevenLabsConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
  labels?: {
    accent?: string;
    gender?: string;
  };
}

export class ElevenLabsProvider implements ITTSProvider {
  private config: ElevenLabsConfig;

  constructor(config: Partial<ElevenLabsConfig>) {
    this.config = {
      apiKey: config.apiKey || process.env.ELEVENLABS_API_KEY || '',
      baseUrl:
        config.baseUrl ||
        process.env.ELEVENLABS_URL ||
        'https://api.elevenlabs.io',
      model:
        config.model ||
        process.env.ELEVENLABS_MODEL ||
        'eleven_multilingual_v2',
    };

    if (!this.config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
  }

  getProvider(): AIProvider {
    return 'elevenlabs';
  }

  async listVoices(): Promise<Voice[]> {
    const response = await fetch(`${this.config.baseUrl}/v1/voices`, {
      headers: {
        'xi-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ElevenLabs voices: ${response.statusText}`
      );
    }

    const data = await response.json();
    const voices = data.voices as ElevenLabsVoice[];

    return voices.map((voice) => ({
      id: voice.voice_id,
      name: voice.name,
      previewUrl: voice.preview_url,
      provider: 'elevenlabs' as AIProvider,
      language: voice.labels?.accent,
      gender: voice.labels?.gender,
    }));
  }

  async synthesize(request: TTSRequest): Promise<ArrayBuffer> {
    const textWithSSML = parsePauseMarkers(request.text);

    const response = await fetch(
      `${this.config.baseUrl}/v1/text-to-speech/${request.voiceId}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          text: textWithSSML,
          model_id: this.config.model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs synthesis failed: ${errorText}`);
    }

    return response.arrayBuffer();
  }
}
