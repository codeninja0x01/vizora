import {
  clearTemplateConversations,
  MAX_CONVERSATIONS_PER_USER,
  setTemplateConversation,
} from '@/lib/ai/template-conversations';
import { afterEach, describe, expect, it } from 'vitest';

describe('template conversation storage limits', () => {
  afterEach(() => {
    clearTemplateConversations();
  });

  it('rejects new conversations when a user exceeds the per-user limit', () => {
    for (let index = 0; index < MAX_CONVERSATIONS_PER_USER; index += 1) {
      const result = setTemplateConversation(
        `conversation-${index}`,
        [],
        'u-1'
      );
      expect(result.ok).toBe(true);
    }

    const overflowResult = setTemplateConversation(
      'conversation-overflow',
      [],
      'u-1'
    );

    expect(overflowResult).toEqual({
      ok: false,
      error:
        'You have too many active conversations. Please finish or wait for existing conversations to expire.',
    });
  });

  it('allows updates to an existing conversation even after the limit is reached', () => {
    for (let index = 0; index < MAX_CONVERSATIONS_PER_USER; index += 1) {
      const result = setTemplateConversation(
        `conversation-${index}`,
        [],
        'u-1'
      );
      expect(result.ok).toBe(true);
    }

    const updateResult = setTemplateConversation('conversation-0', [], 'u-1');

    expect(updateResult.ok).toBe(true);
  });
});
