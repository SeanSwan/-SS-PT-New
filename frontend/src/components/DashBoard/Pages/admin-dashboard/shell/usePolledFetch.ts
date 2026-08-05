/**
 * usePolledFetch
 * ─────────────────────────────────────────────────────────────
 * Standard data-lifecycle hook for admin Command Center widgets
 * (SWA-138 S1 — WidgetShell foundation).
 *
 * Contract it enforces (blueprint §3 cross-cutting fix #3):
 *  - `loading` is true ONLY before the first result — never again,
 *    so widgets can render skeletons instead of false zeros.
 *  - A failed refresh KEEPS the last good data (stale-after-failure)
 *    and surfaces `error` beside it — never silently swallowed.
 *  - Polls every `intervalMs` (default 60s), skipping ticks while
 *    the tab is hidden; exposes manual `refresh()`.
 *  - Out-of-order responses are dropped via a sequence counter.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PolledFetchOptions {
  /** Poll interval in ms. Default 60_000. Pass 0 to disable polling. */
  intervalMs?: number;
  /** Master switch — when false, nothing fetches. Default true. */
  enabled?: boolean;
}

export interface PolledFetchResult<T> {
  data: T | null;
  /** True only before the first settled fetch. */
  loading: boolean;
  /** True while a non-initial fetch is in flight. */
  refreshing: boolean;
  /** Human-readable failure of the LAST attempt; null after any success. */
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const DEFAULT_INTERVAL_MS = 60_000;

export function usePolledFetch<T>(
  fetcher: () => Promise<T>,
  { intervalMs = DEFAULT_INTERVAL_MS, enabled = true }: PolledFetchOptions = {},
): PolledFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mountedRef = useRef(true);
  const seqRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const runFetch = useCallback(async () => {
    const seq = ++seqRef.current;
    if (hasLoadedRef.current) {
      setRefreshing(true);
    }
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current || seq !== seqRef.current) return;
      hasLoadedRef.current = true;
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current || seq !== seqRef.current) return;
      const message =
        err instanceof Error && err.message ? err.message : 'Request failed';
      setError(message);
    } finally {
      if (mountedRef.current && seq === seqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return undefined;
    runFetch();
    if (intervalMs > 0) {
      const id = window.setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        runFetch();
      }, intervalMs);
      return () => {
        mountedRef.current = false;
        window.clearInterval(id);
      };
    }
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, intervalMs, runFetch]);

  return { data, loading, refreshing, error, lastUpdated, refresh: runFetch };
}

export default usePolledFetch;
