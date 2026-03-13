import { chatFlow } from '@/genkit/chat-flow';
import { appRoute } from '@genkit-ai/next';
import { withAIAuth } from '@/lib/ai-middleware';
import type { NextRequest } from 'next/server';

const chatHandler = appRoute(chatFlow);

export async function POST(req: NextRequest) {
  const authResult = await withAIAuth('chat/editor')(req);
  if (authResult instanceof Response) return authResult;
  return chatHandler(req);
}
