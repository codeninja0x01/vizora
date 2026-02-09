export type AIProvider = 'elevenlabs' | 'openai';

export interface AIConfig {
  elevenlabs?: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
  openai?: {
    apiKey: string;
  };
}
