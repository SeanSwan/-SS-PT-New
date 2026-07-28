import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../services/api.service';
import NotificationPreferencesModal from './NotificationPreferencesModal';

vi.mock('../../services/api.service', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('NotificationPreferencesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and saves schedule notification settings through the canonical notifications preference endpoint', async () => {
    const onSuccess = vi.fn();

    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          preferences: {
            channels: { email: false, sms: true, push: true },
            digestFrequency: 'daily',
            showPreview: false,
            quietHours: {
              enabled: true,
              start: '22:00',
              end: '06:00',
              timezone: 'America/New_York',
            },
          },
        },
      },
    });
    vi.mocked(apiService.put).mockResolvedValueOnce({ data: { success: true } });

    render(<NotificationPreferencesModal open onClose={vi.fn()} onSuccess={onSuccess} />);

    expect(apiService.get).toHaveBeenCalledWith('/api/notifications/preferences');

    await waitFor(() => {
      expect(screen.getByLabelText(/Receive email notifications/i)).not.toBeChecked();
    });

    expect(screen.getByLabelText(/Receive SMS notifications/i)).toBeChecked();
    expect(screen.getByLabelText(/Receive push notifications/i)).toBeChecked();
    expect(screen.getByLabelText(/Notification digest/i)).toHaveValue('daily');
    expect(screen.getByLabelText(/Show message previews/i)).not.toBeChecked();
    expect(screen.getByLabelText(/Quiet hours start/i)).toHaveValue('22:00');
    expect(screen.getByLabelText(/Quiet hours end/i)).toHaveValue('06:00');

    fireEvent.click(screen.getByLabelText(/Receive email notifications/i));
    fireEvent.change(screen.getByLabelText(/Notification digest/i), {
      target: { value: 'hourly' },
    });
    fireEvent.click(screen.getByLabelText(/Show message previews/i));
    fireEvent.change(screen.getByLabelText(/Quiet hours end/i), {
      target: { value: '07:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Preferences/i }));

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith('/api/notifications/preferences', {
        preferences: {
          channels: { email: true, sms: true, push: true },
          categories: expect.any(Object),
          digestFrequency: 'hourly',
          showPreview: true,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '07:30',
            timezone: 'local',
          },
        },
      });
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('lets users tune notification categories by channel without leaving the canonical preferences modal', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          preferences: {
            channels: { email: true, sms: true, push: false },
            categories: {
              messages: { inApp: true, email: false, sms: false, push: true },
              schedule: { inApp: true, email: true, sms: true, push: false },
            },
            quietHours: { enabled: false, start: '21:00', end: '07:00', timezone: 'local' },
          },
        },
      },
    });
    vi.mocked(apiService.put).mockResolvedValueOnce({ data: { success: true } });

    render(<NotificationPreferencesModal open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Messages email/i })).not.toBeChecked();
    });

    expect(screen.getByText(/Message and chat notifications/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Messages push/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Schedule SMS/i })).toBeChecked();

    fireEvent.click(screen.getByRole('checkbox', { name: /Messages email/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Schedule SMS/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Preferences/i }));

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith('/api/notifications/preferences', {
        preferences: expect.objectContaining({
          channels: { email: true, sms: true, push: false },
          categories: expect.objectContaining({
            messages: { inApp: true, email: true, sms: false, push: true },
            schedule: { inApp: true, email: true, sms: false, push: false },
          }),
        }),
      });
    });
  });
});
