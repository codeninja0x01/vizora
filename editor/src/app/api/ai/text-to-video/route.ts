/**
 * Text-to-video generation API endpoint
 * POST /api/ai/text-to-video
 */

import { type NextRequest, NextResponse } from 'next/server';
import { TextToVideoService } from '@/lib/ai/services/text-to-video-service';
import { getVideoStyleById } from '@/lib/ai/presets/video-style-presets';
import type { Scene } from '@/lib/ai/services/text-to-video-service';

interface RequestBody {
  scenes: Array<{
    description: string;
    duration: number;
    mood?: string;
    textOverlay?: string;
  }>;
  styleId: string;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: RequestBody = await req.json();

    // Validate request
    if (
      !body.scenes ||
      !Array.isArray(body.scenes) ||
      body.scenes.length === 0
    ) {
      return NextResponse.json(
        { error: 'scenes array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!body.styleId) {
      return NextResponse.json(
        { error: 'styleId is required' },
        { status: 400 }
      );
    }

    // Validate each scene
    for (let i = 0; i < body.scenes.length; i++) {
      const scene = body.scenes[i];
      if (!scene.description || typeof scene.description !== 'string') {
        return NextResponse.json(
          { error: `Scene ${i + 1}: description is required` },
          { status: 400 }
        );
      }
      if (typeof scene.duration !== 'number' || scene.duration <= 0) {
        return NextResponse.json(
          { error: `Scene ${i + 1}: duration must be a positive number` },
          { status: 400 }
        );
      }
    }

    // Validate style
    const style = getVideoStyleById(body.styleId);
    if (!style) {
      return NextResponse.json(
        { error: `Invalid styleId: ${body.styleId}` },
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

    const scenes: Scene[] = body.scenes.map((s) => ({
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
