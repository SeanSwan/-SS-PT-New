/**
 * TrainerMyBookCard tests (Dashboard batch 2026-07-13, P1-3)
 *
 * Locks: assigned-roster count + unpaid-earnings chip from real endpoints,
 * partial rendering when one source fails, full self-hide when both fail,
 * and the one-tap earnings deep link.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockNavigate = vi.fn();
const mockRosterStrict = vi.fn();
const stableAuth = { user: { id: 42, role: 'trainer' }, authAxios: { get: mockGet } };
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => stableAuth,
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => mockNavigate,
}));
vi.mock('../../workspaces/ClientsWorkspace.data', () => ({
  fetchClientHubClientsStrict: (...args: unknown[]) => mockRosterStrict(...args),
}));

import TrainerMyBookCard from './TrainerMyBookCard';

const renderCard = () => render(
  <MemoryRouter>
    <TrainerMyBookCard />
  </MemoryRouter>,
);

describe('TrainerMyBookCard', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockNavigate.mockReset();
    mockRosterStrict.mockReset();
  });

  it('renders active-client count and unpaid earnings from real sources', async () => {
    mockRosterStrict.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    mockGet.mockResolvedValue({ data: { success: true, unpaid: 1785 } });
    renderCard();

    expect(await screen.findByText('My Book')).toBeInTheDocument();
    expect(mockRosterStrict).toHaveBeenCalledWith(stableAuth.authAxios, 'trainer', 42);
    expect(mockGet).toHaveBeenCalledWith('/api/commissions/trainer/42');
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('$1,785.00')).toBeInTheDocument();
  });

  it('still renders the roster chip when earnings fail (partial truth beats none)', async () => {
    mockRosterStrict.mockResolvedValue([{ id: 1 }]);
    mockGet.mockRejectedValue(new Error('boom'));
    renderCard();

    expect(await screen.findByText('Active clients')).toBeInTheDocument();
    expect(screen.queryByText('Unpaid earnings')).toBeNull();
  });

  it('self-hides entirely when both sources fail', async () => {
    mockRosterStrict.mockRejectedValue(new Error('boom'));
    mockGet.mockRejectedValue(new Error('boom'));
    const { container } = renderCard();

    await waitFor(() => expect(mockRosterStrict).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('deep-links to the earnings ledger', async () => {
    mockRosterStrict.mockResolvedValue([]);
    mockGet.mockResolvedValue({ data: { success: true, unpaid: 0 } });
    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: /open my earnings ledger/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/trainer/earnings');
  });
});
