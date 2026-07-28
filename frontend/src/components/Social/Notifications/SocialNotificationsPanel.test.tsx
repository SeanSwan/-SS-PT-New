/**
 * SocialNotificationsPanel behavioral coverage.
 *
 * Locks the dashboard notification panel states that production smoke relies on:
 * loaded rows, loading placeholders, empty state, and retryable API failure.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SocialNotification } from '../../../hooks/useSocialNotifications';
import SocialNotificationsPanel from './SocialNotificationsPanel';

const unreadNotification: SocialNotification = {
  id: 'unread-1',
  title: 'Consistency proof ready',
  message: 'Your weekly training proof is ready to review.',
  type: 'workout',
  read: false,
  createdAt: '2026-06-11T12:00:00.000Z',
  sender: {
    firstName: 'Coach',
    lastName: 'Swan',
  },
  link: '/messages',
  actionLabel: 'Open messages',
};

const readNotification: SocialNotification = {
  id: 'read-1',
  title: 'Reward unlocked',
  message: 'You unlocked a streak reward.',
  type: 'reward',
  read: true,
};


const adminNotification: SocialNotification = {
  id: 'admin-1',
  title: 'Admin broadcast ready',
  message: 'A staff communication needs review.',
  type: 'admin',
  read: false,
};
const actionNotification: SocialNotification = {
  ...unreadNotification,
  id: 'action-1',
  title: 'Trainer message waiting',
  link: '//unsafe.example/messages',
  actionLabel: 'Unsafe fallback',
  actions: [
    { label: 'Message trainer', type: 'open_link', href: '/messages?conversation=7' },
    { label: 'External portal', type: 'open_link', href: 'https://example.com/portal' },
  ],
};

const snoozeNotification: SocialNotification = {
  ...unreadNotification,
  id: 'snooze-1',
  title: 'Session reminder',
  actions: [
    { label: 'Snooze 1 hour', type: 'snooze', durationMinutes: 60 },
  ],
};

const baseHandlers = {
  onRefresh: vi.fn(),
  onMarkAllRead: vi.fn(),
  onOpenNotification: vi.fn(),
  onSnoozeNotification: vi.fn(),
};

function renderPanel(overrides: Partial<ComponentProps<typeof SocialNotificationsPanel>> = {}) {
  const props: ComponentProps<typeof SocialNotificationsPanel> = {
    notifications: [unreadNotification, readNotification],
    unreadCount: 1,
    loading: false,
    error: null,
    ...baseHandlers,
    ...overrides,
  };

  render(<SocialNotificationsPanel {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SocialNotificationsPanel', () => {
  it('renders notification rows and wires unread, refresh, and open actions', () => {
    const props = renderPanel();

    expect(screen.getByLabelText('Social notifications')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText('1 unread')).toBeInTheDocument();
    expect(screen.getByText('Consistency proof ready')).toBeInTheDocument();
    expect(screen.getByText('From Coach Swan')).toBeInTheDocument();
    expect(screen.getByText('Open messages')).toBeInTheDocument();
    expect(screen.getByText('Reward')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mark read/i }));
    expect(props.onMarkAllRead).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /refresh notifications/i }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /consistency proof ready/i }));
    expect(props.onOpenNotification).toHaveBeenCalledWith(unreadNotification);
  });


  it('labels admin notifications with the first-class admin taxonomy label', () => {
    renderPanel({ notifications: [adminNotification], unreadCount: 1 });

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.queryByText('admin')).not.toBeInTheDocument();
  });
  it('renders safe notification actions as separate controls without nesting buttons', () => {
    const props = renderPanel({ notifications: [actionNotification], unreadCount: 1 });

    const action = screen.getByRole('button', { name: /message trainer/i });
    expect(action).toBeInTheDocument();
    expect(action).toHaveStyle({ minHeight: '44px' });
    expect(screen.queryByRole('button', { name: /external portal/i })).not.toBeInTheDocument();
    expect(document.querySelector('button button')).toBeNull();

    fireEvent.click(action);
    expect(props.onOpenNotification).toHaveBeenCalledWith(expect.objectContaining({
      id: 'action-1',
      link: '/messages?conversation=7',
      actionLabel: 'Message trainer',
    }));
  });

  it('renders snooze actions through the canonical snooze handler', () => {
    const props = renderPanel({ notifications: [snoozeNotification], unreadCount: 1 });

    const action = screen.getByRole('button', { name: /snooze 1 hour/i });
    expect(action).toBeInTheDocument();
    expect(action).toHaveStyle({ minHeight: '44px' });

    fireEvent.click(action);
    expect(props.onSnoozeNotification).toHaveBeenCalledWith('snooze-1', 60);
    expect(props.onOpenNotification).not.toHaveBeenCalled();
  });
  it('keeps the mark-read action hidden when there are no unread notifications', () => {
    renderPanel({
      notifications: [{ ...readNotification, id: 'read-only' }],
      unreadCount: 0,
    });

    expect(screen.getByText('0 unread')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark read/i })).not.toBeInTheDocument();
  });

  it('renders loading placeholders instead of stale rows', () => {
    renderPanel({ loading: true });

    expect(screen.getByLabelText('Loading notifications')).toBeInTheDocument();
    expect(screen.queryByText('Consistency proof ready')).not.toBeInTheDocument();
  });

  it('renders the empty state when the API returns no notifications', () => {
    renderPanel({ notifications: [], unreadCount: 0 });

    expect(screen.getByText('All clear')).toBeInTheDocument();
    expect(screen.getByText(/updates will land here/i)).toBeInTheDocument();
  });

  it('renders a retryable error state', () => {
    const props = renderPanel({
      notifications: [],
      unreadCount: 0,
      error: 'Notifications are temporarily unavailable.',
    });

    expect(screen.getByText('Notifications unavailable')).toBeInTheDocument();
    expect(screen.getByText('Notifications are temporarily unavailable.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });
});
