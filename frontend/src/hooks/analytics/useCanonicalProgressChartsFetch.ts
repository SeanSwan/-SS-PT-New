/**
 * useCanonicalProgressChartsFetch
 * ===============================
 *
 * Shared React state machine for the canonical 15-chart progress feed.
 * Client and admin hooks provide only their namespace-specific fetcher.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CANONICAL_CHART_IDS,
  type CanonicalChartId,
  type CanonicalProgressCharts,
} from './useClientProgressCharts.types';
import {
  buildCanonicalProgressChartsFromResponses,
  countNonEmptyCharts,
  countUnavailableChartResponses,
  EMPTY_CANONICAL_PROGRESS_CHARTS,
} from './useClientProgressChartsResponseMapping';

type FetchProgressChartResponses = () => Promise<readonly unknown[]>;
type ChartResponseResult =
  | { ok: true; responses: readonly unknown[] }
  | { ok: false; error: unknown };

export interface UseCanonicalProgressChartsFetchReturn {
  charts: CanonicalProgressCharts;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  nonEmptyChartCount: number;
  unavailableChartCount: number;
  lockedChartIds: CanonicalChartId[];
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const messageFromError = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (isRecord(error) && typeof error.message === 'string' && error.message) return error.message;
  return 'Failed to load progress charts';
};

const isLockedResponse = (value: unknown): boolean =>
  isRecord(value) && value.locked === true;

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
  const [lockedChartIds, setLockedChartIds] = useState<CanonicalChartId[]>([]);

  const fetchAll = useCallback(async () => {
    if (!isEnabled) return;
    setIsLoading(true);
    setError(null);
    setUnavailableChartCount(0);
    setLockedChartIds([]);

    const result = await resolveChartResponses(fetchResponses);
    if (!result.ok) {
      setError(messageFromError(result.error));
      setUnavailableChartCount(CANONICAL_CHART_IDS.length);
    } else {
      setUnavailableChartCount(countUnavailableChartResponses(result.responses));
      // D2: 402-locked charts (server tier truth) render as upsell cards.
      setLockedChartIds(CANONICAL_CHART_IDS.filter(
        (_, index) => isLockedResponse(result.responses[index]),
      ));
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
      lockedChartIds,
    }),
    [charts, isLoading, error, fetchAll, nonEmptyChartCount, unavailableChartCount, lockedChartIds],
  );
}
