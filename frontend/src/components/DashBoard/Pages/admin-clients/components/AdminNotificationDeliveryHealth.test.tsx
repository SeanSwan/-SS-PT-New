import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminNotificationDeliveryHealth from './AdminNotificationDeliveryHealth';

const mocks = vi.hoisted(() => {
  const get = vi.fn();
  return { get, authAxios: { get } };
});

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mocks.authAxios,
  }),
}));

describe('AdminNotificationDeliveryHealth', () => {
  beforeEach(() => {
    mocks.get.mockReset();
  });

  it('loads admin broadcast delivery health from the canonical admin notifications route', async () => {
    mocks.get.mockResolvedValue({
      data: {
        success: true,
        summary: {
          broadcasts: 2,
          attempted: 10,
          delivered: 8,
          failed: 2,
          deliveryRate: 80,
          failureRate: 20,
          status: 'degraded',
        },
        recentBroadcasts: [
          {
            id: 'broadcast-1',
            title: 'Schedule update',
            createdAt: '2026-06-30T20:00:00.000Z',
            status: 'degraded',
            audience: { type: 'clients', count: 6 },
            channels: ['in-app'],
            delivery: { attempted: 6, created: 5, failed: 1 },
          },
        ],
      },
    });

    render(<AdminNotificationDeliveryHealth />);

    await waitFor(() => {
      expect(mocks.get).toHaveBeenCalledWith('/api/admin/notifications/delivery-health');
    });

    expect(await screen.findByRole('region', { name: /broadcast delivery health/i })).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('8 delivered')).toBeInTheDocument();
    expect(screen.getByText('2 failed')).toBeInTheDocument();
    expect(screen.getByText('Schedule update')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh delivery health/i })).toBeEnabled();
    });
  });
  it('shows a retryable error when delivery health cannot be loaded', async () => {
    mocks.get.mockResolvedValue({ data: { success: false } });

    render(<AdminNotificationDeliveryHealth />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Delivery health unavailable');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
