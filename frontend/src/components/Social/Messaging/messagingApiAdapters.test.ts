import { describe, expect, it } from 'vitest';
import {
  normalizeConversationPayload,
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

  it('preserves group roles, viewer authority, and member counts from group payloads', () => {
    const conversation = normalizeConversationPayload({
      id: 88,
      type: 'group',
      name: 'Swan Family',
      viewerRole: 'owner',
      canManage: true,
      memberCount: '4',
      participants: [
        { id: 5, name: 'Sean Swan', role: 'admin', groupRole: 'owner' },
        { id: 9, name: 'Coach Mira', role: 'trainer', groupRole: 'admin' },
      ],
    });

    expect(conversation).toEqual(expect.objectContaining({
      type: 'group',
      name: 'Swan Family',
      viewerRole: 'owner',
      canManage: true,
      memberCount: 4,
    }));
    expect(conversation?.participants[0]).toEqual(expect.objectContaining({ groupRole: 'owner' }));
    expect(conversation?.participants[1]).toEqual(expect.objectContaining({ groupRole: 'admin' }));
  });

  it('preserves message action metadata from the backend', () => {
    const messages = normalizeMessagesPayload([
      {
        id: 9,
        conversation_id: 7,
        sender_id: 42,
        content: 'Updated plan note',
        reply_to_message_id: 3,
        edited_at: '2026-06-30T18:08:00.000Z',
        deleted_at: null,
        deleted_by: null,
        reactions: [{ id: 1, userId: 42, reaction: 'swan', createdAt: '2026-06-30T18:09:00.000Z' }],
        pins: [{ id: 2, pinnedBy: 103, createdAt: '2026-06-30T18:10:00.000Z' }],
        saves: [{ id: 3, savedBy: 103, createdAt: '2026-06-30T18:11:00.000Z' }],
      },
    ]);

    expect(messages[0]).toEqual(expect.objectContaining({
      reply_to_message_id: 3,
      edited_at: '2026-06-30T18:08:00.000Z',
      deleted_at: null,
      deleted_by: null,
      reactions: [expect.objectContaining({ userId: 42, reaction: 'swan' })],
      pins: [expect.objectContaining({ pinnedBy: 103 })],
      saves: [expect.objectContaining({ savedBy: 103 })],
    }));
  });

  it('keeps attachment-only messages visible when backend content is empty', () => {
    const messages = normalizeMessagesPayload([
      {
        id: 10,
        conversation_id: 7,
        sender_id: 42,
        content: '',
        created_at: '2026-06-30T18:12:00.000Z',
        attachments: [
          { id: 99, kind: 'link', title: 'Workout plan', url: '/dashboard/client/workouts', scanStatus: 'not_required' },
        ],
      },
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].attachments).toEqual([
      expect.objectContaining({ kind: 'link', title: 'Workout plan', url: '/dashboard/client/workouts' }),
    ]);
  });
  it('sorts raw message history into readable oldest-first order', () => {
    const messages = normalizeMessagesPayload([
      { id: 2, conversation_id: 7, sender_id: 9, content: 'Second', created_at: '2026-06-18T12:05:00.000Z' },
      { id: 1, conversation_id: 7, sender_id: 42, content: 'First', created_at: '2026-06-18T12:00:00.000Z' },
    ]);

    expect(messages.map((message) => message.content)).toEqual(['First', 'Second']);
  });
});
