/**
 * ThinkingIndicator — CLS-reduction behavior test
 * ================================================
 * Phase 11.1 hotfix 2026-04-14: ThinkingIndicator previously returned
 * `null` when `isThinking` flipped false, removing a ~48px block from
 * the message list and causing a layout shift on every assistant
 * response. The new implementation always renders a StableSlot with a
 * fixed 48px min-height; only the inner Wrap toggles visibility.
 *
 * This test locks the new stable-height contract.
 */

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThinkingIndicator, { THINKING_STAGES } from './ThinkingIndicator';

describe('ThinkingIndicator — CLS stability', () => {
  it('renders the StableSlot wrapper when isThinking=true', () => {
    render(<ThinkingIndicator isThinking={true} />);
    const slot = screen.getByTestId('thinking-indicator-slot');
    expect(slot).toBeInTheDocument();
    expect(slot.getAttribute('aria-hidden')).toBe('false');
  });

  it('KEEPS the StableSlot wrapper when isThinking=false (no null return)', () => {
    // Core CLS fix. If this test fails, ThinkingIndicator has
    // regressed to the `if (!isThinking) return null` pattern.
    render(<ThinkingIndicator isThinking={false} />);
    const slot = screen.getByTestId('thinking-indicator-slot');
    expect(slot).toBeInTheDocument();
    expect(slot.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the inner indicator bubble only when isThinking=true', () => {
    const { rerender } = render(<ThinkingIndicator isThinking={true} />);
    // The inner bubble has role="status" and aria-label
    expect(screen.getByRole('status', { name: /Swan Coach is thinking/i })).toBeInTheDocument();

    rerender(<ThinkingIndicator isThinking={false} />);
    // Slot stays; inner bubble does not
    expect(screen.getByTestId('thinking-indicator-slot')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /Swan Coach is thinking/i })).not.toBeInTheDocument();
  });
});

/**
 * B1a 2026-06-10: stages advance one-way by real elapsed time and never
 * loop. Past 10s the indicator switches to an honest long-wait state
 * instead of cycling fake progress.
 */
describe('ThinkingIndicator — B1a elapsed-time staging', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const stageText = () => screen.getByTestId('thinking-stage-text').textContent;

  it('walks Reading → Checking → Writing → Still working, one-way', () => {
    render(<ThinkingIndicator isThinking={true} />);
    expect(stageText()).toBe('Reading your question…');

    act(() => { vi.advanceTimersByTime(3000); }); // 3.0s
    expect(stageText()).toBe('Checking the data…');

    act(() => { vi.advanceTimersByTime(3500); }); // 6.5s
    expect(stageText()).toBe('Writing your answer…');

    act(() => { vi.advanceTimersByTime(4000); }); // 10.5s
    expect(stageText()).toBe('Still working — big question…');
  });

  it('NEVER loops back to an earlier stage on a long wait', () => {
    render(<ThinkingIndicator isThinking={true} />);
    act(() => { vi.advanceTimersByTime(30000); }); // 30s
    expect(stageText()).toBe('Still working — big question…');
    act(() => { vi.advanceTimersByTime(30000); }); // 60s — still honest, no cycle
    expect(stageText()).toBe('Still working — big question…');
  });

  it('resets to the first stage when a new thinking cycle starts', () => {
    const { rerender } = render(<ThinkingIndicator isThinking={true} />);
    act(() => { vi.advanceTimersByTime(12000); });
    expect(stageText()).toBe('Still working — big question…');

    rerender(<ThinkingIndicator isThinking={false} />);
    rerender(<ThinkingIndicator isThinking={true} />);
    expect(stageText()).toBe('Reading your question…');
  });

  it('locks the honest long-wait threshold at 10s', () => {
    // Contract lock: the last stage is the >=10s guard from the B1 plan.
    const last = THINKING_STAGES[THINKING_STAGES.length - 1];
    expect(last.atMs).toBe(10000);
    expect(last.text).toMatch(/Still working/);
  });
});
