/**
 * AdminTrainerPayoutsPanel tests (Dashboard batch 2026-07-13, P1-2)
 *
 * Locks: summary totals from /api/commissions/summary, per-trainer rows
 * sorted by unpaid balance, expandable ledger showing only UNPAID rows
 * (pre-selected), mark-paid posting the exact payload then refetching the
 * summary, honest empty/error states.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const stableAuth = { user: { id: 1, role: 'admin' }, authAxios: { get: mockGet, post: mockPost } };
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

import AdminTrainerPayoutsPanel from './AdminTrainerPayoutsPanel';

const summaryResponse = {
  data: {
    success: true,
    summary: {
      totalGross: 5000,
      totalBusinessCut: 900,
      totalTrainerCut: 4100,
      totalUnpaid: 2100,
      totalPaid: 2000,
      commissionCount: 3,
    },
    trainers: [
      { trainerId: 5, firstName: 'Low', lastName: 'Owed', email: 't5@x.com', totalEarned: 500, unpaid: 100, paid: 400, commissionCount: 1 },
      { trainerId: 9, firstName: 'Big', lastName: 'Owed', email: 't9@x.com', totalEarned: 3600, unpaid: 2000, paid: 1600, commissionCount: 2 },
    ],
  },
};

const ledgerResponse = {
  data: {
    success: true,
    trainerId: 9,
    totalEarned: 3600,
    unpaid: 2000,
    commissions: [
      {
        id: 11, orderId: 111, clientId: 7, clientName: 'Client Seven', leadSource: 'trainer_brought',
        isLoyaltyBump: false, sessionsGranted: 12, sessionsConsumed: 0, grossAmount: 2100,
        trainerCut: 1200, businessCut: 900, commissionRateTrainer: 85, commissionRateBusiness: 15,
        paidToTrainerAt: null, payoutMethod: null, payoutReference: null, createdAt: '2026-07-01T12:00:00.000Z',
      },
      {
        id: 12, orderId: 112, clientId: 8, clientName: 'Client Eight', leadSource: 'platform',
        isLoyaltyBump: false, sessionsGranted: 4, sessionsConsumed: 0, grossAmount: 1000,
        trainerCut: 800, businessCut: 200, commissionRateTrainer: 65, commissionRateBusiness: 35,
        paidToTrainerAt: null, payoutMethod: null, payoutReference: null, createdAt: '2026-07-02T12:00:00.000Z',
      },
      {
        id: 13, orderId: 113, clientId: 8, clientName: 'Client Eight', leadSource: 'platform',
        isLoyaltyBump: false, sessionsGranted: 4, sessionsConsumed: 0, grossAmount: 2000,
        trainerCut: 1600, businessCut: 400, commissionRateTrainer: 65, commissionRateBusiness: 35,
        paidToTrainerAt: '2026-07-03T12:00:00.000Z', payoutMethod: 'zelle', payoutReference: null, createdAt: '2026-07-02T12:00:00.000Z',
      },
    ],
  },
};

describe('AdminTrainerPayoutsPanel', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('renders summary totals and trainers sorted by unpaid balance', async () => {
    mockGet.mockResolvedValue(summaryResponse);
    render(<AdminTrainerPayoutsPanel />);

    expect(await screen.findByText('$2,100.00')).toBeInTheDocument(); // unpaid total
    expect(mockGet).toHaveBeenCalledWith('/api/commissions/summary');

    const toggles = screen.getAllByRole('button', { name: /toggle ledger/i });
    expect(toggles[0]).toHaveAccessibleName(/big owed/i); // highest unpaid first
    expect(toggles[1]).toHaveAccessibleName(/low owed/i);
    expect(screen.getByText('owed $2,000.00')).toBeInTheDocument();
  });

  it('expands a trainer to their UNPAID ledger rows only, all pre-selected', async () => {
    mockGet.mockImplementation((url: string) =>
      url === '/api/commissions/summary'
        ? Promise.resolve(summaryResponse)
        : Promise.resolve(ledgerResponse));
    render(<AdminTrainerPayoutsPanel />);

    fireEvent.click(await screen.findByRole('button', { name: /toggle ledger for big owed/i }));

    expect(await screen.findByText('Client Seven')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/commissions/trainer/9');
    // Paid row (id 13, $1,600.00) must NOT render
    expect(screen.queryByText('$1,600.00')).toBeNull();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((box) => expect(box).toBeChecked());
    expect(screen.getByRole('button', { name: /mark 2 paid · \$2,000\.00/i })).toBeInTheDocument();
  });

  it('marks selected commissions paid with method + reference, then refetches the summary', async () => {
    mockGet.mockImplementation((url: string) =>
      url === '/api/commissions/summary'
        ? Promise.resolve(summaryResponse)
        : Promise.resolve(ledgerResponse));
    mockPost.mockResolvedValue({ data: { success: true, updatedCount: 1 } });
    render(<AdminTrainerPayoutsPanel />);

    fireEvent.click(await screen.findByRole('button', { name: /toggle ledger for big owed/i }));
    // Deselect row 12, keep row 11
    fireEvent.click(await screen.findByRole('checkbox', { name: /commission 12/i }));
    fireEvent.change(screen.getByRole('combobox', { name: /payout method/i }), { target: { value: 'venmo' } });
    fireEvent.change(screen.getByRole('textbox', { name: /payout reference/i }), { target: { value: 'txn-778' } });

    const summaryCallsBefore = mockGet.mock.calls.filter(([url]) => url === '/api/commissions/summary').length;
    fireEvent.click(screen.getByRole('button', { name: /mark 1 paid · \$1,200\.00/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/commissions/mark-paid', {
      commissionIds: [11],
      payoutMethod: 'venmo',
      payoutReference: 'txn-778',
    }));
    await waitFor(() => {
      const summaryCallsAfter = mockGet.mock.calls.filter(([url]) => url === '/api/commissions/summary').length;
      expect(summaryCallsAfter).toBe(summaryCallsBefore + 1);
    });
  });

  it('reports a partial settle instead of silent success when rows were already paid', async () => {
    mockGet.mockImplementation((url: string) =>
      url === '/api/commissions/summary'
        ? Promise.resolve(summaryResponse)
        : Promise.resolve(ledgerResponse));
    // Concurrent admin already settled one of the two selected rows.
    mockPost.mockResolvedValue({ data: { success: true, updatedCount: 1 } });
    render(<AdminTrainerPayoutsPanel />);

    fireEvent.click(await screen.findByRole('button', { name: /toggle ledger for big owed/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mark 2 paid · \$2,000\.00/i }));

    expect(await screen.findByText(/settled 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText(/was not recorded/i)).toBeInTheDocument();
  });

  it('uses the none-settled wording when every selected row was already paid, and clears the notice on the next ledger open', async () => {
    mockGet.mockImplementation((url: string) =>
      url === '/api/commissions/summary'
        ? Promise.resolve(summaryResponse)
        : Promise.resolve(ledgerResponse));
    mockPost.mockResolvedValue({ data: { success: true, updatedCount: 0 } });
    render(<AdminTrainerPayoutsPanel />);

    fireEvent.click(await screen.findByRole('button', { name: /toggle ledger for big owed/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mark 2 paid · \$2,000\.00/i }));

    const notice = await screen.findByRole('alert');
    expect(notice).toHaveTextContent(/none were settled — all 2 had already been paid/i);

    // Opening a ledger again is a new action — the stale notice must retire.
    fireEvent.click(await screen.findByRole('button', { name: /toggle ledger for low owed/i }));
    expect(screen.queryByText(/none were settled/i)).toBeNull();
  });

  it('shows the honest empty state when no commissions exist', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        summary: { totalGross: 0, totalBusinessCut: 0, totalTrainerCut: 0, totalUnpaid: 0, totalPaid: 0, commissionCount: 0 },
        trainers: [],
      },
    });
    render(<AdminTrainerPayoutsPanel />);

    expect(await screen.findByText(/no commissions recorded yet/i)).toBeInTheDocument();
  });

  it('surfaces an error state with retry instead of fabricated zeros', async () => {
    mockGet.mockRejectedValueOnce(new Error('network'));
    mockGet.mockResolvedValueOnce(summaryResponse);
    render(<AdminTrainerPayoutsPanel />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load commission data/i);
    expect(screen.queryByText('$0.00')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('$2,100.00')).toBeInTheDocument();
  });
});
