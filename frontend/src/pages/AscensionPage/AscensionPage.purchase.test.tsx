import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  auth: { isAuthenticated: false },
  subscription: {
    tiers: [
      { id: 'free', name: 'Starter', tagline: 'Free', price: 0, priceDisplay: 'Free', features: [], limits: { aiMessagesPerMonth: 1, aiGenerationsPerMonth: 1 } },
      { id: 'pro', name: 'Guardian', tagline: 'Donate', price: 7, priceDisplay: 'Pay what you can', donationBased: true, minimumPrice: 2, maximumPrice: 50, suggestedPrice: 7, features: [], limits: { aiMessagesPerMonth: 1, aiGenerationsPerMonth: 1 } },
      { id: 'elite', name: 'Crystalline', tagline: 'Premium', price: 31.5, priceDisplay: '$31.50/mo', annualPrice: 300, features: [], limits: { aiMessagesPerMonth: 1, aiGenerationsPerMonth: 1 } },
    ],
    subscription: null,
    checkout: vi.fn(),
    startTrial: vi.fn(),
    loading: false,
    error: null,
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ pathname: '/ascension', search: '' }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => mocks.subscription,
}));

vi.mock('./VaultCard', () => ({
  default: (props: { variant: string; onCheckout: () => void; onStartTrial?: () => void; onToggleBilling?: () => void; isActionPending?: boolean; actionError?: string | null }) => (
    <article>
      <span>{props.variant}</span>
      {props.onToggleBilling && <button type="button" onClick={props.onToggleBilling}>Toggle billing</button>}
      <button type="button" disabled={props.isActionPending} onClick={props.onCheckout}>Checkout</button>
      {props.onStartTrial && <button type="button" disabled={props.isActionPending} onClick={props.onStartTrial}>Start trial</button>}
      {props.actionError && <div role="alert">{props.actionError}</div>}
    </article>
  ),
}));

import AscensionPage from './AscensionPage';

describe('Ascension purchase actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.isAuthenticated = false;
    mocks.subscription.subscription = null;
    mocks.subscription.checkout.mockResolvedValue({ success: true, checkoutUrl: 'https://checkout.test' });
    mocks.subscription.startTrial.mockResolvedValue({ success: true });
  });

  it('routes guests to login with the Ascension return location', () => {
    render(<AscensionPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Checkout' })[1]);
    expect(mocks.navigate).toHaveBeenCalledWith('/login?returnUrl=%2Fascension');
    expect(mocks.subscription.checkout).not.toHaveBeenCalled();
  });

  it('guards same-tick trial clicks and shows a visible failure that can be retried', async () => {
    mocks.auth.isAuthenticated = true;
    let rejectTrial: ((reason?: unknown) => void) | undefined;
    mocks.subscription.startTrial.mockImplementation(() => new Promise((_, reject) => { rejectTrial = reject; }));
    render(<AscensionPage />);
    const button = screen.getAllByRole('button', { name: 'Start trial' })[0];
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.subscription.startTrial).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    rejectTrial?.(new Error('Trial service unavailable'));
    await waitFor(() => expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Trial service unavailable'));
    expect(button).not.toBeDisabled();
  });

  it('keeps checkout monthly when the current tier has no usable annual price', async () => {
    mocks.auth.isAuthenticated = true;
    const { rerender } = render(<AscensionPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle billing' }));

    (mocks.subscription.tiers[2] as Record<string, unknown>).annualPrice = undefined;
    rerender(<AscensionPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Checkout' })[2]);

    await waitFor(() => expect(mocks.subscription.checkout).toHaveBeenCalledWith('elite', undefined, 'month'));
    expect(screen.queryByRole('button', { name: 'Toggle billing' })).not.toBeInTheDocument();
  });

  it('shows a recoverable error when checkout succeeds without a payment session URL', async () => {
    mocks.auth.isAuthenticated = true;
    mocks.subscription.checkout.mockResolvedValue({ success: true });
    render(<AscensionPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Checkout' })[1]);

    await waitFor(() => expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/payment session/i));
    expect(screen.getAllByRole('button', { name: 'Checkout' })[1]).not.toBeDisabled();
  });
});
