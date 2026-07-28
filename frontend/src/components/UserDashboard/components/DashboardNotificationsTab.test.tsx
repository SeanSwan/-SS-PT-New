/**
 * DashboardNotificationsTab notification navigation coverage.
 *
 * Locks the canonical dashboard consumer of SocialNotificationsPanel so
 * protocol-relative notification links cannot navigate out of the app shell.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardNotificationsTab from './DashboardNotificationsTab';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSocialNotifications = vi.hoisted(() => ({
  notifications: [] as Array<Record<string, unknown>>,
  unreadCount: 0,
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
  markAllAsRead: vi.fn(),
  markAsRead: vi.fn(),
  markAsClicked: vi.fn(),
  snoozeNotification: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../hooks/useSocialNotifications', () => ({
  useSocialNotifications: () => mockSocialNotifications,
}));

function setNotification(link: string) {
  mockSocialNotifications.notifications = [{
    id: 'notification-1',
    title: 'Trainer action ready',
    message: 'Review the latest client message.',
    type: 'message',
    read: false,
    createdAt: '2026-06-30T12:00:00.000Z',
    link,
  }];
  mockSocialNotifications.unreadCount = 1;
}

function setSnoozeNotification() {
  mockSocialNotifications.notifications = [{
    id: 'notification-snooze-1',
    title: 'Session reminder',
    message: 'You have a session reminder queued.',
    type: 'session',
    read: false,
    createdAt: '2026-06-30T12:00:00.000Z',
    actions: [{ label: 'Snooze 1 hour', type: 'snooze', durationMinutes: 60 }],
  }];
  mockSocialNotifications.unreadCount = 1;
}

describe('DashboardNotificationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocialNotifications.notifications = [];
    mockSocialNotifications.unreadCount = 0;
    mockSocialNotifications.loading = false;
    mockSocialNotifications.error = null;
    mockSocialNotifications.markAsRead.mockResolvedValue(undefined);
    mockSocialNotifications.markAsClicked.mockResolvedValue(undefined);
    mockSocialNotifications.snoozeNotification.mockResolvedValue(undefined);
  });

  it('navigates safe internal notification links after recording the click lifecycle', async () => {
    setNotification('/messages?conversation=7');

    render(<DashboardNotificationsTab />);
    fireEvent.click(screen.getByRole('button', { name: /trainer action ready/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/messages?conversation=7'));
    expect(mockSocialNotifications.markAsClicked).toHaveBeenCalledWith('notification-1');
  });

  it('records protocol-relative notification clicks without navigating', async () => {
    setNotification('//unsafe.example/messages');

    render(<DashboardNotificationsTab />);
    fireEvent.click(screen.getByRole('button', { name: /trainer action ready/i }));

    await waitFor(() => expect(mockSocialNotifications.markAsClicked).toHaveBeenCalledWith('notification-1'));
    await Promise.resolve();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('forwards notification snooze actions from the mounted dashboard tab', async () => {
    setSnoozeNotification();

    render(<DashboardNotificationsTab />);
    fireEvent.click(screen.getByRole('button', { name: /snooze 1 hour/i }));

    await waitFor(() => expect(mockSocialNotifications.snoozeNotification).toHaveBeenCalledWith('notification-snooze-1', 60));
    expect(mockSocialNotifications.markAsClicked).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});