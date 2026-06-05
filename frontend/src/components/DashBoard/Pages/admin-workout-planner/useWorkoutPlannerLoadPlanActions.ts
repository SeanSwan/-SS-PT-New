/**
 * Hook: useWorkoutPlannerLoadPlanActions
 * Purpose: Own saved-plan hydration so WorkoutPlannerPage stays focused on
 * route, layout, and user-flow orchestration.
 */

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { resolveWorkoutPlannerPlanClientId } from './WorkoutPlannerClientIdentity';
import type {
  GeneratedPlan,
  PlanExercise,
  PlanGoal,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

interface PlannerAuthClient {
  get: (url: string) => Promise<{ data?: unknown }>;
}

interface SavedWorkoutPlan {
  userId?: unknown;
  nasmPhase?: number;
  planData?: Record<string, unknown>;
}

interface SavedWorkoutPlanResponse {
  plan?: SavedWorkoutPlan;
}

interface ManualSnapshotInput {
  phaseName: string;
  phaseNumber: number;
  category: WorkoutCategory;
  goal: PlanGoal;
  planExercises: PlanExercise[];
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
  setSavedSnapshot: Dispatch<SetStateAction<string | null>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}

const hydratePlanExercises = (planId: string, exercises: unknown[]): PlanExercise[] =>
  exercises.map((rawExercise, index) => {
    const exercise = rawExercise as Record<string, unknown>;
    return {
      id: `loaded-${planId}-${index}-${Date.now()}`,
      exerciseSlim: {
        id: String(exercise.exerciseId || ''),
        name: String(exercise.exerciseName || exercise.name || 'Unknown'),
        exerciseKey: String(exercise.exerciseId || ''),
        exerciseType: 'compound',
        bodyPartCategory: 'Full Body',
        primaryMuscles: [],
        difficulty: 300,
      },
      sets: Number(exercise.sets) || 3,
      reps: String(exercise.reps || exercise.repGoal || '8-12'),
      tempo: String(exercise.tempo || ''),
      restSeconds: typeof exercise.restPeriod === 'number' ? exercise.restPeriod : 60,
      intensityPercent: 70,
      notes: String(exercise.notes || ''),
    };
  });

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
  setSavedSnapshot,
  setStatusMsg,
}: UseWorkoutPlannerLoadPlanActionsInput) => {
  const loadPlanIntoBuilder = useCallback(async (planId: string, planName: string) => {
    try {
      const res = await authAxios.get(`/api/workout-plans/${planId}`);
      const data = res.data as SavedWorkoutPlanResponse | undefined;
      const plan = data?.plan;
      if (!plan) {
        setStatusMsg({ type: 'error', text: 'Plan not found or not authorized.' });
        return;
      }

      const planData = plan.planData || {};
      const weeks = Array.isArray(planData.weeks)
        ? (planData.weeks as NonNullable<GeneratedPlan['weeks']>)
        : [];
      const firstWeek = weeks[0];
      const firstDay = firstWeek?.days?.[0] || firstWeek?.sessions?.[0];
      const exercises = Array.isArray(firstDay?.exercises) ? firstDay.exercises : [];
      const hydrated = hydratePlanExercises(planId, exercises);

      const wasGenerated =
        weeks.length > 0
        && (
          planData.planSummary
          || (Array.isArray(planData.mesocycles) && planData.mesocycles.length > 0)
        );
      const restoredPlanClientId = wasGenerated
        ? resolveWorkoutPlannerPlanClientId(plan.userId, selectedClientId)
        : null;

      if (wasGenerated && restoredPlanClientId === null) {
        setGeneratedPlan(null);
        setStatusMsg({
          type: 'error',
          text: 'Unable to load generated plan because it is missing a valid client id.',
        });
        return;
      }

      if (plan.nasmPhase) setPhaseNumber(plan.nasmPhase);
      if (planData.goal) setGoal(planData.goal as PlanGoal);
      if (planData.category) setCategory(planData.category as WorkoutCategory);
      setLoadedPlanId(String(planId));
      setLoadedPlanName(planName);

      if (wasGenerated) {
        setPlanExercises([]);
        const restored: GeneratedPlan = {
          clientId: restoredPlanClientId!,
          clientName: String(planData.clientName || ''),
          planSummary: (planData.planSummary as GeneratedPlan['planSummary']) || {
            durationWeeks: weeks.length,
            sessionsPerWeek: firstWeek?.days?.length || firstWeek?.sessions?.length || 0,
            totalSessions: 0,
            primaryGoal: String(planData.goal || 'general_fitness'),
            startingPhase: plan.nasmPhase || 2,
          },
          mesocycles: (planData.mesocycles as GeneratedPlan['mesocycles']) || [],
          weeklySchedule: (planData.weeklySchedule as GeneratedPlan['weeklySchedule']) || [],
          recommendations: (planData.recommendations as string[]) || [],
          recommendationDetails: planData.recommendationDetails as GeneratedPlan['recommendationDetails'],
          equipmentContext: planData.equipmentContext as GeneratedPlan['equipmentContext'],
          rationale: planData.rationale as string[] | undefined,
          weeks,
        };
        setGeneratedPlan(restored);
        setSavedSnapshot(buildGeneratedSnapshot(
          restored,
          (planData.category as WorkoutCategory) || category,
          (planData.goal as PlanGoal) || goal,
        ));
      } else {
        setPlanExercises(hydrated);
        setGeneratedPlan(null);
        setSavedSnapshot(buildManualSnapshot({
          phaseName,
          phaseNumber: plan.nasmPhase || phaseNumber,
          category: (planData.category as WorkoutCategory) || category,
          goal: (planData.goal as PlanGoal) || goal,
          planExercises: hydrated,
        }));
      }
      setStatusMsg({ type: 'success', text: `Loaded plan: ${planName}` });
    } catch (err: unknown) {
      const errData = (err as { response?: { status?: number } })?.response;
      if (errData?.status === 404) {
        setStatusMsg({ type: 'error', text: 'Plan not found or not authorized.' });
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to load plan. Please try again.' });
      }
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
    setPhaseNumber,
    setPlanExercises,
    setSavedSnapshot,
    setStatusMsg,
  ]);

  return {
    loadPlanIntoBuilder,
  };
};
