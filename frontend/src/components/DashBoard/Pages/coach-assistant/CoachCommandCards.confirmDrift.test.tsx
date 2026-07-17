/**
 * PROBE (rule 55) — Codex finding #2: the confirmation countdown drifts in a background tab.
 *
 * 448755211 correctly seeds the countdown from the server's absolute `expiresAt`
 * (`initialRemaining`), on mount and whenever `expiresAt` changes. But the TICK is still an
 * in-memory decrement:
 *     setInterval(() => setRemaining((value) => (value > 0 ? value - 1 : 0)), 1000)
 *
 * Browsers throttle/suspend timers in background tabs (and on mobile when the app is
 * backgrounded — the Coach floor workflow). Wall-clock advances; the interval does not. So the
 * card's counter measures TICKS FIRED, not TIME PASSED, and Confirm stays live long after the
 * server (destructiveOperations.mjs: OPERATION_TTL_SECONDS = 120) expired the operation.
 *
 * That is the exact lie this file's own doctrine forbids — "a card whose Confirm can only ever
 * fail is a lie" — and Swan Coach non-negotiable #6 (never show a state the backend doesn't have).
 *
 * Contract: remaining must be derived from `expiresAt - Date.now()`, not from tick count.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirmationCardState } from './CoachCommandCards.confirmState';

const T0 = new Date('2026-07-17T12:00:00.000Z').getTime();

describe('PROBE: confirmation countdown vs a throttled background tab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('reports expired after the server TTL elapsed in real time, even if ticks were throttled', () => {
    // Server issued a 120s operation.
    const expiresAt = new Date(T0 + 120_000).toISOString();
    const { result } = renderHook(() =>
      useConfirmationCardState({ done: false, isDestructive: false, expiresAt }),
    );
    expect(result.current.remaining).toBe(120);

    // Trainer backgrounds the app for 10 minutes. Wall clock moves; the throttled tab
    // fires only a couple of ticks (a suspended tab may fire ~1/min or none at all).
    act(() => {
      vi.setSystemTime(T0 + 600_000);
      vi.advanceTimersByTime(2_000); // 2 ticks, not 600
    });

    // The operation expired 8 minutes ago. The card must say so.
    expect(result.current.remaining).toBe(0);
  });

  it('CONTROL — a normal foreground second still counts down', () => {
    const expiresAt = new Date(T0 + 120_000).toISOString();
    const { result } = renderHook(() =>
      useConfirmationCardState({ done: false, isDestructive: false, expiresAt }),
    );
    // NOTE: advanceTimersByTime also moves the mocked clock, so it alone models one real
    // foreground second. Calling setSystemTime as well would double-count it.
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.remaining).toBe(119);
  });

  it('CONTROL — with no server expiresAt it falls back to the local TTL', () => {
    const { result } = renderHook(() =>
      useConfirmationCardState({ done: false, isDestructive: false }),
    );
    expect(result.current.remaining).toBe(120);
  });

  // Guards the exact regression the recompute could introduce: if we recomputed
  // unconditionally, a card with no server expiry would re-seed to the full TTL on every
  // tick and never count down at all.
  it('CONTROL — with no server expiresAt it STILL counts down locally', () => {
    const { result } = renderHook(() =>
      useConfirmationCardState({ done: false, isDestructive: false }),
    );
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(result.current.remaining).toBe(117);
  });

  it('clamps at zero and never goes negative once expired', () => {
    const expiresAt = new Date(T0 + 5_000).toISOString();
    const { result } = renderHook(() =>
      useConfirmationCardState({ done: false, isDestructive: false, expiresAt }),
    );
    act(() => {
      vi.setSystemTime(T0 + 90_000);
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.remaining).toBe(0);
  });
});
