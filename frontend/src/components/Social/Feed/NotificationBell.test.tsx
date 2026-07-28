import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NotificationBell from './NotificationBell';
import { useNotificationCenter } from '../../../hooks/useNotificationCenter';
import type { Notification } from '../../../store/slices/notificationSlice';

vi.mock('../../../hooks/useNotificationCenter', () => ({
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

describe('Social Feed NotificationBell', () => {
  beforeEach(() => {
    mockedUseNotificationCenter.mockReset();
    mockedUseNotificationCenter.mockReturnValue(centerReturn());
  });

  it('classifies the retained full-feed bell and delegates notification state to the canonical hook', () => {
    const routeSource = readFileSync(resolve(__dirname, '../../../routes/main-routes.tsx'), 'utf8');
    const tabsSource = readFileSync(resolve(__dirname, '../../UserDashboard/components/UserDashboardTabsV3.tsx'), 'utf8');
    const sectionsSource = readFileSync(resolve(__dirname, 'components/SocialFeedSections.tsx'), 'utf8');
    const bellSource = readFileSync(resolve(__dirname, 'NotificationBell.tsx'), 'utf8');

    expect(routeSource).toContain('SocialPage.V3 / SocialPage are unmounted legacy');
    expect(routeSource).toContain("path: 'social'");
    expect(routeSource).toContain('<Navigate to="/user-dashboard" replace />');
    expect(tabsSource).toContain('Feed panel is unmounted');
    expect(tabsSource).not.toContain("lazy(() => import('./DashboardFeedTab'))");
    expect(tabsSource).not.toContain('<DashboardFeedTab');
    expect(sectionsSource).toContain("import NotificationBell from '../NotificationBell'");
    expect(sectionsSource).toContain('<NotificationBell />');
    expect(bellSource).toContain("import { useNotificationCenter } from '../../../hooks/useNotificationCenter'");
    expect(bellSource).not.toContain("import api from '../../../services/api'");
    expect(bellSource).not.toContain("api.get('/api/notifications");
    expect(bellSource).not.toContain('setInterval(fetchNotifications');
  });

  it('subscribes to live canonical notifications instead of owning a polling copy', () => {
    render(<NotificationBell />);

    expect(mockedUseNotificationCenter).toHaveBeenCalledWith({ fetchOnMount: true, subscribeToSocket: true });
  });

  it('renders canonical unread state and marks all through the shared notification center', () => {
    const markAllAsRead = vi.fn();
    mockedUseNotificationCenter.mockReturnValue(centerReturn([
      notification({ id: 'm1', category: 'messages', title: 'Coach message', read: false }),
      notification({ id: 't1', category: 'training', title: 'Workout assigned', read: true }),
    ], { markAllAsRead }));

    render(<NotificationBell />);

    expect(screen.getByText('1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByText('Coach message')).toBeInTheDocument();
    expect(screen.getByText('Workout assigned')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));
    expect(markAllAsRead).toHaveBeenCalledTimes(1);
  });
});