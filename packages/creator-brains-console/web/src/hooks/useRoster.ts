/*
 * useRoster — the creator list, with the same discipline as `useStatus`.
 *
 * WHY THIS IS NOT A COPY OF `useStatus` WITH A DIFFERENT CALL. The roster differs
 * in one way that matters: it is written to as well as read, so it needs a
 * RE-READ that a write can await. `refresh()` therefore returns a Promise and
 * `Roster` awaits it after every mutation, which is what makes T-W4's
 * "optimistic-free re-read renders truth" true rather than aspirational.
 *
 * THE POLL IS OFF BY DEFAULT. A roster changes only when the operator changes it,
 * so polling it on the status cadence would be traffic that cannot reveal
 * anything new — and would race the re-read after a write. `pollMs: 0` is the
 * default; a caller who wants a live roster passes a cadence.
 *
 * NO OVERLAP, AND A WATCHDOG. Both are inherited obligations, not choices:
 * without the latch a slow list could stack requests, and without the watchdog a
 * request that never settles would hold the latch forever and silently freeze the
 * roster — the exact S1-H4 defect, in a second hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsoleApiError, type ErrorCode } from '../adapters';
import type { CreatorRow } from '../adapters';

export type RosterPhase = 'loading' | 'ready' | 'error';

export interface RosterState {
  phase: RosterPhase;
  rows: CreatorRow[];
  error: { code: ErrorCode; message: string; file: string | null } | null;
  initial: boolean;
}

export interface UseRosterOptions {
  pollMs?: number; // 0 (default) disables polling — a roster changes on writes
  enabled?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function timeoutError(ms: number): ConsoleApiError {
  return new ConsoleApiError('TRANSPORT', `no response from the bridge within ${ms}ms`, { status: null });
}

export function useRoster(
  adapter: { listCreators(): Promise<CreatorRow[]> },
  opts: UseRosterOptions = {},
): RosterState & { refresh: () => Promise<void> } {
  const { pollMs = 0, enabled = true, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;

  const [state, setState] = useState<RosterState>({
    phase: 'loading', rows: [], error: null, initial: true,
  });

  const latch = useRef(false);
  const mounted = useRef(true);
  // A generation counter, so a slow list that resolves AFTER a write-triggered
  // refresh cannot overwrite the newer rows with older ones. Without it, the
  // roster would flicker back to the pre-write contents.
  const gen = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async (): Promise<void> => {
    if (latch.current) return; // never overlap
    latch.current = true;
    const mine = ++gen.current;
    const watchdog = timeoutMs > 0
      ? new Promise<never>((_, rej) => setTimeout(() => rej(timeoutError(timeoutMs)), timeoutMs))
      : null;

    try {
      const rows = watchdog === null
        ? await adapter.listCreators()
        : await Promise.race([adapter.listCreators(), watchdog]);
      if (!mounted.current || mine !== gen.current) return;
      setState({ phase: 'ready', rows, error: null, initial: false });
    } catch (e) {
      if (!mounted.current || mine !== gen.current) return;
      const err = e instanceof Error ? e : new Error(String(e));
      setState((prev) => ({
        phase: 'error',
        // KEEP THE LAST GOOD ROWS (the `useStatus` rule): a refresh that failed
        // must not blank a list that was correct a moment ago.
        rows: prev.rows,
        error: {
          code: (e as ConsoleApiError).code ?? 'INTERNAL',
          message: err.message,
          file: null,
        },
        initial: false,
      }));
    } finally {
      latch.current = false;
    }
  }, [adapter, timeoutMs]);

  useEffect(() => {
    if (!enabled) return undefined;
    void load();
    if (pollMs <= 0) return undefined;
    const t = setInterval(() => { void load(); }, pollMs);
    return () => clearInterval(t);
  }, [load, enabled, pollMs]);

  return { ...state, refresh: load };
}
