import { chatFlow } from '@/genkit/chat-flow';
import { appRoute } from '@genkit-ai/next';
import { requireSession, unauthorizedResponse } from '@/lib/require-session';
import type { NextRequest } from 'next/server';

const chatHandler = appRoute(chatFlow);

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorizedResponse();
  return chatHandler(req);
}
