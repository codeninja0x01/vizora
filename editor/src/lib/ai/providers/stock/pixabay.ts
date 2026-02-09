/**
 * Pixabay stock footage provider
 * API docs: https://pixabay.com/api/docs/
 */

import type { IStockProvider, StockClip, StockSearchOptions } from './types';

interface PixabayConfig {
  apiKey: string;
}

interface PixabayVideo {
  id: number;
  duration: number;
  tags: string;
  videos: {
    large?: {
      url: string;
      width: number;
      height: number;
    };
    medium?: {
      url: string;
      width: number;
      height: number;
    };
    small?: {
      url: string;
      width: number;
      height: number;
    };
    tiny?: {
      url: string;
      width: number;
      height: number;
      thumbnail: string;
    };
  };
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayVideo[];
}

export class PixabayProvider implements IStockProvider {
  private apiKey: string;
  private baseUrl = 'https://pixabay.com/api/videos/';

  constructor(config: PixabayConfig) {
    this.apiKey = config.apiKey;
  }

  getProvider(): 'pixabay' {
    return 'pixabay';
  }

  async search(options: StockSearchOptions): Promise<StockClip[]> {
    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        q: options.query,
        per_page: String(options.perPage || 10),
      });

      const url = `${this.baseUrl}?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `Pixabay API error: ${response.status} ${response.statusText}`
        );
        return [];
      }

      const data: PixabayResponse = await response.json();

      const clips = data.hits
        .map((v) => {
          // Prefer large, fallback to medium
          const videoUrl = v.videos.large?.url || v.videos.medium?.url;
          const width = v.videos.large?.width || v.videos.medium?.width || 1920;
          const height =
            v.videos.large?.height || v.videos.medium?.height || 1080;

          if (!videoUrl) {
            return null;
          }

          return {
            id: String(v.id),
            url: videoUrl,
            previewUrl: v.videos.tiny?.url || videoUrl,
            thumbnailUrl:
              v.videos.tiny?.thumbnail || v.videos.tiny?.url || videoUrl,
            duration: v.duration,
            width,
            height,
            tags: v.tags.split(', '),
            provider: 'pixabay' as const,
          };
        })
        .filter((clip): clip is NonNullable<typeof clip> => clip !== null);

      // Filter by minimum duration if specified
      if (options.minDuration !== undefined) {
        const minDuration = options.minDuration;
        return clips.filter((clip) => clip.duration >= minDuration);
      }

      return clips;
    } catch (error) {
      console.error('Pixabay provider error:', error);
      return [];
    }
  }
}
