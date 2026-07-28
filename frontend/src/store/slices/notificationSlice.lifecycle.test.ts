import { describe, expect, it } from 'vitest';

import reducer, {
  fetchNotifications,
  normalizeNotificationDetailPayload,
  normalizeNotificationsPayload,
  resolveNotificationAction,
} from './notificationSlice';

describe('notificationSlice lifecycle reducers', () => {
  it('strips snooze durations outside the backend bounds before presenters use them', () => {
    const normalized = normalizeNotificationsPayload({
      data: {
        notifications: [{
          id: 'duration-1',
          title: 'Waiver pending',
          message: 'Review required.',
          type: 'system',
          read: false,
          createdAt: '2026-06-30T00:00:00.000Z',
          actions: [
            { label: 'Too short', type: 'snooze', durationMinutes: 1 },
            { label: 'Too long', type: 'snooze', durationMinutes: 10081 },
            { label: 'Valid', type: 'snooze', durationMinutes: 10080 },
          ],
        }],
      },
    });

    expect(normalized.notifications[0].actions).toEqual([
      { label: 'Too short', type: 'snooze' },
      { label: 'Too long', type: 'snooze' },
      { label: 'Valid', type: 'snooze', durationMinutes: 10080 },
    ]);
  });


  it('derives notification categories and action labels from canonical types and links', () => {
    const normalized = normalizeNotificationsPayload({
      success: true,
      data: {
        notifications: [
          {
            id: 'message-1',
            title: 'Coach sent a message',
            message: 'Open the conversation.',
            type: 'message',
            link: '/messages',
            read: false,
            createdAt: '2026-06-30T00:00:00.000Z',
          },
          {
            id: 'session-1',
            title: 'Session moved',
            message: 'Review your schedule.',
            type: 'session',
            link: '/user-dashboard/schedule',
            read: true,
            createdAt: '2026-06-30T00:00:00.000Z',
          },
        ],
      },
    });

    expect(normalized.notifications[0]).toMatchObject({
      category: 'messages',
      actionLabel: 'Open messages',
    });
    expect(normalized.notifications[1]).toMatchObject({
      category: 'schedule',
      actionLabel: 'View schedule',
    });
  });

  it('removes resolved action-required notifications from local active state without changing unrelated notifications', () => {
    const fetched = normalizeNotificationsPayload({
      success: true,
      data: {
        unreadCount: 2,
        notifications: [
          {
            id: 'action-1',
            title: 'Confirm session change',
            message: 'Review the change.',
            type: 'session',
            read: false,
            requiresAction: true,
            actionStatus: 'pending',
            createdAt: '2026-06-30T00:00:00.000Z',
          },
          {
            id: 'message-1',
            title: 'Coach message',
            message: 'Open the conversation.',
            type: 'message',
            read: false,
            createdAt: '2026-06-30T00:00:00.000Z',
          },
        ],
      },
    });
    const afterFetch = reducer(undefined, fetchNotifications.fulfilled(fetched, 'req-action-fetch', undefined));
    const resolvedPayload = normalizeNotificationDetailPayload({
      success: true,
      data: {
        id: 'action-1',
        title: 'Confirm session change',
        message: 'Review the change.',
        type: 'session',
        read: true,
        status: 'read',
        requiresAction: true,
        actionStatus: 'resolved',
      } as any,
    }, 'action-1');

    const afterResolve = reducer(
      afterFetch,
      resolveNotificationAction.fulfilled(resolvedPayload, 'req-action-resolve', { notificationId: 'action-1', status: 'resolved' }),
    );

    expect(afterResolve.notifications.map(item => item.id)).toEqual(['message-1']);
    expect(afterResolve.unreadCount).toBe(1);
  });
});