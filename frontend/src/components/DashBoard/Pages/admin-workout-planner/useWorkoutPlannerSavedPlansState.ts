/**
 * Hook: useWorkoutPlannerSavedPlansState
 * Purpose: Own saved-plan list loading and card-level saved-plan actions for
 * the admin/trainer Workout Planner while keeping the mounted page focused on
 * builder orchestration.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { logApiError } from '../../../../utils/logApiError';
import type { WorkoutPlannerConfirmRequest } from './WorkoutPlannerConfirmDialog';
import type { SavedPlanSummary } from './WorkoutPlannerSavedPlansSection';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

interface PlannerAuthClient {
  get: (url: string) => Promise<{ data?: unknown }>;
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  delete: (url: string) => Promise<{ data?: unknown }>;
}

interface SavedPlansApiData {
  success?: boolean;
  plans?: Array<Record<string, unknown>>;
}

interface UseWorkoutPlannerSavedPlansStateInput {
  authAxios: PlannerAuthClient;
  selectedClientId: number | null;
  loadedPlanId: string | null;
  currentExercisesSig: string;
  setSavedSnapshot: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanName: Dispatch<SetStateAction<string | null>>;
  resetLoadedPlanState: () => void;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
  setConfirmRequest: Dispatch<SetStateAction<WorkoutPlannerConfirmRequest | null>>;
}

const mapSavedPlan = (plan: Record<string, unknown>): SavedPlanSummary => {
  const planData = plan.planData as Record<string, unknown> | undefined;

  return {
    id: String(plan.id || ''),
    name: String(plan.title || plan.name || 'Untitled Plan'),
    status: String(plan.status || 'draft'),
    createdAt: String(plan.createdAt || ''),
    goal: String(planData?.goal || plan.goal || ''),
  };
};

export const useWorkoutPlannerSavedPlansState = ({
  authAxios,
  selectedClientId,
  loadedPlanId,
  currentExercisesSig,
  setSavedSnapshot,
  setLoadedPlanName,
  resetLoadedPlanState,
  setStatusMsg,
  setConfirmRequest,
}: UseWorkoutPlannerSavedPlansStateInput) => {
  const [savedPlans, setSavedPlans] = useState<SavedPlanSummary[]>([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);

  const fetchSavedPlans = useCallback(async (clientId: number | null) => {
    if (!clientId) {
      setSavedPlans([]);
      return;
    }

    setSavedPlansLoading(true);
    try {
      const res = await authAxios.get(`/api/workout/plans?clientId=${clientId}`);
      const data = res.data as SavedPlansApiData | undefined;
      if (data?.success && Array.isArray(data.plans)) {
        setSavedPlans(data.plans.map(mapSavedPlan));
      } else {
        setSavedPlans([]);
      }
    } catch {
      setSavedPlans([]);
    } finally {
      setSavedPlansLoading(false);
    }
  }, [authAxios]);

  const handleCardActivate = useCallback(async (planId: string, planName: string) => {
    if (!selectedClientId) return;
    try {
      await authAxios.put(`/api/workout-plans/${planId}/activate`);
      setStatusMsg({ type: 'success', text: `${planName} is now the current plan.` });
      if (loadedPlanId === planId) {
        setSavedSnapshot(currentExercisesSig);
      }
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Activate plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to make plan current. Please try again.' });
    }
  }, [authAxios, currentExercisesSig, fetchSavedPlans, loadedPlanId, selectedClientId, setSavedSnapshot, setStatusMsg]);

  const handleCardRename = useCallback(async (planId: string, newName: string) => {
    if (!selectedClientId) return;
    try {
      await authAxios.put(`/api/workout-plans/${planId}`, { title: newName });
      setStatusMsg({ type: 'success', text: `Renamed to "${newName}".` });
      if (loadedPlanId === planId) {
        setLoadedPlanName(newName);
      }
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Rename plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to rename plan.' });
    }
  }, [authAxios, fetchSavedPlans, loadedPlanId, selectedClientId, setLoadedPlanName, setStatusMsg]);

  const handleCardDuplicate = useCallback(async (planId: string, planName: string) => {
    if (!selectedClientId) return;
    try {
      await authAxios.post(`/api/workout-plans/${planId}/duplicate`, {});
      setStatusMsg({ type: 'success', text: `Duplicated "${planName}" as draft.` });
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Duplicate plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to duplicate plan.' });
    }
  }, [authAxios, fetchSavedPlans, selectedClientId, setStatusMsg]);

  const handleCardArchive = useCallback((planId: string, planName: string) => {
    if (!selectedClientId) return;
    setConfirmRequest({
      title: `Archive "${planName}"?`,
      message: 'This moves the plan to the archive while keeping client history available.',
      confirmLabel: 'Archive plan',
      tone: 'warning',
      onConfirm: async () => {
        try {
          await authAxios.delete(`/api/workout-plans/${planId}`);
          setStatusMsg({ type: 'success', text: `Archived "${planName}".` });
          if (loadedPlanId === planId) {
            resetLoadedPlanState();
          }
          fetchSavedPlans(selectedClientId);
        } catch (err) {
          logApiError('Archive plan failed', err);
          setStatusMsg({ type: 'error', text: 'Failed to archive plan.' });
        }
      },
    });
  }, [authAxios, fetchSavedPlans, loadedPlanId, resetLoadedPlanState, selectedClientId, setConfirmRequest, setStatusMsg]);

  const activePlanCount = useMemo(
    () => savedPlans.filter(plan => plan.status === 'active').length,
    [savedPlans],
  );

  const archiveBlockedFor = useCallback((planStatus: string) =>
    planStatus === 'active' && activePlanCount <= 1,
    [activePlanCount],
  );

  useEffect(() => {
    fetchSavedPlans(selectedClientId);
  }, [fetchSavedPlans, selectedClientId]);

  return {
    savedPlans,
    savedPlansLoading,
    fetchSavedPlans,
    archiveBlockedFor,
    handleCardActivate,
    handleCardRename,
    handleCardDuplicate,
    handleCardArchive,
  };
};
