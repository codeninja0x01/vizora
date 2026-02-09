/**
 * Pexels stock footage provider
 * API docs: https://www.pexels.com/api/documentation/
 */

import type { IStockProvider, StockClip, StockSearchOptions } from './types';

interface PexelsConfig {
  apiKey: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string;
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
  user: {
    name: string;
  };
}

interface PexelsResponse {
  videos: PexelsVideo[];
  page: number;
  per_page: number;
  total_results: number;
}

export class PexelsProvider implements IStockProvider {
  private apiKey: string;
  private baseUrl = 'https://api.pexels.com/videos';

  constructor(config: PexelsConfig) {
    this.apiKey = config.apiKey;
  }

  getProvider(): 'pexels' {
    return 'pexels';
  }

  async search(options: StockSearchOptions): Promise<StockClip[]> {
    try {
      const params = new URLSearchParams({
        query: options.query,
        per_page: String(options.perPage || 10),
      });

      if (options.orientation) {
        params.append('orientation', options.orientation);
      }

      const url = `${this.baseUrl}/search?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!response.ok) {
        console.error(
          `Pexels API error: ${response.status} ${response.statusText}`
        );
        return [];
      }

      const data: PexelsResponse = await response.json();

      const clips = data.videos
        .map((v) => {
          // Prefer HD quality, fallback to first available
          const videoFile =
            v.video_files.find((f) => f.quality === 'hd') || v.video_files[0];

          if (!videoFile) {
            return null;
          }

          return {
            id: String(v.id),
            url: videoFile.link,
            previewUrl: v.image,
            thumbnailUrl: v.image,
            duration: v.duration,
            width: v.width,
            height: v.height,
            tags: [],
            provider: 'pexels' as const,
            attribution: `Video by ${v.user.name} from Pexels`,
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
      console.error('Pexels provider error:', error);
      return [];
    }
  }
}
