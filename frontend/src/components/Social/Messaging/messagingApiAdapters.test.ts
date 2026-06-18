import { describe, expect, it } from 'vitest';
import {
  normalizeConversationsPayload,
  normalizeMessagesPayload,
  normalizeSearchUsersPayload,
  participantDisplayName,
} from './messagingApiAdapters';

describe('messaging API adapters', () => {
  it('keeps raw production search arrays visible in the people picker', () => {
    const users = normalizeSearchUsersPayload([
      {
        id: 42,
        name: 'Jane Doe',
        username: 'jane',
        photo: null,
        role: 'user',
        lastActive: '2026-06-18T10:00:00.000Z',
      },
    ]);

    expect(users).toEqual([
      expect.objectContaining({
        id: 42,
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: 'Jane Doe',
        role: 'client',
      }),
    ]);
  });

  it('normalizes raw conversation arrays with legacy participant names', () => {
    const conversations = normalizeConversationsPayload([
      {
        id: 7,
        type: 'direct',
        participants: [{ id: 9, name: 'Sean Swan', photo: null, role: 'admin' }],
        lastMessage: { content: 'Great session today', timestamp: '2026-06-18T12:00:00.000Z', sender_id: 9 },
        unreadCount: '2',
      },
    ]);

    expect(conversations[0].unreadCount).toBe(2);
    expect(participantDisplayName(conversations[0].participants[0])).toBe('Sean Swan');
    expect(conversations[0].lastMessage?.created_at).toBe('2026-06-18T12:00:00.000Z');
  });

  it('sorts raw message history into readable oldest-first order', () => {
    const messages = normalizeMessagesPayload([
      { id: 2, conversation_id: 7, sender_id: 9, content: 'Second', created_at: '2026-06-18T12:05:00.000Z' },
      { id: 1, conversation_id: 7, sender_id: 42, content: 'First', created_at: '2026-06-18T12:00:00.000Z' },
    ]);

    expect(messages.map((message) => message.content)).toEqual(['First', 'Second']);
  });
});
