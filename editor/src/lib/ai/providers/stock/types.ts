/**
 * Stock footage provider abstraction types
 * Supports multiple stock video providers (Pexels, Pixabay)
 */

export interface StockClip {
  id: string;
  url: string;
  previewUrl: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  tags: string[];
  provider: 'pexels' | 'pixabay';
  attribution?: string;
}

export interface StockSearchOptions {
  query: string;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  minDuration?: number;
}

export interface IStockProvider {
  search(options: StockSearchOptions): Promise<StockClip[]>;
  getProvider(): 'pexels' | 'pixabay';
}
