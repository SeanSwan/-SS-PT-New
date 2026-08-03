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

  it('clears its timer on unmount', () => {
    vi.setSystemTime(new Date(2026, 7, 6, 23, 59, 0));
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = renderHook(() => useDayBoundary());

    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
