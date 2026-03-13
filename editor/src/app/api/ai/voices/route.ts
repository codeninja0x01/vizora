import {
  getAvailableTTSProviders,
  createTTSProvider,
} from '@/lib/ai/providers/tts/factory';
import type { Voice } from '@/lib/ai/providers/tts/types';
import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const voicesQuerySchema = z.object({
  provider: z.enum(['elevenlabs', 'openai']).optional(),
});

interface VoiceCache {
  voices: Voice[];
  timestamp: number;
}

let elevenLabsCache: VoiceCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const parsed = voicesQuerySchema.safeParse({
      provider: searchParams.get('provider') ?? undefined,
    });
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { provider: providerFilter } = parsed.data;

    const availableProviders = getAvailableTTSProviders();

    if (availableProviders.length === 0) {
      return NextResponse.json(
        {
          error:
            'No TTS providers configured. Please set ELEVENLABS_API_KEY or OPENAI_API_KEY.',
        },
        { status: 503 }
      );
    }

    const providersToFetch = providerFilter
      ? availableProviders.filter((p) => p === providerFilter)
      : availableProviders;

    if (providerFilter && providersToFetch.length === 0) {
      return NextResponse.json(
        { error: `Provider '${providerFilter}' is not configured or invalid.` },
        { status: 400 }
      );
    }

    const allVoices: Voice[] = [];
    const errors: string[] = [];

    for (const provider of providersToFetch) {
      try {
        let voices: Voice[];

        // Cache ElevenLabs voices to avoid hitting their API on every request
        if (provider === 'elevenlabs') {
          const now = Date.now();
          if (elevenLabsCache && now - elevenLabsCache.timestamp < CACHE_TTL) {
            voices = elevenLabsCache.voices;
          } else {
            const ttsProvider = createTTSProvider(provider);
            voices = await ttsProvider.listVoices();
            elevenLabsCache = { voices, timestamp: now };
          }
        } else {
          const ttsProvider = createTTSProvider(provider);
          voices = await ttsProvider.listVoices();
        }

        allVoices.push(...voices);
      } catch (error) {
        console.error(`Voice provider ${provider} error:`, error);
        errors.push(provider);
      }
    }

    // Return success if at least one provider succeeded
    if (allVoices.length > 0) {
      return NextResponse.json({
        voices: allVoices,
        providers: providersToFetch,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // All providers failed
    return NextResponse.json(
      { error: 'Failed to fetch voices from all providers' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Voice listing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
