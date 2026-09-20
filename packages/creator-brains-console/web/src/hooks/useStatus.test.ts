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
