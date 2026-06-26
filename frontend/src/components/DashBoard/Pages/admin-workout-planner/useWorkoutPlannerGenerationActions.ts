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
import type { SwanCoachGenerationMode } from './WorkoutPlannerGuidedCandidateTypes';
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
import { isGuidedGenerationMode } from './workoutPlannerGuidedCandidates.helpers';
import { useWorkoutPlannerGuidedCandidateActions } from './useWorkoutPlannerGuidedCandidateActions';
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
  generationMode: SwanCoachGenerationMode;
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
  generationMode,
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
  const {
    guidedCandidates,
    generatingCandidates,
    clearGuidedCandidates,
    handleGuidedCandidateGenerate,
    handleSelectGuidedCandidate,
  } = useWorkoutPlannerGuidedCandidateActions({
    authAxios,
    category,
    goal,
    phaseNumber,
    selectedEquipmentProfileId,
    trainingIntensityMode,
    hardcoreMethod,
    generationMode,
    setPlanExercises,
    setGeneratedPlan,
    setStatusMsg,
    resetLoadedPlanState,
  });

  const clearExplanations = useCallback(() => setExplanations([]), []);
  const handleToggleExplanations = useCallback(() => setShowExplanations(value => !value), []);

  const handleSwanCoachWorkoutGenerate = useCallback(async (selectedClientId: number | null) => {
    if (isGuidedGenerationMode(generationMode)) {
      setGenerating(true);
      await handleGuidedCandidateGenerate(selectedClientId);
      setGenerating(false);
      return;
    }
    if (!selectedClientId) return;
    setGenerating(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setExplanations([]);
    setShowExplanations(false);
    clearGuidedCandidates();
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
  }, [authAxios, category, clearGuidedCandidates, generationMode, goal, handleGuidedCandidateGenerate, hardcoreMethod, phaseNumber, resetLoadedPlanState, selectedEquipmentProfileId, setPhaseNumber, setPlanExercises, setStatusMsg, trainingIntensityMode]);

  const handleGeneratePlan = useCallback(async (selectedClientId: number | null) => {
    if (!canGenerateHorizonPlan(selectedClientId, planDuration)) return;
    setGeneratingPlan(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setGeneratedPlan(null);
    setPlanExercises([]);
    clearGuidedCandidates();
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
      const plan = verifiedGeneratedPlan(res.data, setStatusMsg);
      if (plan) applyGeneratedPlan({ plan, setDegradedIntelligence, setGeneratedPlan, setStatusMsg });
    } catch (err: unknown) {
      logApiError('Plan generation failed', err);
      setStatusMsg(planGenerationErrorMessage(err));
    } finally {
      setGeneratingPlan(false);
    }
  }, [authAxios, clearGuidedCandidates, goal, hardcoreMethod, phaseNumber, planDuration, resetLoadedPlanState, selectedEquipmentProfileId, sessionsPerWeek, setGeneratedPlan, setPlanExercises, setStatusMsg, trainingIntensityMode]);

  return {
    generating,
    generatingPlan,
    generatingCandidates,
    guidedCandidates,
    degradedIntelligence,
    explanations,
    showExplanations,
    clearExplanations,
    clearGuidedCandidates,
    handleSwanCoachWorkoutGenerate,
    handleGeneratePlan,
    handleSelectGuidedCandidate,
    handleToggleExplanations,
  };
};
