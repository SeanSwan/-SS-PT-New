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
