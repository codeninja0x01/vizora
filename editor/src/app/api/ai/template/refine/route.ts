import { type NextRequest, NextResponse } from 'next/server';
import { TemplateGenerationService } from '@/lib/ai/services/template-generation-service';
import { withAIAuth } from '@/lib/ai-middleware';
import { zodErrorResponse } from '@/lib/require-session';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const refineSchema = z.object({
  conversationId: z.string().uuid(),
  prompt: z.string().min(1).max(500),
  currentTemplate: z.record(z.string(), z.unknown()),
});

/**
 * POST /api/ai/template/refine
 * Refine an existing template based on user feedback
 */
export async function POST(request: NextRequest) {
  const authResult = await withAIAuth('ai/template/refine')(request);
  if (authResult instanceof Response) return authResult;
  const { session } = authResult;

  try {
    const body = await request.json();
    const parsed = refineSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { prompt, currentTemplate } = parsed.data;

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

    // Refine template (stateless — no conversation history)
    const conversationHistory: Anthropic.MessageParam[] = [];

    const service = new TemplateGenerationService({ apiKey });
    const result = await service.refine(
      currentTemplate,
      prompt,
      conversationHistory
    );

    return NextResponse.json(
      {
        template: result.template,
        mergeFields: result.mergeFields,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Template refinement error:', error);

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('AI template refinement failed')) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          error: `Template refinement failed: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during template refinement' },
      { status: 500 }
    );
  }
}
