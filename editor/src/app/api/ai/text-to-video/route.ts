/**
 * Text-to-video generation API endpoint
 * POST /api/ai/text-to-video
 */

import { type NextRequest, NextResponse } from 'next/server';
import { TextToVideoService } from '@/lib/ai/services/text-to-video-service';
import { getVideoStyleById } from '@/lib/ai/presets/video-style-presets';
import type { Scene } from '@/lib/ai/services/text-to-video-service';
import { withAIAuth } from '@/lib/ai-middleware';
import { zodErrorResponse } from '@/lib/require-session';
import { z } from 'zod';

const sceneSchema = z.object({
  description: z.string().min(1).max(2000),
  duration: z.number().positive().max(300),
  mood: z.string().max(100).optional(),
  textOverlay: z.string().max(500).optional(),
});

const textToVideoSchema = z.object({
  scenes: z.array(sceneSchema).min(1).max(50),
  styleId: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const authResult = await withAIAuth('ai/text-to-video')(req);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const parsed = textToVideoSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { scenes: rawScenes, styleId } = parsed.data;

    // Validate style
    const style = getVideoStyleById(styleId);
    if (!style) {
      return NextResponse.json(
        { error: `Invalid styleId: ${styleId}` },
        { status: 400 }
      );
    }

    // Check for Google Gemini API key
    if (!process.env.GOOGLE_GENAI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Create service and generate composition
    const service = new TextToVideoService();

    const scenes: Scene[] = rawScenes.map((s) => ({
      description: s.description,
      duration: s.duration,
      mood: s.mood,
      textOverlay: s.textOverlay,
    }));

    const result = await service.generateFromStoryboard(scenes, style);

    return NextResponse.json({
      composition: result.composition,
      scenesWithClips: result.scenesWithClips.map((item) => ({
        scene: item.scene,
        clip: item.clip
          ? {
              id: item.clip.id,
              url: item.clip.url,
              previewUrl: item.clip.previewUrl,
              thumbnailUrl: item.clip.thumbnailUrl,
              duration: item.clip.duration,
              width: item.clip.width,
              height: item.clip.height,
              provider: item.clip.provider,
              attribution: item.clip.attribution,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('Text-to-video generation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate video composition',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
