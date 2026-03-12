import { type NextRequest, NextResponse } from 'next/server';
import { TemplateGenerationService } from '@/lib/ai/services/template-generation-service';
import {
  getTemplateStyleById,
  getDefaultTemplateStyle,
} from '@/lib/ai/presets/template-style-presets';
import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import { randomUUID } from 'node:crypto';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/**
 * In-memory conversation storage with TTL
 * For production, consider Redis or database storage
 */
interface ConversationEntry {
  history: Anthropic.MessageParam[];
  expiresAt: number;
}

const conversations = new Map<string, ConversationEntry>();

// Cleanup expired conversations every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [id, entry] of conversations.entries()) {
      if (entry.expiresAt < now) {
        conversations.delete(id);
      }
    }
  },
  5 * 60 * 1000
);

const templateSchema = z.object({
  prompt: z.string().min(1).max(500),
  styleId: z.string().max(64).optional(),
});

/**
 * POST /api/ai/template
 * Generate a new video template from text description and style preset
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { prompt, styleId } = parsed.data;

    // Get style preset
    const stylePreset = styleId
      ? getTemplateStyleById(styleId)
      : getDefaultTemplateStyle();

    if (!stylePreset) {
      return NextResponse.json(
        { error: `Invalid style ID: ${styleId}` },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'AI template generation is not configured. Please set ANTHROPIC_API_KEY environment variable.',
        },
        { status: 500 }
      );
    }

    // Generate template
    const service = new TemplateGenerationService({ apiKey });
    const result = await service.generate(prompt, stylePreset);

    // Store conversation history with 30-minute TTL
    const conversationId = randomUUID();
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
    conversations.set(conversationId, {
      history: result.conversationHistory,
      expiresAt,
    });

    return NextResponse.json(
      {
        template: result.template,
        mergeFields: result.mergeFields,
        conversationId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Template generation error:', error);

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('AI template generation failed')) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          error: `Template generation failed: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during template generation' },
      { status: 500 }
    );
  }
}

export { conversations };
