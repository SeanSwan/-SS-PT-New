import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PendingPaymentsWidget from './PendingPaymentsWidget';

const mockAuthAxios = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/PendingPaymentsWidget.tsx'),
  'utf8',
);

describe('PendingPaymentsWidget truth and accessibility', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
    mockAuthAxios.post.mockReset();
    mockAuthAxios.get.mockResolvedValue({
      data: {
        orders: [
          {
            id: 7,
            orderNumber: 'SS-20260523-ABC123',
            totalAmount: '120.00',
            paymentMethod: 'zelle',
            status: 'pending',
            billingName: 'Private Client',
            billingEmail: null,
            createdAt: '2026-05-23T12:00:00.000Z',
          },
        ],
      },
    });
  });

  it('renders pending offline payments from /api/orders with named actions', async () => {
    render(<PendingPaymentsWidget />);

    expect(await screen.findByText('SS-20260523-ABC123')).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/orders', {
      params: { status: 'pending', limit: 50 },
    });
    expect(screen.getByRole('button', { name: /refresh pending payments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm payment for ss-20260523-abc123/i })).toBeInTheDocument();
  });

  it('keeps admin payment controls at 44px minimum touch targets', () => {
    expect(SOURCE).toMatch(/const RefreshBtn[\s\S]*min-height:\s*44px/);
    expect(SOURCE).toMatch(/const ConfirmBtn[\s\S]*min-height:\s*44px/);
  });

  it('shows unavailable state instead of disappearing when pending orders fail to load', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('orders unavailable'));

    render(<PendingPaymentsWidget />);

    expect(await screen.findByText('Pending payments unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry pending payments/i })).toBeInTheDocument();
  });

  it('keeps the order visible and reports a failed payment confirmation', async () => {
    mockAuthAxios.post.mockRejectedValueOnce(new Error('confirm failed'));

    render(<PendingPaymentsWidget />);

    fireEvent.click(await screen.findByRole('button', { name: /confirm payment for ss-20260523-abc123/i }));

    await waitFor(() => expect(screen.getByText('Payment confirmation failed.')).toBeInTheDocument());
    expect(screen.getByText('SS-20260523-ABC123')).toBeInTheDocument();
  });

  it('does not keep silent catch blocks for payment operations', () => {
    expect(SOURCE).not.toContain('// silent');
    expect(SOURCE).toContain('const [loadError, setLoadError]');
    expect(SOURCE).toContain('const [confirmError, setConfirmError]');
  });
});
