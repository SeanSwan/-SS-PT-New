/**
 * Post-charge verification failure (Lane 4 launch audit, 2026-08-03)
 * ==================================================================
 * This screen is reached only by someone who has ALREADY been through Stripe.
 * Before this slice it rendered `error.message` verbatim — so a buyer whose card
 * may have been charged could read "Request failed with status code 500" or
 * "Network Error" — and offered a single "Return Home" button: no retry, no way
 * to reach a human, no reference to quote.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SuccessPageErrorState } from './SuccessPage.stateViews';

vi.mock('../ui/buttons/GlowButton', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

describe('SuccessPageErrorState — the post-charge dead end', () => {
  it('offers a retry, a route to a human, and a way home', () => {
    render(
      <SuccessPageErrorState
        error="We couldn't confirm your order automatically."
        onGoHome={vi.fn()}
        onRetry={vi.fn()}
        sessionId="cs_test_abc123"
      />
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact support/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return home/i })).toBeInTheDocument();
  });

  it('shows the order reference so support can find the payment', () => {
    render(
      <SuccessPageErrorState
        error="verification failed"
        onGoHome={vi.fn()}
        onRetry={vi.fn()}
        sessionId="cs_test_abc123"
      />
    );

    expect(screen.getByText('cs_test_abc123')).toBeInTheDocument();
  });

  it('announces the failure to assistive tech', () => {
    render(<SuccessPageErrorState error="verification failed" onGoHome={vi.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('invokes the retry handler rather than dead-ending', async () => {
    const onRetry = vi.fn();
    render(<SuccessPageErrorState error="x" onGoHome={vi.fn()} onRetry={onRetry} sessionId="cs_1" />);

    screen.getByRole('button', { name: /try again/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry when there is no session to re-verify', () => {
    render(<SuccessPageErrorState error="No session ID provided" onGoHome={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact support/i })).toBeInTheDocument();
  });

  it('no longer titles the card with a bare technical "Verification Error"', () => {
    render(<SuccessPageErrorState error="x" onGoHome={vi.fn()} />);

    expect(screen.getByText(/couldn't confirm your order/i)).toBeInTheDocument();
  });
});
