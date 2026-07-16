/**
 * ClientNextBestActionCard — Slice 8.5 admin coach-surface tests
 * ==============================================================
 * Locks: per-client fetch path, loading skeleton, self-hide on error /
 * missing client / malformed payload, and the ready-state coach strip.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAxiosGet = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockAxiosGet }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'admin' }, authAxios: mockAuthAxios }),
}));

import ClientNextBestActionCard from './ClientNextBestActionCard';

const decision = {
  primary: { code: 'balance_pull', title: 'Push-heavy month (1.6:1)', message: 'Program more pulling work (rows, pulldowns, face pulls) over the next sessions.' },
  secondary: [{ code: 'keep_momentum', title: 'On track', message: 'Cadence is healthy.' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAxiosGet.mockResolvedValue({ data: { success: true, data: decision } });
});

describe('ClientNextBestActionCard', () => {
  it('fetches by client id and renders the coach strip', async () => {
    render(<ClientNextBestActionCard clientId={42} />);
    expect(await screen.findByText('Push-heavy month (1.6:1)')).toBeInTheDocument();
    expect(mockAxiosGet).toHaveBeenCalledWith('/api/analytics/42/next-best-action');
    expect(screen.getByRole('region', { name: 'Client next best action' })).toBeInTheDocument();
    expect(screen.getByText('On track')).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    mockAxiosGet.mockReturnValue(new Promise(() => {}));
    render(<ClientNextBestActionCard clientId={42} />);
    expect(screen.getByTestId('nba-skeleton')).toBeInTheDocument();
  });

  it('self-hides without a client id and never fetches', async () => {
    const { container } = render(<ClientNextBestActionCard clientId={null} />);
    await waitFor(() => expect(container.firstChild).toBeNull());
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('self-hides on denial/error — no broken strip for non-permitted viewers', async () => {
    mockAxiosGet.mockRejectedValue(new Error('403'));
    const { container } = render(<ClientNextBestActionCard clientId={42} />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('self-hides on malformed payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { success: true, data: { nope: true } } });
    const { container } = render(<ClientNextBestActionCard clientId={42} />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });
});
