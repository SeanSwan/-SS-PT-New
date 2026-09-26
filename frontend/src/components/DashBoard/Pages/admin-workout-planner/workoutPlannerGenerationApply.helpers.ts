/**
 * Helpers: workoutPlannerGenerationApply
 * Purpose: Pure verification + application helpers for Swan Coach generation
 * results, extracted from useWorkoutPlannerGenerationActions (rule 4) when the
 * Cortex safety-gate review flow landed (directive §5.3).
 */
import type { Dispatch, SetStateAction } from 'react';
import type { WorkoutPlannerBuilderExplanation } from './WorkoutPlannerBuilderPanel';
import type { GeneratedPlan, PlanDuration, PlanExercise } from './WorkoutPlannerTypes';
import {
  generatedWorkoutSafetyWarning,
  getGeneratedPlanSafetyWarning,
  isSwanCoachPlanningPayload,
  mapGeneratedWorkoutToPlanExercises,
  readGeneratedPlan,
  readGeneratedWorkout,
  unverifiedPlanMessage,
  unverifiedWorkoutMessage,
} from './workoutPlannerGenerationActions.helpers';
import type { GeneratedWorkoutPayload } from './workoutPlannerGenerationActions.helpers';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

type StatusSetter = Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;

export interface WorkoutApplicationInput {
  workout: GeneratedWorkoutPayload;
  setDegradedIntelligence: Dispatch<SetStateAction<boolean>>;
  setExplanations: Dispatch<SetStateAction<WorkoutPlannerBuilderExplanation[]>>;
  setPhaseNumber: Dispatch<SetStateAction<number>>;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setShowExplanations: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: StatusSetter;
  resetLoadedPlanState: () => void;
}

export const canGenerateHorizonPlan = (
  selectedClientId: number | null,
  planDuration: PlanDuration,
): selectedClientId is number => Boolean(selectedClientId) && planDuration !== 'single';

export const verifiedGeneratedWorkout = (
  data: unknown,
  setStatusMsg: StatusSetter,
): GeneratedWorkoutPayload | null => {
  const workout = readGeneratedWorkout(data);
  if (!workout) return null;
  if (isSwanCoachPlanningPayload(workout)) return workout;
  setStatusMsg(unverifiedWorkoutMessage());
  return null;
};

export const verifiedGeneratedPlan = (
  data: unknown,
  setStatusMsg: StatusSetter,
): GeneratedPlan | null => {
  const plan = readGeneratedPlan(data);
  if (!plan) return null;
  if (isSwanCoachPlanningPayload(plan)) return plan;
  setStatusMsg(unverifiedPlanMessage());
  return null;
};

export const applyGeneratedWorkout = ({
  workout,
  setDegradedIntelligence,
  setExplanations,
  setPhaseNumber,
  setPlanExercises,
  setShowExplanations,
  setStatusMsg,
  resetLoadedPlanState,
}: WorkoutApplicationInput) => {
  const isDegraded = workout.context?.criticalDataUnavailable === true;
  setDegradedIntelligence(isDegraded);
  if (isDegraded) setStatusMsg({ type: 'error', text: generatedWorkoutSafetyWarning(workout) });
  if (workout.nasmPhase) setPhaseNumber(workout.nasmPhase);
  setPlanExercises(mapGeneratedWorkoutToPlanExercises(workout));
  resetLoadedPlanState();
  const explanations = workout.explanations ?? [];
  if (explanations.length > 0) {
    setExplanations(explanations);
    setShowExplanations(true);
  }
};

export interface PlanApplication {
  degraded: boolean;
  status: WorkoutPlannerStatusMessage;
}

/**
 * Pure plan-application derivation: the degraded flag and the status message a
 * freshly generated plan should produce. It returns a descriptor rather than
 * taking setters, so the caller applies state itself and this stays exercisable
 * without React. Lifted out of useWorkoutPlannerGenerationActions under rule 4.
 */
export const buildPlanApplication = (plan: GeneratedPlan): PlanApplication => {
  const safetyWarning = getGeneratedPlanSafetyWarning(plan);
  return {
    degraded: Boolean(safetyWarning),
    status: safetyWarning
      ? { type: 'error', text: safetyWarning }
      : { type: 'success', text: `${plan.planSummary.durationWeeks}-week periodized plan generated successfully!` },
  };
};
