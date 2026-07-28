import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import reducer, {
  addNotification,
  fetchNotifications,
  markAsClicked,
  markAsRead,
  snoozeNotification,
  normalizeNotificationDetailPayload,
  normalizeNotificationsPayload,
} from './notificationSlice';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const slicePath = join(__dirname, 'notificationSlice.ts');
const headerPath = join(__dirname, '..', '..', 'components', 'Header', 'EnhancedNotificationSection.tsx');
const centerPath = join(__dirname, '..', '..', 'hooks', 'useNotificationCenter.ts');

describe('notificationSlice API contract', () => {
  it('uses the canonical /api/notifications endpoint for every user notification mutation', () => {
    const sliceSource = readFileSync(slicePath, 'utf8');
    const headerSource = readFileSync(headerPath, 'utf8');
    const centerSource = readFileSync(centerPath, 'utf8');

    expect(sliceSource).toContain("api.get('/api/notifications')");
    expect(sliceSource).toContain('api.put(`/api/notifications/${notificationId}/read`)');
    expect(sliceSource).toContain('api.put(`/api/notifications/${notificationId}/click`)');
    expect(sliceSource).toContain('api.patch(`/api/notifications/${notificationId}/snooze`, { durationMinutes })');
    expect(sliceSource).toContain('api.patch(`/api/notifications/${notificationId}/action-status`, { status })');
    expect(sliceSource).toContain("api.put('/api/notifications/read-all')");
    expect(centerSource).toContain('api.delete(`/api/notifications/${notificationId}`)');
    expect(headerSource).not.toContain('api.delete(`/api/notifications/${id}`).catch(() => {});');
    expect(sliceSource).not.toContain('api.put(`/notifications/');
    expect(sliceSource).not.toContain("api.put('/notifications/");
    expect(headerSource).not.toContain('api.delete(`/notifications/');
  });

  it('unwraps backend successResponse data and preserves backend notification types', () => {
    const normalized = normalizeNotificationsPayload({
      success: true,
      data: {
        unreadCount: 1,
        notifications: [{
          id: 42,
          title: 'Session changed',
          message: 'Your trainer moved the session.',
          type: 'session',
          read: false,
          userId: 7,
          createdAt: '2026-06-29T00:00:00.000Z',
          sender: { firstName: 'Coach', lastName: 'Swan', photo: '/coach.jpg' },
        }],
      },
    });

    expect(normalized.unreadCount).toBe(1);
    expect(normalized.notifications[0]).toMatchObject({
      id: '42',
      type: 'session',
      userId: 7,
      sender: { name: 'Coach Swan', avatar: '/coach.jpg' },
    });
  });

  it('lets reducers consume wrapped fetch and mark-read responses', () => {
    const fetched = normalizeNotificationsPayload({
      success: true,
      data: {
        notifications: [{
          id: 'abc',
          title: 'Reward ready',
          message: 'A reward is available.',
          type: 'reward',
          read: false,
          createdAt: '2026-06-29T00:00:00.000Z',
        }],
      },
    });
    const afterFetch = reducer(undefined, fetchNotifications.fulfilled(fetched, 'req-1', undefined));
    const readPayload = normalizeNotificationDetailPayload({
      success: true,
      data: { id: 'abc', title: 'Reward ready', message: 'A reward is available.', type: 'reward', read: true },
    }, 'abc');
    const afterRead = reducer(afterFetch, markAsRead.fulfilled(readPayload, 'req-2', 'abc'));

    expect(afterFetch.notifications).toHaveLength(1);
    expect(afterFetch.unreadCount).toBe(1);
    expect(afterRead.notifications[0].read).toBe(true);
    expect(afterRead.unreadCount).toBe(0);
  });

  it('lets reducers consume notification click responses and preserve lifecycle fields', () => {
    const fetched = normalizeNotificationsPayload({
      success: true,
      data: {
        notifications: [{
          id: 'click-1',
          title: 'Trainer message',
          message: 'Open the conversation.',
          type: 'message',
          read: false,
          createdAt: '2026-06-30T00:00:00.000Z',
        }],
      },
    });
    const afterFetch = reducer(undefined, fetchNotifications.fulfilled(fetched, 'req-click-fetch', undefined));
    const clickedPayload = normalizeNotificationDetailPayload({
      success: true,
      data: {
        id: 'click-1',
        title: 'Trainer message',
        message: 'Open the conversation.',
        type: 'message',
        read: true,
        status: 'read',
        clickedAt: '2026-06-30T12:00:00.000Z',
      } as any,
    }, 'click-1');
    const afterClick = reducer(afterFetch, markAsClicked.fulfilled(clickedPayload, 'req-click', 'click-1'));

    expect(afterClick.notifications[0]).toMatchObject({
      read: true,
      status: 'read',
      clickedAt: '2026-06-30T12:00:00.000Z',
    });
    expect(afterClick.unreadCount).toBe(0);
  });
  it('removes active snoozed notifications from local unread state', () => {
    const fetched = normalizeNotificationsPayload({
      success: true,
      data: {
        unreadCount: 1,
        notifications: [{
          id: 'snooze-1',
          title: 'Waiver pending',
          message: 'Review required.',
          type: 'system',
          read: false,
          createdAt: '2026-06-30T00:00:00.000Z',
        }],
      },
    });
    const afterFetch = reducer(undefined, fetchNotifications.fulfilled(fetched, 'req-snooze-fetch', undefined));
    const snoozedPayload = normalizeNotificationDetailPayload({
      success: true,
      data: {
        id: 'snooze-1',
        title: 'Waiver pending',
        message: 'Review required.',
        type: 'system',
        read: true,
        status: 'snoozed',
        actionStatus: 'snoozed',
      } as any,
    }, 'snooze-1');
    const afterSnooze = reducer(
      afterFetch,
      snoozeNotification.fulfilled(snoozedPayload, 'req-snooze', { notificationId: 'snooze-1', durationMinutes: 30 }),
    );

    expect(afterSnooze.notifications).toHaveLength(0);
    expect(afterSnooze.unreadCount).toBe(0);
  });

  it('dedupes repeated realtime notifications by id without inflating unread count', () => {
    const payload = {
      id: 'socket-1',
      title: 'New message',
      message: 'Coach sent a message.',
      type: 'message' as const,
      read: false,
      createdAt: '2026-06-30T00:00:00.000Z',
    };

    const once = reducer(undefined, addNotification(payload));
    const twice = reducer(once, addNotification({ ...payload, message: 'Coach sent a message again.' }));

    expect(twice.notifications).toHaveLength(1);
    expect(twice.notifications[0].message).toBe('Coach sent a message again.');
    expect(twice.unreadCount).toBe(1);
  });

  it('preserves enterprise communication metadata for action-required and billing/community buckets', () => {
    const normalized = normalizeNotificationsPayload({
      success: true,
      data: {
        notifications: [
          {
            id: 'waiver-1',
            title: 'Waiver pending',
            message: 'Review required.',
            type: 'system',
            category: 'training',
            requiresAction: true,
            actionStatus: 'pending',
            priority: 'critical',
            actions: [
              { label: 'Review waiver', type: 'link', href: '/dashboard/waivers' },
              { label: 'Snooze', type: 'snooze', durationMinutes: 30 },
            ],
            link: '/dashboard/waivers',
            read: false,
            createdAt: '2026-06-30T00:00:00.000Z',
          },
          {
            id: 'payment-1',
            title: 'Payment issue',
            message: 'Card needs review.',
            type: 'order',
            link: '/dashboard/billing',
            read: true,
            createdAt: '2026-06-30T00:00:00.000Z',
          },
          {
            id: 'community-1',
            title: 'Challenge reply',
            message: 'A member replied.',
            type: 'social',
            link: '/community/challenges',
            read: false,
            createdAt: '2026-06-30T00:00:00.000Z',
          },
        ],
      },
    });

    expect(normalized.notifications[0]).toMatchObject({
      category: 'action_required',
      requiresAction: true,
      actionStatus: 'pending',
      priority: 'critical',
      actionLabel: 'Review waiver',
      actions: [
        { label: 'Review waiver', type: 'link', href: '/dashboard/waivers' },
        { label: 'Snooze', type: 'snooze', durationMinutes: 30 },
      ],
    });
    expect(normalized.notifications[1]).toMatchObject({
      category: 'billing',
      actionLabel: 'Review billing',
    });
    expect(normalized.notifications[2]).toMatchObject({
      category: 'community',
      actionLabel: 'View community',
    });
  });
  it('preserves achievements and admin as first-class notification categories', () => {
    const normalized = normalizeNotificationsPayload({
      success: true,
      data: {
        notifications: [
          {
            id: 'achievement-1',
            title: 'Badge unlocked',
            message: 'A new milestone is ready.',
            type: 'achievement',
            link: '/dashboard/client/achievements',
            read: false,
            createdAt: '2026-06-30T00:00:00.000Z',
          },
          {
            id: 'admin-1',
            title: 'Admin signal',
            message: 'Review operational alert.',
            type: 'admin',
            link: '/dashboard/admin/communications',
            read: false,
            createdAt: '2026-06-30T00:00:00.000Z',
          },
        ],
      },
    });

    expect(normalized.notifications[0]).toMatchObject({
      category: 'achievements',
      actionLabel: 'View achievements',
    });
    expect(normalized.notifications[1]).toMatchObject({
      category: 'admin',
      actionLabel: 'Review admin signal',
    });
  });
});
