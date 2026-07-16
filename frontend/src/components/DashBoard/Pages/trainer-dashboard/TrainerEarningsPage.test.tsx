/**
 * TrainerEarningsPage tests (Dashboard batch 2026-07-13, P1-1)
 *
 * Locks: self-scoped fetch (own trainer id → /api/commissions/trainer/:id),
 * totals truth (earned/unpaid/paid derived from server numbers only),
 * ledger rows with paid/unpaid + lead-source pills, honest empty state,
 * error state with working retry, and no fabricated zeros while loading.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
/* Stable identity — a fresh { authAxios } per call would re-trigger the
   hook's [authAxios] effect every render (infinite loop in jsdom). */
const stableAuth = { user: { id: 42, role: 'trainer' }, authAxios: { get: mockGet } };
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

import TrainerEarningsPage from './TrainerEarningsPage';

const commission = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  orderId: 100 + id,
  clientId: 7,
  clientName: 'Client Seven',
  leadSource: 'trainer_brought',
  isLoyaltyBump: false,
  sessionsGranted: 12,
  sessionsConsumed: 0,
  grossAmount: 2100,
  trainerCut: 1785,
  businessCut: 315,
  // Whole percentages — commissionCalculator.mjs stores 85/65, never fractions.
  commissionRateTrainer: 85,
  commissionRateBusiness: 15,
  paidToTrainerAt: null,
  payoutMethod: null,
  payoutReference: null,
  createdAt: '2026-07-01T12:00:00.000Z',
  ...over,
});

const okResponse = (over: Record<string, unknown> = {}) => ({
  data: {
    success: true,
    trainerId: 42,
    totalEarned: 2785,
    unpaid: 1785,
    commissions: [
      commission(1),
      commission(2, {
        clientName: 'Client Nine',
        clientId: 9,
        leadSource: 'platform',
        sessionsGranted: 10,
        trainerCut: 1000,
        grossAmount: 1750,
        commissionRateTrainer: 65,
        paidToTrainerAt: '2026-07-05T12:00:00.000Z',
        payoutMethod: 'zelle',
      }),
    ],
    ...over,
  },
});

describe('TrainerEarningsPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('fetches the signed-in trainer own ledger and renders server-truth totals', async () => {
    mockGet.mockResolvedValue(okResponse());
    render(<TrainerEarningsPage />);

    expect(await screen.findByText('$2,785.00')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/commissions/trainer/42');
    // $1,785.00 appears as the unpaid total AND row 1's cut; $1,000.00 as the
    // derived paid total AND row 2's cut — both dual-render by design.
    expect(screen.getAllByText('$1,785.00')).toHaveLength(2);
    expect(screen.getAllByText('$1,000.00')).toHaveLength(2);
  });

  it('renders ledger rows with payout status and lead-source pills', async () => {
    mockGet.mockResolvedValue(okResponse());
    render(<TrainerEarningsPage />);

    expect(await screen.findByText('Client Seven')).toBeInTheDocument();
    expect(screen.getByText('Your client')).toBeInTheDocument();
    expect(screen.getByText('Platform lead')).toBeInTheDocument();
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
    expect(screen.getByText(/Paid · zelle/i)).toBeInTheDocument();
    expect(screen.getByText(/· 12 sessions · 85% rate/)).toBeInTheDocument();
    expect(screen.getByText(/· 10 sessions · 65% rate/)).toBeInTheDocument();
  });

  it('shows the honest empty state when no commissions exist', async () => {
    mockGet.mockResolvedValue(okResponse({ totalEarned: 0, unpaid: 0, commissions: [] }));
    render(<TrainerEarningsPage />);

    expect(await screen.findByText(/no earnings recorded yet/i)).toBeInTheDocument();
  });

  it('surfaces an error state with a working retry instead of fabricated zeros', async () => {
    mockGet.mockRejectedValueOnce(new Error('network'));
    mockGet.mockResolvedValueOnce(okResponse());
    render(<TrainerEarningsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load your earnings/i);
    expect(screen.queryByText('$0.00')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('$2,785.00')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('announces loading without rendering money values', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<TrainerEarningsPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading your earnings/i);
    expect(screen.queryByText(/\$/)).toBeNull();
  });
});
