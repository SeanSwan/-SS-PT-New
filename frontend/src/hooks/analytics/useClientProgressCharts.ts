/**
 * ============================================================================
 * FILE: useClientProgressCharts.ts
 * PURPOSE: Canonical runtime hook for the 12 client-progress charts.
 * ============================================================================
 *
 * Fetches the client-safe `/api/client/analytics/chart-*` endpoints in
 * parallel, sanitizes every payload before Victory receives it, and returns
 * truthful empty shapes when logged workout data does not exist yet.
 */

import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CANONICAL_CHART_IDS,
  CANONICAL_CHART_ROUTES,
} from './useClientProgressCharts.types';
import {
  useCanonicalProgressChartsFetch,
  type UseCanonicalProgressChartsFetchReturn,
} from './useCanonicalProgressChartsFetch';

export type {
  CanonicalProgressCharts,
  ChartPoint,
} from './useClientProgressCharts.types';

/** D2: 402 = tier-locked (server truth), distinguishable from outage; the
 * background flag stops the global FrostedPaywall popping on grid loads. */
const fetchChartResponse = (authAxios: any, suffix: string) => (
  authAxios
    .get(`/api/client/analytics/${suffix}`, { _isBackgroundRequest: true })
    .then((res: any) => res?.data)
    .catch((err: any) => (err?.response?.status === 402 ? { locked: true } : null))
);

const fetchClientChartResponses = (authAxios: any) => Promise.all(
  CANONICAL_CHART_IDS.map((id) => (
    fetchChartResponse(authAxios, CANONICAL_CHART_ROUTES[id])
  )),
);

export function useClientProgressCharts(): UseCanonicalProgressChartsFetchReturn {
  const { authAxios } = useAuth();

  const fetchResponses = useCallback(() => {
    return fetchClientChartResponses(authAxios);
  }, [authAxios]);

  return useCanonicalProgressChartsFetch(Boolean(authAxios), fetchResponses);
}
