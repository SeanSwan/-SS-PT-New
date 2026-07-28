import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ActionRequiredInbox from './ActionRequiredInbox';
import { buildCommunicationInboxBuckets } from './communicationInboxModel';
import type { Notification } from '../../store/slices/notificationSlice';
import { useCommunicationCenter } from '../../hooks/useCommunicationCenter';

vi.mock('../../hooks/useCommunicationCenter', () => ({
  useCommunicationCenter: vi.fn(),
}));

const mockedUseCommunicationCenter = vi.mocked(useCommunicationCenter);

const notification = (overrides: Partial<Notification>): Notification => ({
  id: String(overrides.id || 'n-1'),
  title: overrides.title || 'Notification',
  message: overrides.message || 'Body',
  type: overrides.type || 'system',
  read: overrides.read ?? false,
  category: overrides.category || 'system',
  priority: overrides.priority || 'normal',
  actionStatus: overrides.actionStatus || 'pending',
  requiresAction: overrides.requiresAction ?? true,
  createdAt: overrides.createdAt || '2026-06-30T20:00:00.000Z',
  ...overrides,
});

const centerReturn = (notifications: Notification[] = [], overrides = {}) => {
  const buckets = buildCommunicationInboxBuckets(notifications);
  const activeBucket = buckets.find(bucket => bucket.key === 'action_required') || buckets[0];

  return {
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
    buckets,
    activeBucketKey: 'action_required',
    activeBucket,
    latestNotification: activeBucket.latest,
    actionRequiredCount: activeBucket.unread,
    selectBucket: vi.fn(),
    ...overrides,
  };
};

describe('ActionRequiredInbox', () => {
  beforeEach(() => {
    mockedUseCommunicationCenter.mockReset();
    mockedUseCommunicationCenter.mockReturnValue(centerReturn());
  });

  it('mounts on the canonical messaging surface under the Communications inbox strip', () => {
    const messagingViewSource = readFileSync(resolve(__dirname, '../Social/Messaging/MessagingView.tsx'), 'utf8');

    expect(messagingViewSource).toContain("import ActionRequiredInbox from '../../Communications/ActionRequiredInbox'");
    expect(messagingViewSource).toContain('<ActionRequiredInbox />');
  });

  it('renders open action-required notifications and hides completed actions', () => {
    mockedUseCommunicationCenter.mockReturnValue(centerReturn([
      notification({
        id: 'waiver-1',
        title: 'Waiver pending',
        message: 'Review the waiver before the next session.',
        category: 'training',
        priority: 'urgent',
        actions: [{ label: 'Review waiver', type: 'link', href: '/dashboard/admin/waivers' }],
      }),
      notification({
        id: 'done-1',
        title: 'Already handled',
        category: 'training',
        actionStatus: 'completed',
      }),
    ]));

    render(<ActionRequiredInbox />);

    expect(screen.getByRole('region', { name: /action required inbox/i })).toBeInTheDocument();
    expect(screen.getByText('Waiver pending')).toBeInTheDocument();
    expect(screen.getByText(/review the waiver/i)).toBeInTheDocument();
    expect(screen.getByText(/urgent/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review waiver/i })).toHaveAttribute('href', '/dashboard/admin/waivers');
    expect(screen.queryByText('Already handled')).not.toBeInTheDocument();
  });

  it('reads the shared communication center passively by default', () => {
    render(<ActionRequiredInbox />);

    expect(mockedUseCommunicationCenter).toHaveBeenCalledWith({
      fetchOnMount: false,
      subscribeToSocket: false,
      initialBucket: 'action_required',
    });
  });

  it('uses safe action URLs and routes snooze plus resolve/dismiss through the canonical center', () => {
    const markAsRead = vi.fn();
    const snoozeNotification = vi.fn();
    const resolveNotificationAction = vi.fn();
    mockedUseCommunicationCenter.mockReturnValue(centerReturn([
      notification({
        id: 'session-1',
        title: 'Confirm session change',
        category: 'schedule',
        actions: [
          { label: 'Open session', type: 'link', href: '/dashboard/client/schedule' },
          { label: 'External', type: 'link', href: 'https://example.com/phish' },
          { label: 'Snooze 30m', type: 'snooze', durationMinutes: 30 },
        ],
      }),
    ], { markAsRead, snoozeNotification, resolveNotificationAction }));

    render(<ActionRequiredInbox />);

    expect(screen.getByRole('link', { name: /open session/i })).toHaveAttribute('href', '/dashboard/client/schedule');
    expect(screen.queryByRole('link', { name: /external/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /snooze 30m/i }));
    expect(snoozeNotification).toHaveBeenCalledWith('session-1', 30);

    fireEvent.click(screen.getByRole('button', { name: /resolve confirm session change/i }));
    expect(resolveNotificationAction).toHaveBeenCalledWith('session-1', 'resolved');

    fireEvent.click(screen.getByRole('button', { name: /dismiss confirm session change/i }));
    expect(resolveNotificationAction).toHaveBeenCalledWith('session-1', 'dismissed');

    fireEvent.click(screen.getByRole('button', { name: /mark confirm session change read/i }));
    expect(markAsRead).toHaveBeenCalledWith('session-1');
  });
});
