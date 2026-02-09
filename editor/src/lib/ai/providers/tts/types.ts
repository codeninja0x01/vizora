import type { AIProvider } from '@/lib/ai/types';

export interface Voice {
  id: string;
  name: string;
  previewUrl?: string;
  provider: AIProvider;
  language?: string;
  gender?: string;
}

export interface TTSRequest {
  text: string;
  voiceId: string;
  speed?: number;
  provider: AIProvider;
}

export interface TTSResponse {
  audioUrl: string;
  duration: number;
  format: 'mp3' | 'wav';
  provider: string;
}

export interface ITTSProvider {
  listVoices(): Promise<Voice[]>;
  synthesize(request: TTSRequest): Promise<ArrayBuffer>;
  getProvider(): AIProvider;
}
