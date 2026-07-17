/**
 * Regression (v2 P1.2 + P2.4): confirmation cards count down to the server's
 * ~120s operation expiry and swap to an honest expired state with one-tap
 * re-issue; destructive confirms require a second tap within 3s.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfirmationCard } from './CoachCommandCards';
import { CONFIRMATION_TTL_SECONDS, formatExpiryCountdown } from './CoachCommandCards.confirmState';

const baseProps = {
  operationId: 'op-1',
  command: 'log_workout',
  params: { exercise: 'Goblet Squat' },
  client: { id: 84, firstName: 'Client' },
  details: null,
  onCancel: async () => undefined,
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ConfirmationCard expiry + destructive gate', () => {
  it('formats the countdown', () => {
    expect(formatExpiryCountdown(120)).toBe('2:00');
    expect(formatExpiryCountdown(65)).toBe('1:05');
    expect(formatExpiryCountdown(0)).toBe('0:00');
  });

  it('shows a live countdown, then swaps to the expired state with a re-issue action', () => {
    const onConfirm = vi.fn(async () => ({ success: true }));
    const onReissue = vi.fn();
    render(<ConfirmationCard {...baseProps} isDestructive={false} onConfirm={onConfirm} onReissue={onReissue} />);

    expect(screen.getByText(/Expires in 2:00/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime((CONFIRMATION_TTL_SECONDS + 1) * 1000));

    expect(screen.getByText(/This request expired/i)).toBeInTheDocument();
    expect(screen.getByText(/Nothing was saved/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm action/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /re-issue the command/i }));
    expect(onReissue).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('destructive confirm requires a second tap; the arm disarms after 3s', async () => {
    const onConfirm = vi.fn(async () => ({ success: true }));
    render(<ConfirmationCard {...baseProps} isDestructive onConfirm={onConfirm} />);

    const confirm = screen.getByRole('button', { name: /confirm action/i });
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/Tap again to confirm/i)).toBeInTheDocument();

    // Let the arm lapse — a late second tap must re-arm, not execute.
    act(() => vi.advanceTimersByTime(3100));
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();

    // Armed + prompt tap executes.
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('non-destructive confirm executes on the first tap', () => {
    const onConfirm = vi.fn(async () => ({ success: true }));
    render(<ConfirmationCard {...baseProps} isDestructive={false} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm action/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
