/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ M6 — the rest timer is endsAt-ABSOLUTE (Slice 4a).          │
 * │ The tick-counting v1 died on backgrounding: throttled tabs  │
 * │ under-tick and the countdown silently stretches. v2 stores  │
 * │ epoch endsAt and every tick RECOMPUTES from Date.now(), so  │
 * │ a suspended tab reconciles instantly on visibilitychange.   │
 * │ A PT's rest timer that dies when they answer a text is a    │
 * │ trust-killer — this is the regression lock for that bug.    │
 * └─────────────────────────────────────────────────────────────┘
 */
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRestTimer } from './useRestTimer';

describe('useRestTimer — endsAt-absolute (M6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down in real time', () => {
    const { result } = renderHook(() => useRestTimer({ defaultSeconds: 60 }));
    act(() => result.current.start(60));
    expect(result.current.secondsLeft).toBe(60);
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.secondsLeft).toBe(50);
    expect(result.current.isRunning).toBe(true);
  });

  it('THE bug: a throttled tab reconciles from the wall clock on visibilitychange', () => {
    const { result } = renderHook(() => useRestTimer({ defaultSeconds: 60 }));
    act(() => result.current.start(60));

    // Tab suspended: the wall clock moves 45s but NO ticks fire.
    act(() => {
      vi.setSystemTime(new Date('2026-07-30T12:00:45Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.secondsLeft).toBe(15); // v1 would still say 60

    // Suspended past the end: completion fires on reconcile, not never.
    act(() => {
      vi.setSystemTime(new Date('2026-07-30T12:01:30Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('fires onComplete exactly ONCE when the countdown crosses zero', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useRestTimer({ defaultSeconds: 5, onComplete }));
    act(() => result.current.start(5));
    act(() => vi.advanceTimersByTime(7_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.isRunning).toBe(false);
    // Later reconciles never re-fire.
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('restart mid-count re-anchors endsAt (the engine extend path: start(left + 15))', () => {
    const { result } = renderHook(() => useRestTimer({ defaultSeconds: 60 }));
    act(() => result.current.start(60));
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.secondsLeft).toBe(30);
    act(() => result.current.start(result.current.secondsLeft + 15));
    expect(result.current.secondsLeft).toBe(45);
    act(() => vi.advanceTimersByTime(45_000));
    expect(result.current.isRunning).toBe(false);
  });

  it('stop halts and clears; a stopped timer never reconciles back to life', () => {
    const { result } = renderHook(() => useRestTimer({ defaultSeconds: 60 }));
    act(() => result.current.start(60));
    act(() => result.current.stop());
    expect(result.current.isRunning).toBe(false);
    act(() => {
      vi.setSystemTime(new Date('2026-07-30T12:05:00Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.isRunning).toBe(false);
  });

  it('exposes endsAt while running, null when idle (draft-persist seam)', () => {
    const { result } = renderHook(() => useRestTimer({ defaultSeconds: 60 }));
    expect(result.current.endsAt).toBeNull();
    act(() => result.current.start(60));
    expect(result.current.endsAt).toBe(Date.now() + 60_000);
    act(() => result.current.stop());
    expect(result.current.endsAt).toBeNull();
  });
});
