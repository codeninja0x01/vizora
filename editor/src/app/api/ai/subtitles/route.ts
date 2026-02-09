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

interface SubtitleRequest {
  audioUrl: string;
  presetId?: string;
  mode?: 'karaoke' | 'phrase';
  videoWidth?: number;
  videoHeight?: number;
  format?: 'clips' | 'webvtt';
}

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
  try {
    const body = (await request.json()) as SubtitleRequest;

    // Validate required fields
    if (!body.audioUrl) {
      return NextResponse.json(
        { error: 'audioUrl is required' },
        { status: 400 }
      );
    }

    // Resolve preset
    const presetId = body.presetId || 'modern-karaoke';
    let preset = getPresetById(presetId);

    if (!preset) {
      // Fallback to default if preset not found
      preset = getDefaultPreset();
    }

    // Override mode if provided
    if (body.mode) {
      preset = {
        ...preset,
        mode: body.mode,
      };
    }

    // Set defaults for video dimensions
    const videoWidth = body.videoWidth || 1920;
    const videoHeight = body.videoHeight || 1080;
    const format = body.format || 'clips';

    // Generate subtitles
    const service = new SubtitleService();
    const cues = await service.generateFromAudio(body.audioUrl, {
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
          { error: 'Failed to transcribe audio', details: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate subtitles', details: String(error) },
      { status: 500 }
    );
  }
}
