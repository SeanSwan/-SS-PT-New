/*
 * S1-H4 — the poll loop must never be wedged by a request that never answers.
 *
 * The original latch cleared only in `finally`. A hung fetch therefore held it
 * forever and silently disabled every later poll: the board sat on a stale
 * reading with no path back short of a reload. These tests pin the watchdog that
 * releases it, and the generation guard that keeps a late answer from landing.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStatus } from './useStatus';
import type { StatusInstrument } from '../adapters';
import * as fx from '../adapters/fixtures';

describe('S1-H4 useStatus watchdog', () => {
  it('times out a request that never answers, then recovers on the next poll', async () => {
    let call = 0;
    const adapter = {
      getStatus(): Promise<StatusInstrument> {
        call += 1;
        if (call === 1) return new Promise<never>(() => {}); // never settles
        return Promise.resolve(fx.healthyStatus);
      },
    };

    const { result } = renderHook(() => useStatus(adapter, { pollMs: 0, timeoutMs: 40 }));

    await waitFor(() => expect(result.current.phase).toBe('error'), { timeout: 3000 });
    // a watchdog is a transport failure: no response was ever received
    expect(result.current.error?.code).toBe('TRANSPORT');
    expect(result.current.error?.message).toMatch(/within 40ms/);

    // the latch was released, so the board is recoverable without a reload
    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.phase).toBe('ready'), { timeout: 3000 });
    expect(result.current.status?.creators.enabled).toBe(9);
  });

  it('discards a late answer from a request it already timed out', async () => {
    let resolveFirst: (v: StatusInstrument) => void = () => {};
    let call = 0;
    const adapter = {
      getStatus(): Promise<StatusInstrument> {
        call += 1;
        if (call === 1) {
          return new Promise<StatusInstrument>((res) => {
            resolveFirst = res;
          });
        }
        return Promise.resolve(fx.damagedRegistryStatus);
      },
    };

    const { result } = renderHook(() => useStatus(adapter, { pollMs: 0, timeoutMs: 40 }));

    await waitFor(() => expect(result.current.phase).toBe('error'), { timeout: 3000 });
    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.phase).toBe('ready'), { timeout: 3000 });
    expect(result.current.status?.creators.damaged?.file).toBe('registry.json');

    // The abandoned first request finally answers — with a HEALTHY reading. It is
    // older than what is on screen, so it must not overwrite it.
    await act(async () => {
      resolveFirst(fx.healthyStatus);
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(result.current.status?.creators.damaged?.file).toBe('registry.json');
  });

  it('keeps the last good reading visible when a later poll fails', async () => {
    let call = 0;
    const adapter = {
      getStatus(): Promise<StatusInstrument> {
        call += 1;
        if (call === 1) return Promise.resolve(fx.healthyStatus);
        return Promise.reject(new Error('bridge went away'));
      },
    };

    const { result } = renderHook(() => useStatus(adapter, { pollMs: 0 }));

    await waitFor(() => expect(result.current.phase).toBe('ready'), { timeout: 3000 });
    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.phase).toBe('error'), { timeout: 3000 });
    expect(result.current.status?.creators.enabled).toBe(9); // stale-but-labelled
    expect(result.current.error?.code).toBe('UNKNOWN');
  });
});

/*
 * Astra round 1, P2f — "Return cleanup for both enabled and disabled modes,
 * invalidating outstanding reads. Test an unresolved initial request, unmount,
 * then resolve it."
 *
 * THE MEASUREMENT THAT MADE THESE TWO CASES NECESSARY. Before the fix, with
 * `enabled: false`, the hook did not read AT ALL:
 *
 *   load() was called at all?   false
 *   renders recorded:           1
 *
 * So the post-unmount write was impossible — not because the cleanup ran, but
 * because nothing was ever in flight. The leak was LATENT, and the assertion
 * "no render after unmount" would have passed on broken code for the wrong
 * reason. Both cases below therefore assert the READ as well as the cleanup:
 * without the first, fixing the read alone silently arms the leak that the
 * second is meant to catch.
 */
describe('P2f useStatus cleanup on both paths', () => {
  /** An adapter whose FIRST read never settles, so unmount can straddle it. */
  function deferred() {
    let resolve!: (v: StatusInstrument) => void;
    let started = false;
    const adapter = {
      getStatus(): Promise<StatusInstrument> {
        started = true;
        return new Promise<StatusInstrument>((res) => { resolve = res; });
      },
    };
    return { adapter, resolve: (v: StatusInstrument) => resolve(v), started: () => started };
  }

  it('DISABLED polling still reads once — the initial read is not gated on the loop', async () => {
    const d = deferred();
    // `enabled: false` on purpose. A caller who disables the loop still asks
    // "what is the state right now?", and the answer must not be silence.
    renderHook(() => useStatus(d.adapter, { enabled: false }));

    await waitFor(() => expect(d.started()).toBe(true));
  });

  it('pollMs:0 still reads once', async () => {
    const d = deferred();
    // The other disabled spelling. `pollMs: 0` is the documented "disables
    // polling" switch, and it must not disable the first read either.
    renderHook(() => useStatus(d.adapter, { pollMs: 0 }));

    await waitFor(() => expect(d.started()).toBe(true));
  });

  it('an unresolved initial request is invalidated by unmount, then resolved', async () => {
    const d = deferred();
    const seen: string[] = [];
    const { unmount } = renderHook(() => {
      const s = useStatus(d.adapter, { enabled: false });
      seen.push(s.phase);
      return s;
    });

    await waitFor(() => expect(d.started()).toBe(true));
    const rendersBeforeUnmount = seen.length;

    // ── the barrier: unmount while the request is STILL IN FLIGHT
    unmount();

    // ── then it answers. Under the pre-fix code `mounted.current` was still
    // true (the cleanup was skipped), so this write landed on a dead component.
    await act(async () => {
      d.resolve(fx.healthyStatus);
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(seen.length).toBe(rendersBeforeUnmount);
    expect(seen[seen.length - 1]).toBe('loading'); // never reached 'ready'
  });
});
