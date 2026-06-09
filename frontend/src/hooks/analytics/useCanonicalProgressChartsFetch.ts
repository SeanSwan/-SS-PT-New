/**
 * useCanonicalProgressChartsFetch
 * ===============================
 *
 * Shared React state machine for the canonical 12-chart progress feed.
 * Client and admin hooks provide only their namespace-specific fetcher.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CANONICAL_CHART_IDS,
  type CanonicalProgressCharts,
} from './useClientProgressCharts.types';
import {
  buildCanonicalProgressChartsFromResponses,
  countNonEmptyCharts,
  countUnavailableChartResponses,
  EMPTY_CANONICAL_PROGRESS_CHARTS,
} from './useClientProgressChartsResponseMapping';

type FetchProgressChartResponses = () => Promise<any[]>;
type ChartResponseResult =
  | { ok: true; responses: any[] }
  | { ok: false; error: unknown };

export interface UseCanonicalProgressChartsFetchReturn {
  charts: CanonicalProgressCharts;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  nonEmptyChartCount: number;
  unavailableChartCount: number;
}

const resolveChartResponses = async (
  fetchResponses: FetchProgressChartResponses,
): Promise<ChartResponseResult> => {
  try {
    const responses = await fetchResponses();
    return { ok: true, responses };
  } catch (error) {
    return { ok: false, error };
  }
};

const messageFromError = (error: any): string => (
  error?.message || 'Failed to load progress charts'
);

export function useCanonicalProgressChartsFetch(
  isEnabled: boolean,
  fetchResponses: FetchProgressChartResponses,
): UseCanonicalProgressChartsFetchReturn {
  const [charts, setCharts] = useState<CanonicalProgressCharts>(
    EMPTY_CANONICAL_PROGRESS_CHARTS,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailableChartCount, setUnavailableChartCount] = useState(0);

  const fetchAll = useCallback(async () => {
    if (!isEnabled) return;
    setIsLoading(true);
    setError(null);
    setUnavailableChartCount(0);

    const result = await resolveChartResponses(fetchResponses);
    if (!result.ok) {
      setError(messageFromError(result.error));
      setUnavailableChartCount(CANONICAL_CHART_IDS.length);
    } else {
      setUnavailableChartCount(countUnavailableChartResponses(result.responses));
      setCharts(buildCanonicalProgressChartsFromResponses(result.responses));
    }
    setIsLoading(false);
  }, [fetchResponses, isEnabled]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const nonEmptyChartCount = useMemo(() => countNonEmptyCharts(charts), [charts]);

  return useMemo(
    () => ({
      charts,
      isLoading,
      error,
      refetch: fetchAll,
      nonEmptyChartCount,
      unavailableChartCount,
    }),
    [charts, isLoading, error, fetchAll, nonEmptyChartCount, unavailableChartCount],
  );
}
