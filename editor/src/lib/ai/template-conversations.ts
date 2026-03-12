import type Anthropic from '@anthropic-ai/sdk';

export interface ConversationEntry {
  history: Anthropic.MessageParam[];
  expiresAt: number;
  userId: string;
}

export const MAX_CONVERSATIONS = 1000;
export const MAX_CONVERSATIONS_PER_USER = 10;

const conversations = new Map<string, ConversationEntry>();

export function cleanupExpiredConversations(now = Date.now()) {
  for (const [id, entry] of conversations.entries()) {
    if (entry.expiresAt < now) {
      conversations.delete(id);
    }
  }
}

export function getConversation(conversationId: string, now = Date.now()) {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  if (conversation.expiresAt < now) {
    conversations.delete(conversationId);
    return null;
  }

  return conversation;
}

export function canStoreConversation(
  userId: string,
  existingConversationId?: string,
  now = Date.now()
) {
  cleanupExpiredConversations(now);

  const existingConversation = existingConversationId
    ? conversations.get(existingConversationId)
    : null;

  if (!existingConversation && conversations.size >= MAX_CONVERSATIONS) {
    return {
      ok: false as const,
      status: 429,
      error: 'Too many active conversations. Please try again later.',
    };
  }

  let activeConversationsForUser = 0;
  for (const [conversationId, conversation] of conversations.entries()) {
    if (conversation.userId !== userId) continue;
    if (existingConversationId && conversationId === existingConversationId) {
      continue;
    }
    activeConversationsForUser += 1;
  }

  if (
    !existingConversation &&
    activeConversationsForUser >= MAX_CONVERSATIONS_PER_USER
  ) {
    return {
      ok: false as const,
      status: 429,
      error:
        'You have too many active template conversations. Please finish or retry later.',
    };
  }

  return { ok: true as const };
}

export function setConversation(
  conversationId: string,
  conversation: ConversationEntry
) {
  conversations.set(conversationId, conversation);
}

setInterval(
  () => {
    cleanupExpiredConversations();
  },
  5 * 60 * 1000
);

export { conversations };
