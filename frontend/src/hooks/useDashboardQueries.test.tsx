import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreatePost, useNotificationSummary } from './useDashboardQueries';
import { useNotificationCenter } from './useNotificationCenter';
import type { Notification } from '../store/slices/notificationSlice';

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { get: mockGet, post: mockPost },
    user: { id: 'client-1', role: 'client' },
  }),
}));

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

const centerReturn = (notifications: Notification[] = [], overrides: Partial<ReturnType<typeof useNotificationCenter>> = {}) => ({
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
  ...overrides,
});

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCreatePost gamification invalidation', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
    mockedUseNotificationCenter.mockReset();
    mockedUseNotificationCenter.mockReturnValue(centerReturn());
  });

  it('refreshes gamification caches after a social post awards XP', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        pointsAwarded: 10,
        newBalance: 110,
        pointMessage: 'You earned 10 points for creating a training post!',
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePost(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        content: 'Logged a real training update',
        type: 'training',
        visibility: 'friends',
        media: null,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['social', 'feed'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['gamification'] });
  });
});

describe('useNotificationSummary canonical notification center contract', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
    mockedUseNotificationCenter.mockReset();
    mockedUseNotificationCenter.mockReturnValue(centerReturn());
  });

  it('keeps dashboard notification summary from owning a direct /api/notifications fetch', () => {
    const source = readFileSync(resolve(__dirname, 'useDashboardQueries.ts'), 'utf8');

    expect(source).toContain("import { useNotificationCenter } from './useNotificationCenter'");
    expect(source).toContain('useNotificationCenter({');
    expect(source).toContain('fetchOnMount: true');
    expect(source).toContain('subscribeToSocket: true');
    expect(source).not.toContain("authAxios.get('/api/notifications'");
    expect(source).not.toContain('queryKeys.notifications.summary()');
  });

  it('derives the query-like dashboard summary from canonical notification state', () => {
    const refresh = vi.fn();
    const notifications = [
      notification({ id: 'n-unread', title: 'Unread alert', read: false }),
      notification({ id: 'n-read', title: 'Read alert', read: true }),
    ];
    mockedUseNotificationCenter.mockReturnValue(centerReturn(notifications, {
      loading: true,
      error: 'notification fetch failed',
      refresh,
    }));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { result } = renderHook(() => useNotificationSummary(), {
      wrapper: makeWrapper(queryClient),
    });

    expect(mockedUseNotificationCenter).toHaveBeenCalledWith({ fetchOnMount: true, subscribeToSocket: true });
    expect(result.current.data).toEqual({ notifications, unreadCount: 1 });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('notification fetch failed');

    result.current.refetch();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
