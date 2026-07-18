/**
 * Dashboards v2 — useDashboardSummary (KIMI-DASHBOARDS §2.2). ONE summary call per density.
 * Abort on unmount; poll per DENSITY_CONFIG (or focus-refetch when pollMs=0); on 5xx keep the
 * last-good summary + surface an error flag (§3.3 toast is the density's call). No client shaping.
 */
import { useCallback, useEffect, useState } from 'react';
import type { DashboardSummary, Role } from '../types';
import { authHeaders } from '../authHeaders';

export interface DashboardSummaryState {
  summary: DashboardSummary | null;
  error: boolean;
  isRefetching: boolean;
  lastUpdatedAt: string;
  refetch(): void;
}

export function useDashboardSummary(role: Role, pollMs: number): DashboardSummaryState {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState(false);
  const [isRefetching, setRefetching] = useState(false);

  const fetchOnce = useCallback(
    async (signal?: AbortSignal) => {
      setRefetching(true);
      try {
        const res = await fetch(`/api/dashboard/v2/summary?role=${encodeURIComponent(role)}`, {
          credentials: 'same-origin',
          headers: authHeaders(), // protect reads Bearer only — no cookie fallback
          signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as DashboardSummary;
        setSummary(json);
        setError(false);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setError(true); // keep last-good
      } finally {
        setRefetching(false);
      }
    },
    [role],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchOnce(ctrl.signal);
    let timer: ReturnType<typeof setInterval> | undefined;
    const onFocus = () => void fetchOnce(ctrl.signal);
    if (pollMs > 0) {
      timer = setInterval(() => void fetchOnce(ctrl.signal), pollMs);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    return () => {
      ctrl.abort();
      if (timer) clearInterval(timer);
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
    };
  }, [fetchOnce, pollMs]);

  return {
    summary,
    error,
    isRefetching,
    lastUpdatedAt: summary?.generatedAt ?? '', // server-provided; no client clock
    refetch: () => void fetchOnce(),
  };
}
