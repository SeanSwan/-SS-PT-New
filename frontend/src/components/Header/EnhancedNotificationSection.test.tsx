import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EnhancedNotificationSection from './EnhancedNotificationSection';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import apiService from '../../services/api.service';
import type { Notification } from '../../store/slices/notificationSlice';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../../hooks/useNotificationCenter', () => ({
  useNotificationCenter: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));
const mockedUseNotificationCenter = vi.mocked(useNotificationCenter);
const mockedApiService = vi.mocked(apiService);

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
  overrides: Partial<ReturnType<typeof useNotificationCenter>> = {},
) => ({
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

async function flushAsyncHandlers() {
  await Promise.resolve();
  await Promise.resolve();
}

function openHeaderNotifications() {
  fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
}

function firstNotificationRow(title: string) {
  const titleNode = screen.getAllByText(title)[0];
  const row = titleNode.closest('[role="button"]');
  if (!row) {
    throw new Error(`No notification row found for ${title}`);
  }
  return row;
}

function firstNativeButtonByName(name: RegExp) {
  const button = screen
    .getAllByRole('button', { name })
    .find((element): element is HTMLButtonElement => element.tagName === 'BUTTON');

  if (!button) {
    throw new Error(`No native button found for ${name}`);
  }

  return button;
}

describe('EnhancedNotificationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    mockedUseNotificationCenter.mockReset();
    mockedApiService.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          preferences: {
            channels: { email: true, sms: false, push: false },
            digestFrequency: 'immediate',
            showPreview: true,
            quietHours: { enabled: false, start: '21:00', end: '07:00', timezone: 'local' },
          },
        },
      },
    });
    mockedApiService.put.mockResolvedValue({ data: { success: true } });
    mockedUseNotificationCenter.mockReturnValue(centerReturn());
  });


  it('opens canonical notification preferences from the header controls', async () => {
    render(<EnhancedNotificationSection />);
    openHeaderNotifications();

    const settingsButton = firstNativeButtonByName(/notification settings/i);
    expect(settingsButton).toHaveStyle({ minHeight: '44px' });

    fireEvent.click(settingsButton);

    expect(await screen.findByRole('dialog', { name: /Notification Settings/i }, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalledWith('/api/notifications/preferences');
    }, { timeout: 3000 });
    expect(screen.getByRole('button', { name: /Notifications/i })).toHaveAttribute('aria-expanded', 'false');
  });
  it('blocks protocol-relative row links while still marking the notification clicked', async () => {
    const markAsClicked = vi.fn().mockResolvedValue(undefined);
    mockedUseNotificationCenter.mockReturnValue(centerReturn([
      notification({
        id: 'unsafe-row',
        title: 'Suspicious portal',
        message: 'A provider sent an unsafe link.',
        link: '//evil.example/portal',
      }),
    ], { markAsClicked }));

    render(<EnhancedNotificationSection />);
    openHeaderNotifications();

    fireEvent.click(firstNotificationRow('Suspicious portal'));
    await waitFor(() => expect(markAsClicked).toHaveBeenCalledWith('unsafe-row'));
    await flushAsyncHandlers();

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('renders safe link actions as separate controls and ignores unsafe external actions', async () => {
    const markAsClicked = vi.fn().mockResolvedValue(undefined);
    mockedUseNotificationCenter.mockReturnValue(centerReturn([
      notification({
        id: 'action-link',
        title: 'Billing action available',
        message: 'Open the billing center to review payment status.',
        link: '//unsafe.example/billing',
        actions: [
          { label: 'Review payment', type: 'open_link', href: '/user-dashboard/billing' },
          { label: 'External portal', type: 'open_link', href: 'https://evil.example/portal' },
        ],
      }),
    ], { markAsClicked }));

    render(<EnhancedNotificationSection />);
    openHeaderNotifications();

    const action = firstNativeButtonByName(/review payment/i);
    expect(action).toHaveStyle({ minHeight: '44px' });
    expect(screen.queryByRole('button', { name: /external portal/i })).not.toBeInTheDocument();

    fireEvent.click(action);

    await waitFor(() => expect(markAsClicked).toHaveBeenCalledWith('action-link'));
    expect(navigateMock).toHaveBeenCalledWith('/user-dashboard/billing');
  });

  it('routes snooze actions through the canonical notification center without opening the row link', async () => {
    const markAsClicked = vi.fn().mockResolvedValue(undefined);
    const snoozeNotification = vi.fn().mockResolvedValue(undefined);
    mockedUseNotificationCenter.mockReturnValue(centerReturn([
      notification({
        id: 'snooze-action',
        title: 'Session reminder',
        message: 'A session starts soon.',
        link: '/user-dashboard/schedule',
        actions: [
          { label: 'Snooze 1 hour', type: 'snooze', durationMinutes: 60 },
        ],
      }),
    ], { markAsClicked, snoozeNotification }));

    render(<EnhancedNotificationSection />);
    openHeaderNotifications();

    const action = firstNativeButtonByName(/snooze 1 hour/i);
    expect(action).toHaveStyle({ minHeight: '44px' });

    fireEvent.click(action);

    await waitFor(() => expect(snoozeNotification).toHaveBeenCalledWith('snooze-action', 60));
    expect(markAsClicked).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});