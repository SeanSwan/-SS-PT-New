/**
 * ============================================================================
 * FILE: useAdminClientProgressCharts.ts
 * PURPOSE: Admin/trainer-scoped variant of the Phase 14 canonical chart hook
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-16 (Phase 15.3)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Fetches the same 12 canonical client-progress chart datasets as
 * `useClientProgressCharts`, but hits the admin/trainer-scoped endpoints
 * at `/api/analytics/:userId/chart-*` instead of the JWT-derived client-
 * safe endpoints at `/api/client/analytics/chart-*`.
 *
 * WHY THIS EXISTS:
 * The Clients & Team workspace renders the selected client's progress in
 * the admin context. The admin routes use `:userId` in the URL (protected
 * by `requireOwnershipOrTrainer` + `requireTier('pro')` middleware), while
 * the client-safe routes derive userId from the JWT token. Both hit the
 * same controller functions — the only difference is the route prefix.
 *
 * REUSES: all types and canonical chart ID constants from
 * `useClientProgressCharts` so the two surfaces share the same data
 * contract and any new chart added to one is immediately available to
 * the other.
 */

import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CANONICAL_CHART_IDS,
  CANONICAL_CHART_ROUTES,
  type CanonicalProgressCharts,
} from './useClientProgressCharts.types';
import {
  useCanonicalProgressChartsFetch,
  type UseCanonicalProgressChartsFetchReturn,
} from './useCanonicalProgressChartsFetch';

// Re-export the shared bundle type so consumers can import from one place.
export type { CanonicalProgressCharts };

const fetchAdminChartResponse = (
  authAxios: any,
  userId: number | string,
  suffix: string,
) => (
  authAxios
    .get(`/api/analytics/${userId}/${suffix}`)
    .then((res: any) => res?.data)
    .catch(() => null)
);

const fetchAdminChartResponses = (
  authAxios: any,
  userId: number | string,
) => Promise.all(
  CANONICAL_CHART_IDS.map((id) => (
    fetchAdminChartResponse(authAxios, userId, CANONICAL_CHART_ROUTES[id])
  )),
);

/**
 * Admin/trainer-scoped chart hook. Same 12 canonical charts as
 * `useClientProgressCharts`, but routes through `/api/analytics/:userId/chart-*`.
 *
 * @param userId — the client userId to fetch charts for. When null/undefined
 *   the hook is idle (no fetch).
 */
export function useAdminClientProgressCharts(
  userId: number | string | null | undefined,
): UseCanonicalProgressChartsFetchReturn {
  const { authAxios } = useAuth();
  const hasClientId = Boolean(userId);

  const fetchResponses = useCallback(() => {
    return fetchAdminChartResponses(authAxios, userId as number | string);
  }, [authAxios, userId]);

  return useCanonicalProgressChartsFetch(hasClientId, fetchResponses);
}
