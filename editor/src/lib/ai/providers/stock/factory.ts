/**
 * Stock provider factory
 * Creates and manages multiple stock footage providers
 */

import type { IStockProvider, StockClip, StockSearchOptions } from './types';
import { PexelsProvider } from './pexels';
import { PixabayProvider } from './pixabay';

/**
 * Create a stock provider instance
 */
function createStockProvider(provider: 'pexels' | 'pixabay'): IStockProvider {
  switch (provider) {
    case 'pexels': {
      const apiKey = process.env.PEXELS_API_KEY;
      if (!apiKey) {
        throw new Error('PEXELS_API_KEY not configured');
      }
      return new PexelsProvider({ apiKey });
    }
    case 'pixabay': {
      const apiKey = process.env.PIXABAY_API_KEY;
      if (!apiKey) {
        throw new Error('PIXABAY_API_KEY not configured');
      }
      return new PixabayProvider({ apiKey });
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get list of available providers (those with configured API keys)
 */
function getAvailableStockProviders(): Array<'pexels' | 'pixabay'> {
  const providers: Array<'pexels' | 'pixabay'> = [];

  if (process.env.PEXELS_API_KEY) {
    providers.push('pexels');
  }

  if (process.env.PIXABAY_API_KEY) {
    providers.push('pixabay');
  }

  return providers;
}

/**
 * Search all available providers in parallel
 * Deduplicates by URL and returns combined results
 * Pexels results come first, then Pixabay
 */
export async function searchAllStockProviders(
  options: StockSearchOptions
): Promise<StockClip[]> {
  const availableProviders = getAvailableStockProviders();

  if (availableProviders.length === 0) {
    console.warn('No stock providers configured');
    return [];
  }

  // Search all providers in parallel
  const searchPromises = availableProviders.map(async (providerName) => {
    try {
      const provider = createStockProvider(providerName);
      return await provider.search(options);
    } catch (error) {
      console.error(`Error searching ${providerName}:`, error);
      return [];
    }
  });

  const results = await Promise.all(searchPromises);

  // Flatten results, keeping provider order (Pexels first)
  const allClips = results.flat();

  // Deduplicate by URL
  const seen = new Set<string>();
  const uniqueClips = allClips.filter((clip) => {
    if (seen.has(clip.url)) {
      return false;
    }
    seen.add(clip.url);
    return true;
  });

  return uniqueClips;
}
