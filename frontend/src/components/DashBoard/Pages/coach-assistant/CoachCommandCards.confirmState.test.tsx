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

  it('uses the server expiry instead of restarting a fresh two-minute clock on remount', () => {
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
    const onConfirm = vi.fn(async () => ({ success: true }));
    render(<ConfirmationCard {...baseProps} expiresAt="2026-07-17T12:00:10.000Z" isDestructive={false} onConfirm={onConfirm} />);
    expect(screen.getByText(/Expires in 0:10/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(11_000));
    expect(screen.getByText(/This request expired/i)).toBeInTheDocument();
  });

  it('recomputes from the absolute server expiry after background timer suspension', () => {
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
    const onConfirm = vi.fn(async () => ({ success: true }));
    render(<ConfirmationCard {...baseProps} expiresAt="2026-07-17T12:01:00.000Z" isDestructive={false} onConfirm={onConfirm} />);
    expect(screen.getByText(/Expires in 1:00/)).toBeInTheDocument();

    act(() => {
      vi.setSystemTime(new Date('2026-07-17T12:02:00.000Z'));
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/This request expired/i)).toBeInTheDocument();
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
    await act(async () => { fireEvent.click(confirm); });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/Tap again to confirm/i)).toBeInTheDocument();

    // Let the arm lapse — a late second tap must re-arm, not execute.
    act(() => vi.advanceTimersByTime(3100));
    await act(async () => { fireEvent.click(confirm); });
    expect(onConfirm).not.toHaveBeenCalled();

    // Armed + prompt tap executes.
    await act(async () => { fireEvent.click(confirm); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('non-destructive confirm executes on the first tap', async () => {
    const onConfirm = vi.fn(async () => ({ success: true }));
    render(<ConfirmationCard {...baseProps} isDestructive={false} onConfirm={onConfirm} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /confirm action/i })); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
