import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCommunicationCenter } from './useCommunicationCenter';
import { useNotificationCenter } from './useNotificationCenter';
import type { Notification } from '../store/slices/notificationSlice';

vi.mock('./useNotificationCenter', () => ({
  useNotificationCenter: vi.fn(),
}));

const mockedUseNotificationCenter = vi.mocked(useNotificationCenter);

const notification = (overrides: Partial<Notification>): Notification => ({
  id: String(overrides.id || 'n-1'),
  title: overrides.title || 'Notification',
  message: overrides.message || 'Body',
  type: overrides.type || 'system',
  read: overrides.read ?? false,
  createdAt: overrides.createdAt || '2026-06-30T20:00:00.000Z',
  ...overrides,
});

const notificationCenterReturn = (notifications: Notification[]) => ({
  notifications,
  unreadCount: notifications.filter(item => !item.read).length,
  loading: false,
  error: null,
  refresh: vi.fn(),
  addNotification: vi.fn(),
  markAsRead: vi.fn(),
  markAsClicked: vi.fn(),
  snoozeNotification: vi.fn(),
  markAllAsRead: vi.fn(),
  removeNotification: vi.fn(),
  clearNotifications: vi.fn(),
});

describe('useCommunicationCenter', () => {
  beforeEach(() => {
    mockedUseNotificationCenter.mockReset();
  });

  it('subscribes to canonical notifications and derives Communications OS buckets', () => {
    mockedUseNotificationCenter.mockReturnValue(notificationCenterReturn([
      notification({ id: 'a1', category: 'training', requiresAction: true, actionStatus: 'open', read: false, title: 'Review workout' }),
      notification({ id: 'm1', category: 'messages', read: false, title: 'Coach message' }),
      notification({ id: 'b1', category: 'billing', read: true, title: 'Receipt posted' }),
    ]));

    const { result } = renderHook(() => useCommunicationCenter());

    expect(mockedUseNotificationCenter).toHaveBeenCalledWith({ fetchOnMount: true, subscribeToSocket: true });
    expect(result.current.unreadCount).toBe(2);
    expect(result.current.actionRequiredCount).toBe(1);
    expect(result.current.buckets.find(bucket => bucket.key === 'messages')).toMatchObject({ total: 1, unread: 1 });
    expect(result.current.activeBucket.key).toBe('action_required');
    expect(result.current.latestNotification?.title).toBe('Review workout');
  });

  it('counts read-but-open action notifications as pending action work', () => {
    mockedUseNotificationCenter.mockReturnValue(notificationCenterReturn([
      notification({ id: 'a1', category: 'training', requiresAction: true, actionStatus: 'open', read: true, title: 'Reviewed but pending' }),
      notification({ id: 'm1', category: 'messages', read: false, title: 'Coach message' }),
    ]));

    const { result } = renderHook(() => useCommunicationCenter());

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.actionRequiredCount).toBe(1);
    expect(result.current.activeBucket).toMatchObject({ key: 'action_required', total: 1, unread: 0 });
  });
  it('selects only known buckets and preserves notification-center actions', () => {
    const snoozeNotification = vi.fn();
    mockedUseNotificationCenter.mockReturnValue({
      ...notificationCenterReturn([
        notification({ id: 'm1', category: 'messages', read: false, title: 'Coach message' }),
      ]),
      snoozeNotification,
    });

    const { result } = renderHook(() => useCommunicationCenter({ initialBucket: 'messages' }));

    expect(result.current.activeBucket.key).toBe('messages');
    act(() => result.current.selectBucket('billing'));
    expect(result.current.activeBucket.key).toBe('billing');
    act(() => result.current.selectBucket('not-a-bucket'));
    expect(result.current.activeBucket.key).toBe('billing');

    void result.current.snoozeNotification('m1', 60);
    expect(snoozeNotification).toHaveBeenCalledWith('m1', 60);
  });
});