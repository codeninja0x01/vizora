import { type NextRequest, NextResponse } from 'next/server';
import { TemplateGenerationService } from '@/lib/ai/services/template-generation-service';
import type { MergeFieldSuggestion } from '@/lib/ai/utils/merge-field-detector';
import type Anthropic from '@anthropic-ai/sdk';

/**
 * In-memory conversation storage (shared with generation endpoint)
 * For production, consider Redis or database storage
 */
interface ConversationEntry {
  history: Anthropic.MessageParam[];
  expiresAt: number;
}

// Use the same Map as the generation endpoint (in production, use shared storage)
// For now, we'll create a separate instance, but in practice you'd want to share this
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

/**
 * POST /api/ai/template/refine
 * Refine an existing template based on user feedback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, prompt, currentTemplate } = body;

    // Validate inputs
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'conversationId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (prompt.length < 1 || prompt.length > 500) {
      return NextResponse.json(
        { error: 'Prompt must be between 1 and 500 characters' },
        { status: 400 }
      );
    }

    if (!currentTemplate || typeof currentTemplate !== 'object') {
      return NextResponse.json(
        { error: 'currentTemplate is required and must be an object' },
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

    // Get conversation history
    let conversationHistory: Anthropic.MessageParam[] = [];
    const conversation = conversations.get(conversationId);

    if (conversation && conversation.expiresAt > Date.now()) {
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

    // Update conversation history with extended TTL
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes from now
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
