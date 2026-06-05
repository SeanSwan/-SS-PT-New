/**
 * Hook: useWorkoutPlannerSaveActions
 * Purpose: Own Workout Planner save/update network actions and their saving
 * state so the mounted page can stay focused on route and builder wiring.
 */

import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { logApiError } from '../../../../utils/logApiError';
import type { PlannerClient, PlanExercise, PlanGoal } from './WorkoutPlannerTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

interface PlannerAuthClient {
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
}

interface SaveActionResponseData {
  plan?: {
    id?: unknown;
    title?: unknown;
  };
}

interface UseWorkoutPlannerSaveActionsInput {
  authAxios: PlannerAuthClient;
  selectedClientId: number | null;
  planExercisesLength: number;
  hasGeneratedHorizonPlan: boolean;
  loadedPlanId: string | null;
  phaseName: string;
  phaseNumber: number;
  categoryLabel: string;
  goal: PlanGoal;
  clients: PlannerClient[];
  buildPlanData: () => unknown;
  currentExercisesSig: string;
  fetchSavedPlans: (clientId: number | null) => Promise<void>;
  setSavedSnapshot: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanId: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanName: Dispatch<SetStateAction<string | null>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}

export const useWorkoutPlannerSaveActions = ({
  authAxios,
  selectedClientId,
  planExercisesLength,
  hasGeneratedHorizonPlan,
  loadedPlanId,
  phaseName,
  phaseNumber,
  categoryLabel,
  goal,
  clients,
  buildPlanData,
  currentExercisesSig,
  fetchSavedPlans,
  setSavedSnapshot,
  setLoadedPlanId,
  setLoadedPlanName,
  setStatusMsg,
}: UseWorkoutPlannerSaveActionsInput) => {
  const [saving, setSaving] = useState(false);

  const hasSaveablePlan = selectedClientId && (planExercisesLength > 0 || hasGeneratedHorizonPlan);

  const handleSaveDraft = useCallback(async () => {
    if (!hasSaveablePlan || !selectedClientId) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const res = await authAxios.post('/api/workout-plans', {
        userId: selectedClientId,
        title: `${client?.firstName || 'Client'}'s ${phaseName} Plan`,
        description: `${categoryLabel} \u2014 ${goal}`,
        nasmPhase: phaseNumber,
        status: 'draft',
        planData: buildPlanData(),
      });
      setStatusMsg({ type: 'success', text: 'Plan saved as draft.' });
      setSavedSnapshot(currentExercisesSig);
      const data = res.data as SaveActionResponseData | undefined;
      const newId = data?.plan?.id ? String(data.plan.id) : null;
      if (newId) {
        setLoadedPlanId(newId);
        setLoadedPlanName(data?.plan?.title ? String(data.plan.title) : null);
      }
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Save draft failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to save plan. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, buildPlanData, categoryLabel, clients, currentExercisesSig, fetchSavedPlans, goal, hasSaveablePlan, phaseName, phaseNumber, selectedClientId, setLoadedPlanId, setLoadedPlanName, setSavedSnapshot, setStatusMsg]);

  const handleSaveAndActivate = useCallback(async () => {
    if (!hasSaveablePlan || !selectedClientId) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const res = await authAxios.post('/api/workout-plans', {
        userId: selectedClientId,
        title: `${client?.firstName || 'Client'}'s ${phaseName} Plan`,
        description: `${categoryLabel} \u2014 ${goal}`,
        nasmPhase: phaseNumber,
        status: 'draft',
        planData: buildPlanData(),
      });
      const data = res.data as SaveActionResponseData | undefined;
      const newId = data?.plan?.id;
      if (!newId) throw new Error('Backend returned no plan id');
      await authAxios.put(`/api/workout-plans/${newId}/activate`);
      setStatusMsg({ type: 'success', text: 'Plan saved and made current.' });
      setSavedSnapshot(currentExercisesSig);
      setLoadedPlanId(String(newId));
      setLoadedPlanName(data?.plan?.title ? String(data.plan.title) : null);
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Save & activate failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to save & activate plan.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, buildPlanData, categoryLabel, clients, currentExercisesSig, fetchSavedPlans, goal, hasSaveablePlan, phaseName, phaseNumber, selectedClientId, setLoadedPlanId, setLoadedPlanName, setSavedSnapshot, setStatusMsg]);

  const handleUpdateLoaded = useCallback(async () => {
    if (!hasSaveablePlan || !selectedClientId || !loadedPlanId) return;
    setSaving(true);
    try {
      await authAxios.put(`/api/workout-plans/${loadedPlanId}`, {
        nasmPhase: phaseNumber,
        planData: buildPlanData(),
      });
      setStatusMsg({ type: 'success', text: 'Plan updated.' });
      setSavedSnapshot(currentExercisesSig);
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Update plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to update plan.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, buildPlanData, currentExercisesSig, fetchSavedPlans, hasSaveablePlan, loadedPlanId, phaseNumber, selectedClientId, setSavedSnapshot, setStatusMsg]);

  const handleUpdateAndActivate = useCallback(async () => {
    if (!hasSaveablePlan || !selectedClientId || !loadedPlanId) return;
    setSaving(true);
    try {
      await authAxios.put(`/api/workout-plans/${loadedPlanId}`, {
        nasmPhase: phaseNumber,
        planData: buildPlanData(),
      });
      await authAxios.put(`/api/workout-plans/${loadedPlanId}/activate`);
      setStatusMsg({ type: 'success', text: 'Plan updated and made current.' });
      setSavedSnapshot(currentExercisesSig);
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Update & activate failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to update & activate plan.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, buildPlanData, currentExercisesSig, fetchSavedPlans, hasSaveablePlan, loadedPlanId, phaseNumber, selectedClientId, setSavedSnapshot, setStatusMsg]);

  return {
    saving,
    handleSaveDraft,
    handleSaveAndActivate,
    handleUpdateLoaded,
    handleUpdateAndActivate,
  };
};
