import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import reducer, {
  fetchNotifications,
  markAsRead,
  normalizeNotificationDetailPayload,
  normalizeNotificationsPayload,
} from './notificationSlice';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const slicePath = join(__dirname, 'notificationSlice.ts');
const headerPath = join(__dirname, '..', '..', 'components', 'Header', 'EnhancedNotificationSection.tsx');

describe('notificationSlice API contract', () => {
  it('uses the canonical /api/notifications endpoint for every user notification mutation', () => {
    const sliceSource = readFileSync(slicePath, 'utf8');
    const headerSource = readFileSync(headerPath, 'utf8');

    expect(sliceSource).toContain("api.get('/api/notifications')");
    expect(sliceSource).toContain('api.put(`/api/notifications/${notificationId}/read`)');
    expect(sliceSource).toContain("api.put('/api/notifications/read-all')");
    expect(headerSource).toContain('api.delete(`/api/notifications/${id}`).catch(() => {});');
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
});
