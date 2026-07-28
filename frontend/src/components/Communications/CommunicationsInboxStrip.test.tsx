import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunicationsInboxStrip from './CommunicationsInboxStrip';
import {
  buildCommunicationInboxBuckets,
  type CommunicationInboxBucketKey,
} from './communicationInboxModel';
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
  createdAt: overrides.createdAt || '2026-06-30T20:00:00.000Z',
  ...overrides,
});

const centerReturn = (
  notifications: Notification[] = [],
  overrides: { activeBucketKey?: CommunicationInboxBucketKey; selectBucket?: (bucket: CommunicationInboxBucketKey) => void; snoozeNotification?: (id: string | number, minutes?: number) => void } = {},
) => {
  const buckets = buildCommunicationInboxBuckets(notifications);
  const activeBucketKey = overrides.activeBucketKey || 'action_required';
  const activeBucket = buckets.find(bucket => bucket.key === activeBucketKey) || buckets[0];

  return {
    notifications,
    unreadCount: notifications.filter(item => !item.read).length,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addNotification: vi.fn(),
    markAsRead: vi.fn(),
    markAsClicked: vi.fn(),
    snoozeNotification: overrides.snoozeNotification || vi.fn(),
    markAllAsRead: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
    buckets,
    activeBucketKey,
    activeBucket,
    latestNotification: activeBucket.latest,
    actionRequiredCount: buckets.find(bucket => bucket.key === 'action_required')?.total || 0,
    selectBucket: overrides.selectBucket || vi.fn(),
  };
};

describe('CommunicationsInboxStrip', () => {
  beforeEach(() => {
    mockedUseCommunicationCenter.mockReset();
    mockedUseCommunicationCenter.mockReturnValue(centerReturn());
  });

  it('is mounted on the canonical messaging surface', () => {
    const messagingViewSource = readFileSync(resolve(__dirname, '../Social/Messaging/MessagingView.tsx'), 'utf8');
    const stripSource = readFileSync(resolve(__dirname, 'CommunicationsInboxStrip.tsx'), 'utf8');

    expect(messagingViewSource).toContain("import CommunicationsInboxStrip from '../../Communications/CommunicationsInboxStrip'");
    expect(messagingViewSource).toContain('<CommunicationsInboxStrip />');
    expect(stripSource).toContain("import { useCommunicationCenter } from '../../hooks/useCommunicationCenter'");
    expect(stripSource).not.toContain("useNotificationCenter({");
  });

  it('subscribes through the communication center hook without owning duplicate notification state', () => {
    render(<CommunicationsInboxStrip />);

    expect(mockedUseCommunicationCenter).toHaveBeenCalledWith({ fetchOnMount: true, subscribeToSocket: true });
  });

  it('renders action-first communication buckets from canonical notifications', () => {
    const selectBucket = vi.fn();
    mockedUseCommunicationCenter.mockReturnValue(centerReturn([
      notification({ id: 'a1', category: 'action_required', title: 'Waiver pending', read: false, requiresAction: true }),
      notification({ id: 'm1', category: 'messages', title: 'Coach sent a message', read: false }),
      notification({ id: 'r1', category: 'achievements', title: 'Milestone unlocked', read: false }),
      notification({ id: 'b1', category: 'billing', title: 'Payment needs review', read: true }),
      notification({ id: 'admin-1', category: 'admin', title: 'Admin signal', read: true }),
    ], { selectBucket }));

    render(<CommunicationsInboxStrip />);

    expect(screen.getByRole('region', { name: /communications inbox/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /action required 1 total 1 unread/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /messages 1 total 1 unread/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /achievements 1 total 1 unread/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /billing 1 total 0 unread/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin 1 total 0 unread/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /messages 1 total 1 unread/i }));
    expect(selectBucket).toHaveBeenCalledWith('messages');
  });

  it('keeps read-but-open action work visible as pending communication work', () => {
    mockedUseCommunicationCenter.mockReturnValue(centerReturn([
      notification({
        id: 'reviewed-open-1',
        category: 'training',
        title: 'Reviewed but still pending',
        read: true,
        requiresAction: true,
        actionStatus: 'open',
      }),
    ]));

    render(<CommunicationsInboxStrip />);

    expect(screen.getByRole('button', { name: /action required 1 total 0 unread/i })).toBeInTheDocument();
    expect(screen.getByText('Reviewed but still pending')).toBeInTheDocument();
  });
  it('renders safe snooze actions and calls the canonical notification center', () => {
    const snoozeNotification = vi.fn();
    mockedUseCommunicationCenter.mockReturnValue(centerReturn([
      notification({
        id: 'waiver-1',
        category: 'action_required',
        title: 'Waiver pending',
        read: false,
        requiresAction: true,
        actions: [
          { label: 'Snooze', type: 'snooze', durationMinutes: 30 },
          { label: 'Unsafe API', type: 'api', endpoint: '/api/checkins/12/complete' },
        ],
      }),
    ], { snoozeNotification }));

    render(<CommunicationsInboxStrip />);

    fireEvent.click(screen.getByRole('button', { name: /snooze/i }));

    expect(snoozeNotification).toHaveBeenCalledWith('waiver-1', 30);
    expect(screen.queryByRole('button', { name: /unsafe api/i })).not.toBeInTheDocument();
  });

  it('falls back to a backend-safe default when snooze action duration is invalid', () => {
    const snoozeNotification = vi.fn();
    mockedUseCommunicationCenter.mockReturnValue(centerReturn([
      notification({
        id: 'waiver-1',
        category: 'action_required',
        title: 'Waiver pending',
        read: false,
        requiresAction: true,
        actions: [
          { label: 'Snooze', type: 'snooze', durationMinutes: 1 },
        ],
      }),
    ], { snoozeNotification }));

    render(<CommunicationsInboxStrip />);

    fireEvent.click(screen.getByRole('button', { name: /snooze/i }));

    expect(snoozeNotification).toHaveBeenCalledWith('waiver-1', 60);
  });

  it('renders safe internal action links without exposing unsafe external action URLs', () => {
    mockedUseCommunicationCenter.mockReturnValue(centerReturn([
      notification({
        id: 'waiver-1',
        category: 'action_required',
        title: 'Waiver pending',
        read: false,
        requiresAction: true,
        actions: [
          { label: 'Review waiver', type: 'link', href: '/dashboard/waivers' },
          { label: 'External', type: 'link', href: 'https://example.com/unsafe' },
        ],
      }),
    ]));

    render(<CommunicationsInboxStrip />);

    expect(screen.getByRole('link', { name: /review waiver/i })).toHaveAttribute('href', '/dashboard/waivers');
    expect(screen.queryByRole('link', { name: /external/i })).not.toBeInTheDocument();
  });
});