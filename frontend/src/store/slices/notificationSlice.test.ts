import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import reducer, {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  addNotification,
  removeNotification,
  clearNotifications,
  setUnreadCount,
  setNotificationOwner,
  normalizeNotificationDetailPayload,
  normalizeNotificationsPayload,
  type Notification,
  type NotificationState,
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
    expect(sliceSource).toContain('api.delete(`/api/notifications/${id}`)');
    expect(headerSource).toContain('dispatch(deleteNotification(id));');
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
    const ownerState = reducer(undefined, setNotificationOwner('account-a'));
    const context = { ownerKey: 'account-a', generation: ownerState.generation };
    const fetchPending = reducer(ownerState, fetchNotifications.pending('req-1', undefined));
    const afterFetch = reducer(fetchPending, fetchNotifications.fulfilled({ ...fetched, ...context }, 'req-1', undefined));
    const readPayload = normalizeNotificationDetailPayload({
      success: true,
      data: { id: 'abc', title: 'Reward ready', message: 'A reward is available.', type: 'reward', read: true },
    }, 'abc');
    const readPending = reducer(afterFetch, markAsRead.pending('req-2', 'abc'));
    const afterRead = reducer(readPending, markAsRead.fulfilled({ notification: readPayload, ...context }, 'req-2', 'abc'));

    expect(afterFetch.notifications).toHaveLength(1);
    expect(afterFetch.unreadCount).toBe(1);
    expect(afterRead.notifications[0].read).toBe(true);
    expect(afterRead.unreadCount).toBe(0);
  });

  it('deduplicates socket replay and ignores another account recipient', () => {
    const owned = {
      id: 'same-id', title: 'Owned', message: 'Owned', type: 'system' as const,
      read: false, createdAt: '2026-06-29T00:00:00.000Z', userId: 'account-a',
    };
    let state = reducer(undefined, setNotificationOwner('account-a'));
    state = reducer(state, addNotification(owned));
    state = reducer(state, addNotification({ ...owned, title: 'Replay' }));
    state = reducer(state, addNotification({ ...owned, id: 'other', userId: 'account-b' }));

    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].title).toBe('Replay');
    expect(state.unreadCount).toBe(1);
  });

  it('does not apply a late fetch result after the owner generation changes', () => {
    let state = reducer(undefined, setNotificationOwner('account-a'));
    const pending = fetchNotifications.pending('old-request', undefined);
    state = reducer(state, pending);
    const oldResult = {
      notifications: [{ id: 'old', title: 'Old', message: '', type: 'system' as const, read: false, createdAt: '2026-06-29' }],
      unreadCount: 1,
      ownerKey: 'account-a',
      generation: state.generation,
    };
    state = reducer(state, setNotificationOwner('account-b'));
    state = reducer(state, fetchNotifications.fulfilled(oldResult, 'old-request', undefined));

    expect(state.ownerKey).toBe('account-b');
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
  });

  it('rejects malformed list entries instead of inventing an id', () => {
    expect(() => normalizeNotificationsPayload({ notifications: [{ title: 'No stable id' }] })).toThrow(/stable id/i);
    expect(() => normalizeNotificationsPayload({ data: {} } as any)).toThrow(/missing its list/i);
  });

  it('accepts only the newest A→B→A generation and preserves unread state on read failure', () => {
    let state = reducer(undefined, setNotificationOwner('account-a'));
    const firstGeneration = state.generation;
    state = reducer(state, fetchNotifications.pending('a-old', undefined));
    state = reducer(state, setNotificationOwner('account-b'));
    state = reducer(state, setNotificationOwner('account-a'));
    const newestGeneration = state.generation;
    state = reducer(state, fetchNotifications.pending('a-new', undefined));
    state = reducer(state, fetchNotifications.fulfilled({
      notifications: [{ id: 'new', title: 'Newest A', message: '', type: 'system', read: false, createdAt: '2026-06-29', userId: 'account-a' }],
      unreadCount: 1, ownerKey: 'account-a', generation: firstGeneration,
    }, 'a-old', undefined));
    state = reducer(state, fetchNotifications.fulfilled({
      notifications: [{ id: 'new', title: 'Newest A', message: '', type: 'system', read: false, createdAt: '2026-06-29', userId: 'account-a' }],
      unreadCount: 1, ownerKey: 'account-a', generation: newestGeneration,
    }, 'a-new', undefined));

    expect(state.notifications.map((notification) => notification.id)).toEqual(['new']);
    const readPending = markAsRead.pending('read-request', 'new');
    state = reducer(state, readPending);
    state = reducer(state, {
      type: markAsRead.rejected.type,
      payload: { message: 'offline', ownerKey: 'account-a', generation: newestGeneration },
      meta: { requestId: 'read-request', arg: 'new', requestStatus: 'rejected' },
      error: { message: 'Rejected' },
    } as any);
    expect(state.notifications[0].read).toBe(false);
    expect(state.unreadCount).toBe(1);
    expect(state.error).toBe('offline');
  });
});

describe('AF1-02 notification snapshot ordering', () => {
  const owned: Notification = {
    id: 'owned', title: 'Owned', message: '', type: 'system', read: false,
    createdAt: '2026-09-12T00:00:00.000Z', userId: 'account-a',
  };
  const ownerState = () => reducer(undefined, setNotificationOwner('account-a'));
  const context = (state: NotificationState) => ({ ownerKey: state.ownerKey, generation: state.generation });
  const snapshot = (state: NotificationState, notifications: Notification[] = [owned]) => ({
    notifications, unreadCount: notifications.filter((item) => !item.read).length, ...context(state),
  });
  const failure = (state: NotificationState, requestId: string, message = 'stale failure') =>
    fetchNotifications.rejected(null, requestId, undefined, { message, ...context(state) });

  it.each(['older first', 'newer first'])('retains the newest result when completion order is %s', (order) => {
    let state = ownerState();
    const olderResult = snapshot(state);
    const newestResult = snapshot(state, []);
    state = reducer(state, fetchNotifications.pending('older', 'account-a'));
    state = reducer(state, fetchNotifications.pending('newest', 'account-a'));

    if (order === 'older first') {
      const stillPending = reducer(state, fetchNotifications.fulfilled(olderResult, 'older', 'account-a'));
      expect(stillPending).toBe(state);
      expect(stillPending.loading).toBe(true);
      state = stillPending;
    }
    state = reducer(state, fetchNotifications.fulfilled(newestResult, 'newest', 'account-a'));
    const settled = state;
    if (order === 'newer first') {
      state = reducer(state, fetchNotifications.fulfilled(olderResult, 'older', 'account-a'));
    }

    expect(state).toBe(settled);
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.activeFetchRequestId).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('ignores late rejection both while the newest fetch is pending and after it succeeds', () => {
    let state = ownerState();
    state = reducer(state, fetchNotifications.pending('older', 'account-a'));
    state = reducer(state, fetchNotifications.pending('newest', 'account-a'));
    expect(reducer(state, failure(state, 'older'))).toBe(state);
    state = reducer(state, fetchNotifications.fulfilled(snapshot(state), 'newest', 'account-a'));

    expect(reducer(state, failure(state, 'older'))).toBe(state);
    expect(state.error).toBeNull();
    expect(state.notifications).toEqual([owned]);
  });

  it('keeps the newest failure and cached rows when an older request later fulfills or rejects', () => {
    let state = reducer(ownerState(), addNotification(owned));
    state = reducer(state, fetchNotifications.pending('older', 'account-a'));
    state = reducer(state, fetchNotifications.pending('newest', 'account-a'));
    state = reducer(state, failure(state, 'newest', 'current failure'));

    expect(reducer(state, fetchNotifications.fulfilled(snapshot(state, []), 'older', 'account-a'))).toBe(state);
    expect(reducer(state, failure(state, 'older'))).toBe(state);
    expect(state.notifications).toEqual([owned]);
    expect(state.error).toBe('current failure');
    expect(state.loading).toBe(false);
  });

  it('ignores completion without an active pending request', () => {
    const state = ownerState();
    expect(reducer(state, fetchNotifications.fulfilled(snapshot(state), 'unstarted', 'account-a'))).toBe(state);
    expect(reducer(state, failure(state, 'unstarted'))).toBe(state);
  });

  const mutationCases = [
    ['confirmed read', (state: NotificationState) => reducer(
      reducer(state, markAsRead.pending('read', owned.id)),
      markAsRead.fulfilled({ notification: { ...owned, read: true }, ...context(state) }, 'read', owned.id),
    ), [owned.id], 0],
    ['confirmed read-all', (state: NotificationState) => reducer(
      reducer(state, markAllAsRead.pending('read-all', undefined)),
      markAllAsRead.fulfilled({ response: { success: true }, ...context(state) }, 'read-all', undefined),
    ), [owned.id], 0],
    ['confirmed delete', (state: NotificationState) => reducer(
      reducer(state, deleteNotification.pending('delete', owned.id)),
      deleteNotification.fulfilled({ id: owned.id, ...context(state) }, 'delete', owned.id),
    ), [], 0],
    ['socket addition', (state: NotificationState) => reducer(state, addNotification({ ...owned, id: 'socket-new' })), ['socket-new', owned.id], 2],
    ['socket read update', (state: NotificationState) => reducer(state, addNotification({ ...owned, read: true })), [owned.id], 0],
    ['local removal', (state: NotificationState) => reducer(state, removeNotification(owned.id)), [], 0],
    ['local clear', (state: NotificationState) => reducer(state, clearNotifications()), [], 0],
    ['socket count', (state: NotificationState) => reducer(state, setUnreadCount(3)), [owned.id], 3],
  ] as const;

  it.each(mutationCases)('protects %s from a pre-mutation REST snapshot and late rejection', (_name, mutate, ids, count) => {
    let state = reducer(ownerState(), addNotification(owned));
    const staleSnapshot = snapshot(state);
    state = reducer(state, fetchNotifications.pending('pre-mutation', 'account-a'));
    state = mutate(state);

    expect(state.notifications.map((item) => item.id)).toEqual(ids);
    expect(state.unreadCount).toBe(count);
    if (_name === 'confirmed read' || _name === 'confirmed read-all' || _name === 'socket read update') {
      expect(state.notifications[0].read).toBe(true);
    }
    const settled = state;
    state = reducer(state, fetchNotifications.fulfilled(staleSnapshot, 'pre-mutation', 'account-a'));
    expect(state).toBe(settled);
    expect(reducer(state, failure(state, 'pre-mutation'))).toBe(settled);
    expect(state.activeFetchRequestId).toBeNull();
    expect(state.loading).toBe(false);

    // Invalidation ends only the obsolete request; a subsequent refresh can still reconcile.
    state = reducer(state, fetchNotifications.pending('post-mutation', 'account-a'));
    state = reducer(state, fetchNotifications.fulfilled(snapshot(state, []), 'post-mutation', 'account-a'));
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.loading).toBe(false);
  });

  it('does not restore a confirmed deletion of a row absent from the local cache', () => {
    let state = ownerState();
    const staleSnapshot = snapshot(state);
    state = reducer(state, fetchNotifications.pending('pre-delete', 'account-a'));
    state = reducer(state, deleteNotification.pending('delete', owned.id));
    state = reducer(state, deleteNotification.fulfilled({ id: owned.id, ...context(state) }, 'delete', owned.id));

    expect(reducer(state, fetchNotifications.fulfilled(staleSnapshot, 'pre-delete', 'account-a'))).toBe(state);
    expect(state.notifications).toEqual([]);
    expect(state.loading).toBe(false);
  });

  it('keeps the current fetch eligible after a foreign socket event or rejected mutation', () => {
    let state = reducer(ownerState(), addNotification(owned));
    state = reducer(state, fetchNotifications.pending('current', 'account-a'));
    expect(reducer(state, addNotification({ ...owned, userId: 'account-b' }))).toBe(state);
    expect(reducer(state, setUnreadCount(Number.NaN))).toBe(state);
    state = reducer(state, deleteNotification.pending('delete', owned.id));
    state = reducer(state, deleteNotification.rejected(null, 'delete', owned.id, {
      id: owned.id, message: 'delete failed', ...context(state),
    }));
    expect(state.activeFetchRequestId).toBe('current');
    state = reducer(state, fetchNotifications.fulfilled(snapshot(state, []), 'current', 'account-a'));
    expect(state.notifications).toEqual([]);
  });

  it('ignores prior A fetches and mutations across A-B-A without invalidating the current A request', () => {
    let state = ownerState();
    const originalContext = context(state);
    const originalSnapshot = snapshot(state);
    state = reducer(state, fetchNotifications.pending('first-a', 'account-a'));
    state = reducer(state, markAsRead.pending('old-read', owned.id));
    state = reducer(state, deleteNotification.pending('old-delete', owned.id));
    state = reducer(state, markAllAsRead.pending('old-read-all', undefined));
    state = reducer(state, setNotificationOwner('account-b'));
    state = reducer(state, setNotificationOwner('account-a'));
    state = reducer(state, addNotification(owned));
    state = reducer(state, fetchNotifications.pending('current-a', 'account-a'));
    const currentPending = state;

    state = reducer(state, markAsRead.fulfilled({ notification: { ...owned, read: true }, ...originalContext }, 'old-read', owned.id));
    state = reducer(state, deleteNotification.fulfilled({ id: owned.id, ...originalContext }, 'old-delete', owned.id));
    state = reducer(state, markAllAsRead.fulfilled({ response: { success: true }, ...originalContext }, 'old-read-all', undefined));
    expect(state).toBe(currentPending);
    state = reducer(state, fetchNotifications.fulfilled(snapshot(state, []), 'current-a', 'account-a'));
    const currentSettled = state;
    state = reducer(state, fetchNotifications.fulfilled(originalSnapshot, 'first-a', 'account-a'));
    state = reducer(state, fetchNotifications.rejected(null, 'first-a', 'account-a', { message: 'old A failure', ...originalContext }));

    expect(state).toBe(currentSettled);
    expect(state.ownerKey).toBe('account-a');
    expect(state.generation).toBeGreaterThan(originalContext.generation);
    expect(state.notifications).toEqual([]);
    expect(state.error).toBeNull();
  });
});
