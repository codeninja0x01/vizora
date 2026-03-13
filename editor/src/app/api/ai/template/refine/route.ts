import { type NextRequest, NextResponse } from 'next/server';
import { TemplateGenerationService } from '@/lib/ai/services/template-generation-service';
import {
  requireSession,
  unauthorizedResponse,
  zodErrorResponse,
} from '@/lib/require-session';
import type Anthropic from '@anthropic-ai/sdk';
import {
  getTemplateConversation,
  setTemplateConversation,
} from '@/lib/ai/template-conversations';
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
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = refineSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { conversationId, prompt, currentTemplate } = parsed.data;

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

    // Get conversation history
    let conversationHistory: Anthropic.MessageParam[] = [];
    const conversation = getTemplateConversation(conversationId);

    if (conversation) {
      // Use existing conversation history
      conversationHistory = conversation.history;
    } else {
      // Conversation expired or not found - start fresh with current template as context
      console.log(
        `Conversation ${conversationId} not found or expired. Starting fresh.`
      );
      // We'll pass empty history and rely on currentTemplate context
    }

    // Refine template
    const service = new TemplateGenerationService({ apiKey });
    const result = await service.refine(
      currentTemplate,
      prompt,
      conversationHistory
    );

    const storeResult = setTemplateConversation(
      conversationId,
      result.conversationHistory,
      session.user.id
    );

    if (!storeResult.ok) {
      return NextResponse.json({ error: storeResult.error }, { status: 429 });
    }

    return NextResponse.json(
      {
        template: result.template,
        mergeFields: result.mergeFields,
        conversationId,
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
