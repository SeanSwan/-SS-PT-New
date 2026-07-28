import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationToastBridge from './NotificationToastBridge';
import type { Notification } from '../../store/slices/notificationSlice';

const toastMock = vi.hoisted(() => vi.fn());
let notificationsMock: Notification[] = [];

vi.mock('../../hooks/useNotificationCenter', () => ({
  useNotificationCenter: vi.fn(() => ({
    notifications: notificationsMock,
    unreadCount: notificationsMock.filter((item) => !item.read).length,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addNotification: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  })),
  default: vi.fn(() => ({
    notifications: notificationsMock,
    unreadCount: notificationsMock.filter((item) => !item.read).length,
  })),
}));

vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const notification = (overrides: Partial<Notification>): Notification => ({
  id: 'n-1',
  title: 'Trainer message',
  message: 'Mira sent you a workout update.',
  type: 'message',
  read: false,
  createdAt: '2026-06-30T20:00:00.000Z',
  link: '/messages?conversationId=7',
  actionLabel: 'Open message',
  ...overrides,
});

describe('NotificationToastBridge', () => {
  beforeEach(() => {
    toastMock.mockClear();
    notificationsMock = [];
  });

  it('seeds existing notifications without replaying old toasts', () => {
    notificationsMock = [notification({ id: 'old-1' })];

    render(<NotificationToastBridge />);

    expect(toastMock).not.toHaveBeenCalled();
  });

  it('shows one actionable toast for a new unread canonical notification', () => {
    const onOpenNotification = vi.fn();
    const { rerender } = render(<NotificationToastBridge onOpenNotification={onOpenNotification} />);

    notificationsMock = [notification({ id: 'new-1' })];
    rerender(<NotificationToastBridge onOpenNotification={onOpenNotification} />);

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Trainer message',
      description: 'Mira sent you a workout update.',
      variant: 'info',
      action: expect.objectContaining({ label: 'Open message' }),
    }));

    const toastArg = toastMock.mock.calls[0][0];
    toastArg.action.onClick();
    expect(onOpenNotification).toHaveBeenCalledWith('/messages?conversationId=7');

    rerender(<NotificationToastBridge onOpenNotification={onOpenNotification} />);
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it('skips read batch entries without hiding a later unread notification', () => {
    const { rerender } = render(<NotificationToastBridge />);

    notificationsMock = [
      notification({ id: 'read-first', read: true }),
      notification({ id: 'unread-second', title: 'Unread update', read: false }),
    ];
    rerender(<NotificationToastBridge />);

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Unread update' }));
  });
  it('does not toast read notifications or notifications without a stable id', () => {
    const { rerender } = render(<NotificationToastBridge />);

    notificationsMock = [notification({ id: 'read-1', read: true })];
    rerender(<NotificationToastBridge />);

    notificationsMock = [notification({ id: '', read: false })];
    rerender(<NotificationToastBridge />);

    expect(toastMock).not.toHaveBeenCalled();
  });
});