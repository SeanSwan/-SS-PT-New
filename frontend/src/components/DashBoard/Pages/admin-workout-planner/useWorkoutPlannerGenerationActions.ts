/**
 * Hook: useWorkoutPlannerGenerationActions
 * Purpose: Own Swan Coach generation actions and generated-output UI state
 * for the admin/trainer Workout Planner.
 */

import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { logApiError } from '../../../../utils/logApiError';
import type { WorkoutPlannerBuilderExplanation } from './WorkoutPlannerBuilderPanel';
import type {
  GeneratedPlan,
  HardcoreTrainingMethod,
  PlanDuration,
  PlanExercise,
  PlanGoal,
  TrainingIntensityMode,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
import {
  buildPlanGenerationRequest,
  buildWorkoutGenerationRequest,
  generatedWorkoutSafetyWarning,
  getGeneratedPlanSafetyWarning,
  isSwanCoachPlanningPayload,
  mapGeneratedWorkoutToPlanExercises,
  planGenerationErrorMessage,
  readGeneratedPlan,
  readGeneratedWorkout,
  unverifiedPlanMessage,
  unverifiedWorkoutMessage,
  workoutGenerationErrorMessage,
} from './workoutPlannerGenerationActions.helpers';
import type { GeneratedWorkoutPayload } from './workoutPlannerGenerationActions.helpers';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

interface PlannerAuthClient {
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
}

interface WorkoutPlannerGenerationActionsInput {
  authAxios: PlannerAuthClient;
  category: WorkoutCategory;
  goal: PlanGoal;
  phaseNumber: number;
  planDuration: PlanDuration;
  sessionsPerWeek: number;
  selectedEquipmentProfileId: number | null;
  trainingIntensityMode: TrainingIntensityMode;
  hardcoreMethod: HardcoreTrainingMethod;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  setPhaseNumber: Dispatch<SetStateAction<number>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
  resetLoadedPlanState: () => void;
}

interface WorkoutApplicationInput {
  workout: GeneratedWorkoutPayload;
  setDegradedIntelligence: Dispatch<SetStateAction<boolean>>;
  setExplanations: Dispatch<SetStateAction<WorkoutPlannerBuilderExplanation[]>>;
  setPhaseNumber: Dispatch<SetStateAction<number>>;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setShowExplanations: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
  resetLoadedPlanState: () => void;
}

interface PlanApplicationInput {
  plan: GeneratedPlan;
  setDegradedIntelligence: Dispatch<SetStateAction<boolean>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}

interface VerifiedPlanApplicationInput {
  data: unknown;
  setDegradedIntelligence: Dispatch<SetStateAction<boolean>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}

const canGenerateHorizonPlan = (
  selectedClientId: number | null,
  planDuration: PlanDuration,
): selectedClientId is number => Boolean(selectedClientId) && planDuration !== 'single';

const verifiedGeneratedWorkout = (
  data: unknown,
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>,
): GeneratedWorkoutPayload | null => {
  const workout = readGeneratedWorkout(data);
  if (!workout) return null;
  if (isSwanCoachPlanningPayload(workout)) return workout;
  setStatusMsg(unverifiedWorkoutMessage());
  return null;
};

const verifiedGeneratedPlan = (
  data: unknown,
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>,
): GeneratedPlan | null => {
  const plan = readGeneratedPlan(data);
  if (!plan) return null;
  if (isSwanCoachPlanningPayload(plan)) return plan;
  setStatusMsg(unverifiedPlanMessage());
  return null;
};

const applyGeneratedWorkoutDegradedState = (
  workout: GeneratedWorkoutPayload,
  setDegradedIntelligence: Dispatch<SetStateAction<boolean>>,
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>,
) => {
  const isDegraded = workout.context?.criticalDataUnavailable === true;
  setDegradedIntelligence(isDegraded);
  if (!isDegraded) return;
  setStatusMsg({ type: 'error', text: generatedWorkoutSafetyWarning(workout) });
};

const applyGeneratedWorkoutPhase = (
  workout: GeneratedWorkoutPayload,
  setPhaseNumber: Dispatch<SetStateAction<number>>,
) => {
  if (!workout.nasmPhase) return;
  setPhaseNumber(workout.nasmPhase);
};

const applyGeneratedWorkoutExplanations = (
  workout: GeneratedWorkoutPayload,
  setExplanations: Dispatch<SetStateAction<WorkoutPlannerBuilderExplanation[]>>,
  setShowExplanations: Dispatch<SetStateAction<boolean>>,
) => {
  const explanations = workout.explanations ?? [];
  if (explanations.length === 0) return;
  setExplanations(explanations);
  setShowExplanations(true);
};

const applyGeneratedWorkout = ({
  workout,
  setDegradedIntelligence,
  setExplanations,
  setPhaseNumber,
  setPlanExercises,
  setShowExplanations,
  setStatusMsg,
  resetLoadedPlanState,
}: WorkoutApplicationInput) => {
  applyGeneratedWorkoutDegradedState(workout, setDegradedIntelligence, setStatusMsg);
  applyGeneratedWorkoutPhase(workout, setPhaseNumber);
  setPlanExercises(mapGeneratedWorkoutToPlanExercises(workout));
  resetLoadedPlanState();
  applyGeneratedWorkoutExplanations(workout, setExplanations, setShowExplanations);
};

const applyGeneratedPlan = ({
  plan,
  setDegradedIntelligence,
  setGeneratedPlan,
  setStatusMsg,
}: PlanApplicationInput) => {
  const safetyWarning = getGeneratedPlanSafetyWarning(plan);
  setDegradedIntelligence(Boolean(safetyWarning));
  setGeneratedPlan(plan);
  setStatusMsg(safetyWarning
    ? { type: 'error', text: safetyWarning }
    : { type: 'success', text: `${plan.planSummary.durationWeeks}-week periodized plan generated successfully!` });
};

const applyVerifiedGeneratedPlan = ({
  data,
  setDegradedIntelligence,
  setGeneratedPlan,
  setStatusMsg,
}: VerifiedPlanApplicationInput) => {
  const plan = verifiedGeneratedPlan(data, setStatusMsg);
  if (!plan) return;
  applyGeneratedPlan({ plan, setDegradedIntelligence, setGeneratedPlan, setStatusMsg });
};

export const useWorkoutPlannerGenerationActions = ({
  authAxios,
  category,
  goal,
  phaseNumber,
  planDuration,
  sessionsPerWeek,
  selectedEquipmentProfileId,
  trainingIntensityMode,
  hardcoreMethod,
  setPlanExercises,
  setGeneratedPlan,
  setPhaseNumber,
  setStatusMsg,
  resetLoadedPlanState,
}: WorkoutPlannerGenerationActionsInput) => {
  const [generating, setGenerating] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [degradedIntelligence, setDegradedIntelligence] = useState(false);
  const [explanations, setExplanations] = useState<WorkoutPlannerBuilderExplanation[]>([]);
  const [showExplanations, setShowExplanations] = useState(false);

  const clearExplanations = useCallback(() => {
    setExplanations([]);
  }, []);

  const handleToggleExplanations = useCallback(() => {
    setShowExplanations(value => !value);
  }, []);

  const handleSwanCoachWorkoutGenerate = useCallback(async (selectedClientId: number | null) => {
    if (!selectedClientId) return;
    setGenerating(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setExplanations([]);
    setShowExplanations(false);
    try {
      const res = await authAxios.post('/api/workout-builder/generate', buildWorkoutGenerationRequest({
        selectedClientId,
        category,
        goal,
        phaseNumber,
        selectedEquipmentProfileId,
        trainingIntensityMode,
        hardcoreMethod,
      }));
      const workout = verifiedGeneratedWorkout(res.data, setStatusMsg);
      if (workout) {
        applyGeneratedWorkout({
          workout,
          setDegradedIntelligence,
          setExplanations,
          setPhaseNumber,
          setPlanExercises,
          setShowExplanations,
          setStatusMsg,
          resetLoadedPlanState,
        });
      }
    } catch (err: unknown) {
      logApiError('Swan Coach workout generation failed', err);
      setStatusMsg(workoutGenerationErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }, [authAxios, category, goal, hardcoreMethod, phaseNumber, resetLoadedPlanState, selectedEquipmentProfileId, setPhaseNumber, setPlanExercises, setStatusMsg, trainingIntensityMode]);

  const handleGeneratePlan = useCallback(async (selectedClientId: number | null) => {
    if (!canGenerateHorizonPlan(selectedClientId, planDuration)) return;
    setGeneratingPlan(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setGeneratedPlan(null);
    setPlanExercises([]);
    resetLoadedPlanState();
    try {
      const res = await authAxios.post('/api/workout-builder/plan', buildPlanGenerationRequest({
        selectedClientId,
        goal,
        phaseNumber,
        planDuration,
        sessionsPerWeek,
        selectedEquipmentProfileId,
        trainingIntensityMode,
        hardcoreMethod,
      }));
      applyVerifiedGeneratedPlan({
        data: res.data,
        setDegradedIntelligence,
        setGeneratedPlan,
        setStatusMsg,
      });
    } catch (err: unknown) {
      logApiError('Plan generation failed', err);
      setStatusMsg(planGenerationErrorMessage(err));
    } finally {
      setGeneratingPlan(false);
    }
  }, [authAxios, goal, hardcoreMethod, phaseNumber, planDuration, resetLoadedPlanState, selectedEquipmentProfileId, sessionsPerWeek, setGeneratedPlan, setPlanExercises, setStatusMsg, trainingIntensityMode]);

  return {
    generating,
    generatingPlan,
    degradedIntelligence,
    explanations,
    showExplanations,
    clearExplanations,
    handleSwanCoachWorkoutGenerate,
    handleGeneratePlan,
    handleToggleExplanations,
  };
};
