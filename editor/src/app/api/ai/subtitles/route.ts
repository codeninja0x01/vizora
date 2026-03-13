/**
 * Subtitle generation API endpoint
 *
 * POST /api/ai/subtitles - Generate subtitles from audio with word-level timing
 */

import { type NextRequest, NextResponse } from 'next/server';
import { SubtitleService } from '@/lib/ai/services/subtitle-service';
import {
  getPresetById,
  getDefaultPreset,
} from '@/lib/ai/presets/subtitle-presets';
import {
  generateWebVTT,
  generateSubtitleClipData,
} from '@/lib/ai/utils/webvtt-generator';
import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import { z } from 'zod';

const subtitlesSchema = z.object({
  audioUrl: z.string().url(),
  presetId: z.string().max(64).optional(),
  mode: z.enum(['karaoke', 'phrase']).optional(),
  videoWidth: z.number().int().min(1).max(7680).optional(),
  videoHeight: z.number().int().min(1).max(4320).optional(),
  format: z.enum(['clips', 'webvtt']).optional(),
});

/**
 * POST /api/ai/subtitles
 *
 * Generate subtitles from audio URL
 *
 * Request body:
 * - audioUrl: URL of audio/video to transcribe (required)
 * - presetId: Subtitle preset ID (optional, default: 'modern-karaoke')
 * - mode: Override preset mode (optional)
 * - videoWidth: Canvas width for positioning (optional, default: 1920)
 * - videoHeight: Canvas height for positioning (optional, default: 1080)
 * - format: Output format 'clips' or 'webvtt' (optional, default: 'clips')
 *
 * Response:
 * - format='clips': { clips: any[], cues: SubtitleCue[] }
 * - format='webvtt': { webvtt: string }
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = subtitlesSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const {
      audioUrl,
      presetId: rawPresetId,
      mode,
      videoWidth: rawVideoWidth,
      videoHeight: rawVideoHeight,
      format: rawFormat,
    } = parsed.data;

    // Resolve preset
    const presetId = rawPresetId || 'modern-karaoke';
    let preset = getPresetById(presetId);

    if (!preset) {
      // Fallback to default if preset not found
      preset = getDefaultPreset();
    }

    // Override mode if provided
    if (mode) {
      preset = {
        ...preset,
        mode,
      };
    }

    // Set defaults for video dimensions
    const videoWidth = rawVideoWidth || 1920;
    const videoHeight = rawVideoHeight || 1080;
    const format = rawFormat || 'clips';

    // Generate subtitles
    const service = new SubtitleService();
    const cues = await service.generateFromAudio(audioUrl, {
      mode: preset.mode,
      preset,
    });

    // Return format based on request
    if (format === 'webvtt') {
      const webvtt = generateWebVTT(cues);
      return NextResponse.json({ webvtt });
    } else {
      // Default: return clip data
      const clips = generateSubtitleClipData(
        cues,
        preset,
        videoWidth,
        videoHeight
      );
      return NextResponse.json({ clips, cues });
    }
  } catch (error) {
    console.error('Subtitle generation error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Deepgram API key not configured' },
          { status: 500 }
        );
      }

      if (error.message.includes('transcribe')) {
        return NextResponse.json(
          { error: 'Failed to transcribe audio' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate subtitles' },
      { status: 500 }
    );
  }
}
