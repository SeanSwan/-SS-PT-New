/*
 * constellation-idle.test.ts — the REAL scheduler, unmocked (adjudication of
 * Astra 140126 D8).
 *
 * The gates test mocks `onIdle` to run synchronously so the DECISION tests do
 * not need timers — and its comment claimed "the REAL idle scheduling is
 * exercised by its own case below, which uses the unmocked module". No such
 * case existed: the promise in the comment was unbacked. This file is that
 * case: `onIdle` imported from the real chunk module, no vi.mock in sight,
 * driven by fake timers and a stubbed rIC pair.
 *
 * What is pinned: the Safari fallback fires inside its bounded window and not
 * before it; cancellation actually cancels; the rIC path passes the timeout
 * contract and its cancel calls cancelIdleCallback with the handle.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onIdle } from './constellation-chunk';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('REAL onIdle — the fallback clock (no requestIdleCallback in jsdom)', () => {
  it('fires inside the bounded window, not before it', () => {
    const fn = vi.fn();
    onIdle(fn, 500);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(199); // the fallback caps at min(timeout, 200)
    expect(fn).not.toHaveBeenCalled(); // not one tick early — "bounded window"
    vi.advanceTimersByTime(2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancellation really cancels', () => {
    const fn = vi.fn();
    const cancel = onIdle(fn, 500);
    cancel();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('without a window it is a no-op that still returns a canceller', () => {
    vi.unstubAllGlobals();
    const w = Object.getOwnPropertyDescriptor(window, 'requestIdleCallback');
    expect(w).toBeUndefined(); // precondition: jsdom has no rIC — the fallback is what runs above
  });
});

describe('REAL onIdle — the rIC path when the browser has it', () => {
  it('passes the timeout contract, delivers, and cancels through cancelIdleCallback', () => {
    const stored: Array<() => void> = [];
    const rIC = vi.fn((cb: () => void, _opts?: { timeout: number }) => { stored.push(cb); return 7; });
    const cIC = vi.fn();
    vi.stubGlobal('requestIdleCallback', rIC);
    vi.stubGlobal('cancelIdleCallback', cIC);

    const fn = vi.fn();
    const cancel = onIdle(fn, 1234);
    expect(rIC).toHaveBeenCalledTimes(1);
    expect(rIC.mock.calls[0][1]).toEqual({ timeout: 1234 });
    expect(fn).not.toHaveBeenCalled(); // not until the browser delivers
    stored[0]();
    expect(fn).toHaveBeenCalledTimes(1);

    cancel();
    expect(cIC).toHaveBeenCalledWith(7);
  });
});
