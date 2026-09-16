import { act } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock('../services/api', () => ({ default: { get: getMock, put: vi.fn(), delete: vi.fn() } }));

import { store as canonicalStore } from '../redux/store';
import { store as compatibilityStore } from '../store';
import { setUser, logout } from '../store/slices/authSlice';
import { fetchNotifications, setNotificationOwner } from '../store/slices/notificationSlice';
import { initializeNotifications } from './notificationInitializer';

const user = {
  id: 'account-a', firstName: 'A', lastName: 'User', email: 'a@example.com', role: 'client' as const,
};

describe('notification initializer account lifecycle', () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({ data: { notifications: [], unreadCount: 0 } });
    canonicalStore.dispatch(logout());
    canonicalStore.dispatch(setNotificationOwner(null));
  });

  afterEach(() => {
    canonicalStore.dispatch(logout());
    canonicalStore.dispatch(setNotificationOwner(null));
  });

  it('reexports one canonical store while keeping compatibility imports', () => {
    expect(compatibilityStore).toBe(canonicalStore);
    expect(canonicalStore.getState()).toHaveProperty('customization');
    expect(canonicalStore.getState()).toHaveProperty('menu');
    expect(canonicalStore.getState()).toHaveProperty('orientation');
  });

  it('suppresses a response from the previous account after logout', async () => {
    let resolveOldRequest!: (value: unknown) => void;
    getMock.mockReturnValueOnce(new Promise((resolve) => { resolveOldRequest = resolve; }));
    const cleanup = initializeNotifications();

    act(() => { canonicalStore.dispatch(setUser(user)); });
    expect(canonicalStore.getState().notifications.ownerKey).toBe('account-a');
    act(() => { canonicalStore.dispatch(logout()); });

    await act(async () => {
      resolveOldRequest({ data: { notifications: [{ id: 'old', title: 'Old', message: '', type: 'system', read: false, userId: 'account-a' }], unreadCount: 1 } });
      await Promise.resolve();
    });

    expect(canonicalStore.getState().notifications.ownerKey).toBeNull();
    expect(canonicalStore.getState().notifications.notifications).toEqual([]);
    cleanup();
  });

  it('filters foreign REST rows before deriving the unread badge', async () => {
    canonicalStore.dispatch(setNotificationOwner('account-a'));
    getMock.mockResolvedValueOnce({ data: {
      notifications: [
        { id: 'owned', title: 'Owned', message: '', type: 'system', read: false, userId: 'account-a' },
        { id: 'foreign', title: 'Foreign', message: '', type: 'system', read: false, userId: 'account-b' },
      ],
      unreadCount: 99,
    } });

    await act(async () => { await canonicalStore.dispatch(fetchNotifications('account-a')); });
    expect(canonicalStore.getState().notifications.notifications.map((item) => item.id)).toEqual(['owned']);
    expect(canonicalStore.getState().notifications.unreadCount).toBe(1);
  });

  it('rejects malformed REST entries visibly instead of succeeding with an empty list', async () => {
    canonicalStore.dispatch(setNotificationOwner('account-a'));
    getMock.mockResolvedValueOnce({ data: { notifications: [{ title: 'missing id', userId: 'account-a' }] } });

    let result!: Awaited<ReturnType<typeof canonicalStore.dispatch>>;
    await act(async () => { result = await canonicalStore.dispatch(fetchNotifications('account-a')); });
    expect(fetchNotifications.rejected.match(result)).toBe(true);
    expect(canonicalStore.getState().notifications.error).toMatch(/stable id/i);
  });
});
