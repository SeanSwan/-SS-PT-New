/**
 * TEST: ClientMembershipCard — FTC two-tap cancel wire-up.
 * Locks: free tier shows status only (no cancel affordance); a live paid
 * sub cancels via arm → confirm (exactly one cancel() call, with reason);
 * failures render an honest error; success states the access-until date.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientMembershipCard from './ClientMembershipCard';

const cancelMock = vi.fn();
const state: { subscription: Record<string, unknown> | null; loading: boolean } = {
  subscription: null,
  loading: false,
};

vi.mock('../../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: state.subscription,
    loading: state.loading,
    cancel: cancelMock,
  }),
}));

const eliteSub = {
  tier: 'elite',
  tierName: 'Crystalline',
  status: 'active',
  hasFullAIAccess: true,
  isInTrial: false,
  trialDaysRemaining: 0,
  trialEndDate: null,
  currentPeriodEnd: '2026-08-13T00:00:00.000Z',
  amount: 24.99,
  paymentMethod: 'card',
};

describe('ClientMembershipCard', () => {
  beforeEach(() => {
    cancelMock.mockReset();
    state.loading = false;
    state.subscription = null;
  });

  it('renders nothing while loading or without status', () => {
    state.loading = true;
    const { container } = render(<ClientMembershipCard />);
    expect(container.firstChild).toBeNull();
  });

  it('shows free-tier status with NO cancel affordance', () => {
    state.subscription = { ...eliteSub, tier: 'free', tierName: 'Starter', amount: null, currentPeriodEnd: null };
    render(<ClientMembershipCard />);
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  it('cancels a live paid sub with exactly two taps and one call', async () => {
    state.subscription = eliteSub;
    cancelMock.mockResolvedValue({ success: true });
    render(<ClientMembershipCard />);

    const button = screen.getByRole('button', { name: /cancel membership/i });
    fireEvent.click(button);
    expect(cancelMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /tap again to confirm cancel/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /tap again to confirm cancel/i }));
    await waitFor(() => expect(cancelMock).toHaveBeenCalledTimes(1));
    expect(cancelMock).toHaveBeenCalledWith('client-self-serve');
    expect(await screen.findByText(/cancelled and will not renew/i)).toBeInTheDocument();
    expect(screen.getByText(/full access until/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  it('keeps cancellation truth across remounts via the payload cancelledAt', () => {
    state.subscription = { ...eliteSub, cancelledAt: '2026-07-14T00:00:00.000Z' };
    render(<ClientMembershipCard />);
    expect(screen.getByText(/cancelled and will not renew/i)).toBeInTheDocument();
    expect(screen.getAllByText(/access until/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/renews/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  it('keeps the escape hatch visible for past_due subs (dunning)', () => {
    state.subscription = { ...eliteSub, status: 'past_due' };
    render(<ClientMembershipCard />);
    expect(screen.getByRole('button', { name: /cancel membership/i })).toBeInTheDocument();
  });

  it('renders nothing for staff synthetic entitlements', () => {
    state.subscription = { ...eliteSub, isAdmin: true };
    const { container } = render(<ClientMembershipCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an honest error when the cancel call fails', async () => {
    state.subscription = eliteSub;
    cancelMock.mockResolvedValue({ success: false, message: 'Stripe unavailable' });
    render(<ClientMembershipCard />);

    fireEvent.click(screen.getByRole('button', { name: /cancel membership/i }));
    fireEvent.click(screen.getByRole('button', { name: /tap again to confirm cancel/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Stripe unavailable');
    // The affordance survives so the client can retry.
    expect(screen.getByRole('button', { name: /cancel membership/i })).toBeInTheDocument();
  });
});
