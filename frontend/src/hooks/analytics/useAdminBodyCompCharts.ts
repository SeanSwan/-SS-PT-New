/**
 * ============================================================================
 * FILE: useAdminBodyCompCharts.ts
 * PURPOSE: Admin/trainer-scoped body-composition chart trio for the selected
 *          client - weight progression, body-fat trend, and 7-day macro split.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Fetches the three truthful body-composition endpoints that already exist on
 * the analytics router but were never surfaced in the Clients & Team Progress
 * tab: chart-weight-progression and chart-body-fat-trend (real
 * body_measurements rows) and chart-macro-split (real daily_macro_logs rows).
 *
 * DATA POLICY: Same honesty contract as the canonical 12 - failed responses
 * resolve to empty series, never fabricated data. Points with non-finite or
 * non-positive y values are dropped before Victory sees them (NaN guard).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { ChartPoint } from './useClientProgressCharts.types';

export interface AdminBodyCompCharts {
  weightProgression: ChartPoint[];
  bodyFatTrend: ChartPoint[];
  macroSplit: ChartPoint[];
  macroTotalGrams: number;
}

export const EMPTY_BODY_COMP_CHARTS: AdminBodyCompCharts = {
  weightProgression: [],
  bodyFatTrend: [],
  macroSplit: [],
  macroTotalGrams: 0,
};

const BODY_COMP_ROUTES = [
  'chart-weight-progression',
  'chart-body-fat-trend',
  'chart-macro-split',
] as const;

const sanitizePoints = (rows: unknown): ChartPoint[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is { x: unknown; y: unknown } => Boolean(row) && typeof row === 'object')
    .map((row, index) => ({
      x: typeof row.x === 'string' && row.x.length > 0 ? row.x : `Point ${index + 1}`,
      y: Number(row.y),
    }))
    .filter((point) => Number.isFinite(point.y) && point.y > 0);
};

const fetchBodyCompResponse = (
  authAxios: any,
  userId: number | string,
  suffix: string,
) => (
  authAxios
    .get(`/api/analytics/${userId}/${suffix}`)
    .then((res: any) => res?.data)
    .catch(() => null)
);

export function buildBodyCompChartsFromResponses(
  responses: Array<{ success?: boolean; data?: unknown; totalGrams?: number } | null>,
): AdminBodyCompCharts {
  const [weightRes, bodyFatRes, macroRes] = responses;
  const dataOf = (res: typeof responses[number]) => (
    res && res.success === true ? res.data : null
  );

  return {
    weightProgression: sanitizePoints(dataOf(weightRes)),
    bodyFatTrend: sanitizePoints(dataOf(bodyFatRes)),
    macroSplit: sanitizePoints(dataOf(macroRes)),
    macroTotalGrams: macroRes && macroRes.success === true && Number.isFinite(Number(macroRes.totalGrams))
      ? Number(macroRes.totalGrams)
      : 0,
  };
}

export interface UseAdminBodyCompChartsReturn {
  charts: AdminBodyCompCharts;
  isLoading: boolean;
  nonEmptyCount: number;
}

/**
 * Idle when userId is null/undefined. Errors resolve to honest-empty series;
 * the panel renders its empty states rather than fake values.
 */
export function useAdminBodyCompCharts(
  userId: number | string | null | undefined,
): UseAdminBodyCompChartsReturn {
  const { authAxios } = useAuth();
  const [charts, setCharts] = useState<AdminBodyCompCharts>(EMPTY_BODY_COMP_CHARTS);
  const [isLoading, setIsLoading] = useState(false);
  const hasClientId = Boolean(userId);

  const fetchAll = useCallback(async () => {
    if (!hasClientId || !authAxios) return;
    setIsLoading(true);
    try {
      const responses = await Promise.all(
        BODY_COMP_ROUTES.map((suffix) => fetchBodyCompResponse(authAxios, userId as number | string, suffix)),
      );
      setCharts(buildBodyCompChartsFromResponses(responses));
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, hasClientId, userId]);

  useEffect(() => {
    setCharts(EMPTY_BODY_COMP_CHARTS);
    void fetchAll();
  }, [fetchAll]);

  const nonEmptyCount = useMemo(() => (
    [charts.weightProgression, charts.bodyFatTrend, charts.macroSplit]
      .filter((series) => series.length > 0).length
  ), [charts]);

  return { charts, isLoading, nonEmptyCount };
}
