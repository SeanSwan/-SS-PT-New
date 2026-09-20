/*
 * useStatus — ephemeral poll cache for one adapter call.
 *
 * 02-blueprint.md §2 "State ownership": the server owns truth, the client holds
 * an ephemeral poll cache only, and no global state library is introduced.
 *
 * The poll loop is cancelled on unmount and never overlaps itself: a slow
 * response cannot stack a second in-flight request.
 *
 * S1-H4: "never overlaps itself" was enforced by an `inFlight` latch that only
 * cleared in `finally`. A request that never settles therefore held the latch
 * forever and silently disabled polling for the rest of the session — the board
 * would sit on a stale reading with no way back short of a reload. Every load is
 * now raced against a watchdog, so the latch always releases.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsoleApiError, describeError, type ErrorCode } from '../adapters';
import type { StatusInstrument } from '../adapters';

export type LoadPhase = 'loading' | 'ready' | 'error';

export interface StatusState {
  phase: LoadPhase;
  status: StatusInstrument | null;
  error: { code: ErrorCode; message: string; file: string | null } | null;
  /** True only for the very first load; later polls must not flash a skeleton. */
  initial: boolean;
}

export interface UseStatusOptions {
  pollMs?: number; // 0 disables polling
  enabled?: boolean;
  /**
   * Abort a request that has not answered within this many ms (S1-H4).
   * Must be > 0; a non-positive value disables the watchdog.
   */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * A watchdog rejection is a TRANSPORT failure, not a new error code: no response
 * was ever received, which is exactly what `mapTransportError` describes. Adding
 * a TIMEOUT code would widen the §2 envelope for a purely client-side condition.
 */
function timeoutError(ms: number): ConsoleApiError {
  return new ConsoleApiError('TRANSPORT', `no response from the bridge within ${ms}ms`, { status: null });
}

export function useStatus(
  adapter: { getStatus(): Promise<StatusInstrument> },
  opts: UseStatusOptions = {},
): StatusState & { refresh: () => void } {
  const { pollMs = 5000, enabled = true, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;

  const [state, setState] = useState<StatusState>({
    phase: 'loading',
    status: null,
    error: null,
    initial: true,
  });

  const mounted = useRef(true);
  const inFlight = useRef(false);
  /**
   * Bumped on every load. A timed-out request may still answer later; comparing
   * its generation is what stops that late answer from overwriting a newer
   * reading with older data.
   */
  const generation = useRef(0);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const load = useCallback(async () => {
    if (inFlight.current) return; // never stack polls
    inFlight.current = true;
    const gen = ++generation.current;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    try {
      const status = await Promise.race([
        adapterRef.current.getStatus(),
        new Promise<never>((_resolve, reject) => {
          if (timeoutMs <= 0) return; // watchdog disabled
          watchdog = setTimeout(() => reject(timeoutError(timeoutMs)), timeoutMs);
        }),
      ]);
      if (!mounted.current || gen !== generation.current) return;
      setState({ phase: 'ready', status, error: null, initial: false });
    } catch (err) {
      if (!mounted.current || gen !== generation.current) return;
      setState((prev) => ({ phase: 'error', status: prev.status, error: describeError(err), initial: false }));
    } finally {
      if (watchdog !== undefined) clearTimeout(watchdog);
      inFlight.current = false; // always releases — this is the S1-H4 fix
    }
  }, [timeoutMs]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return undefined;

    void load();
    if (pollMs <= 0) return undefined;

    const timer = setInterval(() => {
      void load();
    }, pollMs);

    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [enabled, pollMs, load]);

  return { ...state, refresh };
}
