export type AIProvider = 'elevenlabs' | 'openai';

interface AIConfig {
  elevenlabs?: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
  openai?: {
    apiKey: string;
  };
}
