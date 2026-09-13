/**
 * Hook: useWorkoutPlannerSavedPlansList (S05, R-H22)
 * =================================================
 * THE saved-plan LIST READ. Extracted from useWorkoutPlannerSavedPlansState so
 * the read contract lives in one place and the parent hook stays inside the
 * 300-line cap.
 *
 * THE CONTRACT (documented in s05-architecture.md §"Responsibilities and contract")
 *   - `status` is explicit: idle | loading | ready | error.
 *   - ONLY `success:true` with a valid `plans` array establishes `ready`,
 *     including a valid EMPTY array. An empty array really is "no plans".
 *   - An exception, a denied response or a malformed body NEVER establishes
 *     absence: the list becomes `error` and stops being attributable to anyone.
 *   - Starting a refresh invalidates readiness immediately (`clientId` → null),
 *     so a consumer can never read stale facts as the new client's.
 *   - A completion lands only when it is the current request, the component is
 *     still mounted, and the identity it carries is the one that was asked for.
 *   - `clientId` is the identity of the SUCCESSFULLY loaded facts, not the
 *     identity that was requested. It is null whenever the read is not ready.
 *
 * This hook performs no roster-wide inference, logs no names, and adds no fetch.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { mapSavedPlan } from './workoutPlannerSavedPlanMapping';
import type { SavedPlanSummary } from './WorkoutPlannerSavedPlansSection';
import type { SavedPlansApiData } from './useWorkoutPlannerSavedPlansState.types';
import type { SavedPlansListStatus } from './plannerLogic/resolveSelectedClientAdvice';

export interface UseWorkoutPlannerSavedPlansListInput {
  authAxios: { get: (url: string) => Promise<{ data?: unknown }> };
  selectedClientId: number | null;
}

export interface UseWorkoutPlannerSavedPlansListResult {
  savedPlans: SavedPlanSummary[];
  /** Identity of the successfully loaded facts; null unless `status === 'ready'`. */
  savedPlansClientId: number | null;
  savedPlansStatus: SavedPlansListStatus;
  savedPlansLoading: boolean;
  fetchSavedPlans: (clientId: number | null) => Promise<void>;
}

export const useWorkoutPlannerSavedPlansList = ({
  authAxios,
  selectedClientId,
}: UseWorkoutPlannerSavedPlansListInput): UseWorkoutPlannerSavedPlansListResult => {
  const [savedPlans, setSavedPlans] = useState<SavedPlanSummary[]>([]);
  const [savedPlansClientId, setSavedPlansClientId] = useState<number | null>(null);
  const [savedPlansStatus, setSavedPlansStatus] = useState<SavedPlansListStatus>('idle');
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  const fetchSavedPlans = useCallback(async (clientId: number | null) => {
    const requestId = ++requestRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestRef.current;
    // A failed or unreadable list is NEVER evidence that the client has none.
    const markUnidentified = (status: SavedPlansListStatus) => {
      if (!isCurrent()) return;
      setSavedPlans([]);
      setSavedPlansClientId(null);
      setSavedPlansStatus(status);
    };

    if (!clientId) {
      markUnidentified('idle');
      setSavedPlansLoading(false);
      return;
    }

    // Begin a refresh invalidates readiness before any await.
    setSavedPlansClientId(null);
    setSavedPlansStatus('loading');
    setSavedPlansLoading(true);

    try {
      const res = await authAxios.get(`/api/workout-plans?clientId=${clientId}`);
      const data = res.data as SavedPlansApiData | undefined;
      if (!isCurrent()) return;
      if (data?.success === true && Array.isArray(data.plans)) {
        setSavedPlans(data.plans.map(mapSavedPlan));
        setSavedPlansClientId(clientId);
        setSavedPlansStatus('ready');
      } else {
        markUnidentified('error');
      }
    } catch {
      markUnidentified('error');
    } finally {
      if (isCurrent()) setSavedPlansLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchSavedPlans(selectedClientId);
    return () => {
      // Invalidate any in-flight read BEFORE unmount so its completion is dead.
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, [fetchSavedPlans, selectedClientId]);

  return { savedPlans, savedPlansClientId, savedPlansStatus, savedPlansLoading, fetchSavedPlans };
};

export default useWorkoutPlannerSavedPlansList;
