/**
 * useDayBoundary — staleness regression.
 *
 * Home derives its trailing-7-day grid, the "(today)" marker and the
 * streak-risk signal from `Date.now()` captured inside a `useMemo` keyed only
 * on the session data. The dashboard never polls and does not refetch on focus,
 * so a tab left open across midnight kept yesterday's window: the today ring
 * and its screen-reader label sat on the previous day. Rendering `isToday`
 * turned that latent staleness into an on-screen claim.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDayBoundary } from './useDayBoundary';

const startOfDay = (ms: number) => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDayBoundary', () => {
  it('reports the start of the current local day', () => {
    vi.setSystemTime(new Date(2026, 7, 6, 23, 50, 0));
    const { result } = renderHook(() => useDayBoundary());

    expect(result.current).toBe(startOfDay(new Date(2026, 7, 6, 23, 50, 0).getTime()));
  });

  it('rolls over when the local day changes', () => {
    vi.setSystemTime(new Date(2026, 7, 6, 23, 50, 0));
    const { result } = renderHook(() => useDayBoundary());
    const before = result.current;

    // 20 minutes later it is the 7th.
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });

    expect(result.current).not.toBe(before);
    expect(result.current).toBe(new Date(2026, 7, 7, 0, 0, 0, 0).getTime());
  });

  it('stays put within the same day', () => {
    vi.setSystemTime(new Date(2026, 7, 6, 8, 0, 0));
    const { result } = renderHook(() => useDayBoundary());
    const before = result.current;

    act(() => {
      vi.advanceTimersByTime(6 * 60 * 60 * 1000);
    });

    expect(result.current).toBe(before);
  });

  it('re-arms so a second rollover also fires', () => {
    vi.setSystemTime(new Date(2026, 7, 6, 23, 59, 0));
    const { result } = renderHook(() => useDayBoundary());

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    const afterFirst = result.current;

    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    });

    expect(result.current).not.toBe(afterFirst);
    expect(result.current).toBe(new Date(2026, 7, 8, 0, 0, 0, 0).getTime());
  });

  it('lands on the real next midnight across a DST transition', () => {
    // US DST ends Sunday 2026-11-01 (a 25-hour day). Deriving the next boundary
    // by adding 86_400_000 overshoots past midnight; setDate re-reads the clock
    // and lands on it. The hook's header claims DST-safety — this defends it.
    vi.setSystemTime(new Date(2026, 9, 31, 23, 30, 0));
    const { result } = renderHook(() => useDayBoundary());

    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });

    expect(result.current).toBe(new Date(2026, 10, 1, 0, 0, 0, 0).getTime());
    expect(new Date(result.current).getHours()).toBe(0);
  });

  it('actually stops the timer on unmount — not merely calls clearTimeout', () => {
    // Asserting `clearTimeout` was called proves a CALL, not an EFFECT: a
    // cleanup that calls clearTimeout(undefined) leaks the timer and still
    // satisfies that spy. Assert the timer is gone instead.
    vi.setSystemTime(new Date(2026, 7, 6, 23, 59, 0));
    const { unmount } = renderHook(() => useDayBoundary());

    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);

    // And nothing fires afterwards.
    act(() => {
      vi.advanceTimersByTime(48 * 60 * 60 * 1000);
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps exactly one timer armed at a time across rollovers', () => {
    vi.setSystemTime(new Date(2026, 7, 6, 23, 59, 0));
    renderHook(() => useDayBoundary());

    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    });
    expect(vi.getTimerCount()).toBe(1);
  });
});
