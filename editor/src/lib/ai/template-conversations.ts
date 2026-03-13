import type Anthropic from '@anthropic-ai/sdk';

export interface ConversationEntry {
  history: Anthropic.MessageParam[];
  expiresAt: number;
  userId: string;
}

export const MAX_CONVERSATIONS = 1000;
export const MAX_CONVERSATIONS_PER_USER = 10;
export const CONVERSATION_TTL_MS = 30 * 60 * 1000;
export const CONVERSATION_LIMIT_ERROR =
  'Too many active conversations. Please try again later.';
export const USER_CONVERSATION_LIMIT_ERROR =
  'You have too many active conversations. Please finish or wait for existing conversations to expire.';

const conversations = new Map<string, ConversationEntry>();

export function getTemplateConversation(conversationId: string) {
  cleanupExpiredTemplateConversations();
  return conversations.get(conversationId) ?? null;
}

export function setTemplateConversation(
  conversationId: string,
  history: Anthropic.MessageParam[],
  userId: string
):
  | { ok: true; expiresAt: number }
  | {
      ok: false;
      error:
        | typeof CONVERSATION_LIMIT_ERROR
        | typeof USER_CONVERSATION_LIMIT_ERROR;
    } {
  cleanupExpiredTemplateConversations();

  const existingConversation = conversations.get(conversationId);
  const isNewConversation = !existingConversation;

  if (isNewConversation && conversations.size >= MAX_CONVERSATIONS) {
    return { ok: false, error: CONVERSATION_LIMIT_ERROR };
  }

  if (
    isNewConversation &&
    countUserTemplateConversations(userId) >= MAX_CONVERSATIONS_PER_USER
  ) {
    return { ok: false, error: USER_CONVERSATION_LIMIT_ERROR };
  }

  const expiresAt = Date.now() + CONVERSATION_TTL_MS;
  conversations.set(conversationId, {
    history,
    expiresAt,
    userId,
  });

  return { ok: true, expiresAt };
}

export function cleanupExpiredTemplateConversations(now = Date.now()) {
  for (const [id, entry] of conversations.entries()) {
    if (entry.expiresAt < now) {
      conversations.delete(id);
    }
  }
}

export function countUserTemplateConversations(userId: string) {
  let count = 0;

  for (const entry of conversations.values()) {
    if (entry.userId === userId) {
      count += 1;
    }
  }

  return count;
}

export function clearTemplateConversations() {
  conversations.clear();
}

export { conversations as templateConversations };

setInterval(
  () => {
    cleanupExpiredTemplateConversations();
  },
  5 * 60 * 1000
);
