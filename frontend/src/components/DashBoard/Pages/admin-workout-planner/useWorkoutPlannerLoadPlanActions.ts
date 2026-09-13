/**
 * Hook: useWorkoutPlannerLoadPlanActions
 * Purpose: Own saved-plan hydration so WorkoutPlannerPage stays focused on
 * route, layout, and user-flow orchestration.
 */

import { useCallback } from 'react';
import { usePlannerAsyncScope } from './usePlannerAsyncScope';
import type { Dispatch, SetStateAction } from 'react';
import {
  buildLoadedGeneratedPlan,
  buildLoadedManualSnapshotInput,
  buildLoadedPlanHydration,
  loadedPlanCategory,
  loadedPlanGoal,
  readSavedWorkoutPlan,
} from './workoutPlannerLoadPlanHydration';
import type {
  GeneratedPlan,
  PlanExercise,
  PlanGoal,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
import type {
  LoadedPlanHydration,
  ManualSnapshotInput,
  SavedWorkoutPlan,
} from './workoutPlannerLoadPlanHydration';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

interface PlannerAuthClient {
  get: (url: string) => Promise<{ data?: unknown }>;
}

interface UseWorkoutPlannerLoadPlanActionsInput {
  authAxios: PlannerAuthClient;
  selectedClientId: number | null;
  phaseName: string;
  phaseNumber: number;
  category: WorkoutCategory;
  goal: PlanGoal;
  buildGeneratedSnapshot: (
    restored: GeneratedPlan,
    snapshotCategory: WorkoutCategory,
    snapshotGoal: PlanGoal,
  ) => string;
  buildManualSnapshot: (input: ManualSnapshotInput) => string;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  setPhaseNumber: Dispatch<SetStateAction<number>>;
  setGoal: Dispatch<SetStateAction<PlanGoal>>;
  setCategory: Dispatch<SetStateAction<WorkoutCategory>>;
  setLoadedPlanId: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanName: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanRevision: Dispatch<SetStateAction<number>>;
  setSavedSnapshot: Dispatch<SetStateAction<string | null>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}

interface LoadedPlanApplyInput extends Omit<UseWorkoutPlannerLoadPlanActionsInput, 'authAxios' | 'selectedClientId'> {
  plan: SavedWorkoutPlan;
  hydration: LoadedPlanHydration;
  planId: string;
  planName: string;
}

const planLoadErrorMessage = (err: unknown): WorkoutPlannerStatusMessage => {
  const errData = (err as { response?: { status?: number } })?.response;
  return errData?.status === 404
    ? { type: 'error', text: 'Plan not found or not authorized.' }
    : { type: 'error', text: 'Failed to load plan. Please try again.' };
};

const applyLoadedPlanMetadata = ({
  category,
  goal,
  hydration,
  plan,
  planId,
  planName,
  setCategory,
  setGoal,
  setLoadedPlanId,
  setLoadedPlanName,
  setLoadedPlanRevision,
  setPhaseNumber,
}: LoadedPlanApplyInput) => {
  if (plan.nasmPhase) setPhaseNumber(plan.nasmPhase);
  if (hydration.planData.goal) setGoal(loadedPlanGoal(hydration.planData, goal));
  if (hydration.planData.category) setCategory(loadedPlanCategory(hydration.planData, category));
  setLoadedPlanId(String(planId));
  setLoadedPlanName(planName);
  const revision = Number(plan.contentRevision);
  setLoadedPlanRevision(Number.isSafeInteger(revision) && revision > 0 ? revision : 1);
};

const applyGeneratedPlanLoad = ({
  buildGeneratedSnapshot,
  category,
  goal,
  hydration,
  plan,
  setGeneratedPlan,
  setPlanExercises,
  setSavedSnapshot,
  clientId,
}: LoadedPlanApplyInput & { clientId: number }) => {
  const restored = buildLoadedGeneratedPlan(plan, hydration, clientId);
  setPlanExercises([]);
  setGeneratedPlan(restored);
  setSavedSnapshot(buildGeneratedSnapshot(
    restored,
    loadedPlanCategory(hydration.planData, category),
    loadedPlanGoal(hydration.planData, goal),
  ));
};

const applyManualPlanLoad = ({
  buildManualSnapshot,
  category,
  goal,
  hydration,
  phaseName,
  phaseNumber,
  plan,
  setGeneratedPlan,
  setPlanExercises,
  setSavedSnapshot,
}: LoadedPlanApplyInput) => {
  setPlanExercises(hydration.hydratedExercises);
  setGeneratedPlan(null);
  setSavedSnapshot(buildManualSnapshot(buildLoadedManualSnapshotInput({
    phaseName,
    fallbackPhaseNumber: phaseNumber,
    fallbackCategory: category,
    fallbackGoal: goal,
    plan,
    hydration,
  })));
};

const cannotRestoreGeneratedPlan = (hydration: LoadedPlanHydration): boolean => (
  hydration.wasGenerated && hydration.restoredPlanClientId === null
);

const generatedPlanClientId = (hydration: LoadedPlanHydration): number | null => (
  hydration.wasGenerated ? hydration.restoredPlanClientId : null
);

const applyLoadedPlanToBuilder = (input: LoadedPlanApplyInput) => {
  const { hydration, setGeneratedPlan, setStatusMsg } = input;

  if (cannotRestoreGeneratedPlan(hydration)) {
    setGeneratedPlan(null);
    setStatusMsg({
      type: 'error',
      text: 'Unable to load generated plan because it is missing a valid client id.',
    });
    return;
  }

  applyLoadedPlanMetadata(input);

  const clientId = generatedPlanClientId(hydration);
  if (clientId !== null) {
    applyGeneratedPlanLoad({ ...input, clientId });
  } else {
    applyManualPlanLoad(input);
  }

  setStatusMsg({ type: 'success', text: `Loaded plan: ${input.planName}` });
};

export const useWorkoutPlannerLoadPlanActions = ({
  authAxios,
  selectedClientId,
  phaseName,
  phaseNumber,
  category,
  goal,
  buildGeneratedSnapshot,
  buildManualSnapshot,
  setPlanExercises,
  setGeneratedPlan,
  setPhaseNumber,
  setGoal,
  setCategory,
  setLoadedPlanId,
  setLoadedPlanName,
  setLoadedPlanRevision,
  setSavedSnapshot,
  setStatusMsg,
}: UseWorkoutPlannerLoadPlanActionsInput) => {
  const scope = usePlannerAsyncScope(selectedClientId);
  const loadPlanIntoBuilder = useCallback(async (planId: string, planName: string) => {
    const epoch = scope.current.epoch, request = ++scope.current.request;
    const isCurrent = () => scope.current.epoch === epoch && scope.current.request === request;
    try {
      const res = await authAxios.get(`/api/workout-plans/${planId}`);
      if (!isCurrent()) return;
      const plan = readSavedWorkoutPlan(res.data);
      if (!plan) {
        setStatusMsg({ type: 'error', text: 'Plan not found or not authorized.' });
        return;
      }

      if (plan.userId != null && Number(plan.userId) !== selectedClientId) {
        setStatusMsg({ type: 'error', text: 'This plan belongs to another client. Select that client before loading it.' });
        return;
      }

      const hydration = buildLoadedPlanHydration({ plan, planId, selectedClientId });
      applyLoadedPlanToBuilder({
        phaseName,
        phaseNumber,
        category,
        goal,
        buildGeneratedSnapshot,
        buildManualSnapshot,
        setPlanExercises,
        setGeneratedPlan,
        setPhaseNumber,
        setGoal,
        setCategory,
        setLoadedPlanId,
        setLoadedPlanName,
        setLoadedPlanRevision,
        setSavedSnapshot,
        setStatusMsg,
        plan,
        hydration,
        planId,
        planName,
      });
    } catch (err: unknown) {
      if (isCurrent()) setStatusMsg(planLoadErrorMessage(err));
    }
  }, [
    authAxios,
    buildGeneratedSnapshot,
    buildManualSnapshot,
    category,
    goal,
    phaseName,
    phaseNumber,
    selectedClientId,
    setCategory,
    setGeneratedPlan,
    setGoal,
    setLoadedPlanId,
    setLoadedPlanName,
    setLoadedPlanRevision,
    setPhaseNumber,
    setPlanExercises,
    setSavedSnapshot,
    setStatusMsg,
  ]);

  return {
    loadPlanIntoBuilder,
  };
};
