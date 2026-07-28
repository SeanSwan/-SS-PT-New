import { describe, expect, it } from 'vitest';

import {
  normalizeNotificationCreateOptions,
} from '../../services/notificationPayloadService.mjs';

describe('notificationPayloadService', () => {
  it('normalizes enterprise notification payloads and strips unsafe action links', () => {
    const payload = normalizeNotificationCreateOptions({
      userId: '42',
      senderId: '7',
      title: '  New message  ',
      message: '  Please review this thread.  ',
      type: 'message',
      category: 'messages',
      priority: 'urgent',
      status: 'unread',
      requiresAction: true,
      actionStatus: 'open',
      link: '/dashboard/client/messages?conversationId=12',
      actions: [
        { label: 'Open thread', type: 'link', href: '/dashboard/client/messages?conversationId=12' },
        { label: 'Snooze', type: 'snooze', durationMinutes: '30' },
        { label: 'Unsafe API', type: 'api', endpoint: '/api/checkins/12/complete' },
        { label: 'External', type: 'link', href: 'https://example.com/unsafe' },
        { label: 'Protocol relative', type: 'link', href: '//example.com/unsafe' },
        { label: 'Bad snooze', type: 'snooze', durationMinutes: 10081 },
      ],
      metadata: { conversationId: 12, messageId: 99 },
      groupKey: ' conversation:12 ',
      idempotencyKey: ' message:99:recipient:42 ',
      expiresAt: '2026-07-01T10:00:00.000Z',
    });

    expect(payload).toMatchObject({
      userId: 42,
      senderId: 7,
      title: 'New message',
      message: 'Please review this thread.',
      type: 'message',
      category: 'messages',
      priority: 'urgent',
      status: 'unread',
      requiresAction: true,
      actionStatus: 'open',
      groupKey: 'conversation:12',
      idempotencyKey: 'message:99:recipient:42',
      read: false,
    });
    expect(payload.actions).toEqual([
      { label: 'Open thread', type: 'link', href: '/dashboard/client/messages?conversationId=12' },
      { label: 'Snooze', type: 'snooze', durationMinutes: 30 },
    ]);
    expect(payload.metadata).toEqual({ conversationId: 12, messageId: 99 });
    expect(payload.expiresAt).toBeInstanceOf(Date);
  });

  it('falls back to safe defaults for unknown categories, priorities, statuses, and malformed JSON fields', () => {
    const payload = normalizeNotificationCreateOptions({
      userId: 4,
      title: 'Notice',
      message: 'Body',
      category: 'made_up',
      priority: 'loud',
      status: 'pending',
      actionStatus: 'unknown',
      metadata: ['not', 'an', 'object'],
      actions: 'not actions',
      idempotencyKey: 'x'.repeat(200),
    });

    expect(payload.category).toBe('system');
    expect(payload.priority).toBe('normal');
    expect(payload.status).toBe('unread');
    expect(payload.actionStatus).toBeNull();
    expect(payload.metadata).toEqual({});
    expect(payload.actions).toEqual([]);
    expect(payload.idempotencyKey).toHaveLength(160);
  });
});
