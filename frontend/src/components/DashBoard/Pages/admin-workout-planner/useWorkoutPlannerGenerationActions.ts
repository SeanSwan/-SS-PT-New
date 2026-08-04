/**
 * Hook: useWorkoutPlannerGenerationActions
 * Purpose: Own Swan Coach generation actions and generated-output UI state
 * for the admin/trainer Workout Planner. Cortex P0 (§5.3): generation now
 * honors the deterministic safety gate's acknowledged-review contract —
 * 409 SWAN_COACH_REVIEW_REQUIRED opens the SafetyGateModal and the retry
 * carries planningReviewAcknowledged + the trainer's written reason.
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
  getGeneratedPlanSafetyWarning,
  planGenerationErrorMessage,
  workoutGenerationErrorMessage,
} from './workoutPlannerGenerationActions.helpers';
import {
  applyGeneratedWorkout,
  canGenerateHorizonPlan,
  verifiedGeneratedPlan,
  verifiedGeneratedWorkout,
} from './workoutPlannerGenerationApply.helpers';
import {
  parseSafetyGateReviewError,
  useWorkoutPlannerSafetyGate,
} from './useWorkoutPlannerSafetyGate';
import type { SafetyGateReviewState } from './useWorkoutPlannerSafetyGate';
import { isGuidedGenerationMode } from './workoutPlannerGuidedCandidates.helpers';
import { useWorkoutPlannerGuidedCandidateActions } from './useWorkoutPlannerGuidedCandidateActions';
import type { PlannerGenerateOverrides } from './workoutPlannerGenerateIntent';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';
import { endpointFor } from './plannerLogic/endpointFor';

interface PlannerAuthClient {
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
}

interface PlanningReviewAck {
  planningReviewAcknowledged: true;
  planningReviewReason: string;
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

interface PlanApplicationInput {
  plan: GeneratedPlan;
  setDegradedIntelligence: Dispatch<SetStateAction<boolean>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}

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

  /** Returns review details when the safety gate blocked, null otherwise. */
  const postWorkoutGeneration = useCallback(async (
    selectedClientId: number,
    ack?: PlanningReviewAck,
    overrides?: PlannerGenerateOverrides,
  ) => {
    setGenerating(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setExplanations([]);
    setShowExplanations(false);
    clearGuidedCandidates();
    try {
      const res = await authAxios.post(endpointFor('single'), {
        ...buildWorkoutGenerationRequest({
          selectedClientId,
          // Spoken overrides win over dropdown state for the immediate call (H4).
          category: overrides?.category ?? category,
          goal: overrides?.goal ?? goal,
          phaseNumber: overrides?.phaseNumber ?? phaseNumber,
          selectedEquipmentProfileId,
          trainingIntensityMode,
          hardcoreMethod,
        }),
        ...(ack ?? {}),
      });
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
      return null;
    } catch (err: unknown) {
      const review = parseSafetyGateReviewError(err);
      if (review) return review;
      logApiError('Swan Coach workout generation failed', err);
      setStatusMsg(workoutGenerationErrorMessage(err));
      return null;
    } finally {
      setGenerating(false);
    }
  }, [authAxios, category, clearGuidedCandidates, goal, hardcoreMethod, phaseNumber, resetLoadedPlanState, selectedEquipmentProfileId, setPhaseNumber, setPlanExercises, setStatusMsg, trainingIntensityMode]);

  /** Returns review details when the safety gate blocked, null otherwise. */
  const postPlanGeneration = useCallback(async (
    selectedClientId: number,
    ack?: PlanningReviewAck,
  ) => {
    setGeneratingPlan(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setGeneratedPlan(null);
    setPlanExercises([]);
    clearGuidedCandidates();
    resetLoadedPlanState();
    try {
      const res = await authAxios.post(endpointFor('multi_week'), {
        ...buildPlanGenerationRequest({
          selectedClientId,
          goal,
          phaseNumber,
          planDuration,
          sessionsPerWeek,
          selectedEquipmentProfileId,
          trainingIntensityMode,
          hardcoreMethod,
        }),
        ...(ack ?? {}),
      });
      const plan = verifiedGeneratedPlan(res.data, setStatusMsg);
      if (plan) applyGeneratedPlan({ plan, setDegradedIntelligence, setGeneratedPlan, setStatusMsg });
      return null;
    } catch (err: unknown) {
      const review = parseSafetyGateReviewError(err);
      if (review) return review;
      logApiError('Plan generation failed', err);
      setStatusMsg(planGenerationErrorMessage(err));
      return null;
    } finally {
      setGeneratingPlan(false);
    }
  }, [authAxios, clearGuidedCandidates, goal, hardcoreMethod, phaseNumber, planDuration, resetLoadedPlanState, selectedEquipmentProfileId, sessionsPerWeek, setGeneratedPlan, setPlanExercises, setStatusMsg, trainingIntensityMode]);

  const onAcknowledged = useCallback(async (
    review: SafetyGateReviewState,
    reason: string,
  ): Promise<SafetyGateReviewState | null> => {
    const ack: PlanningReviewAck = { planningReviewAcknowledged: true, planningReviewReason: reason };
    const reblocked = review.mode === 'workout'
      ? await postWorkoutGeneration(review.clientId, ack)
      : await postPlanGeneration(review.clientId, ack);
    if (!reblocked) return null;
    // The acknowledged retry was 409'd AGAIN (gate state changed between
    // attempts, or a second gate shares the contract). Never close silently —
    // surface it and hand the fresh review state back so the modal stays open.
    setStatusMsg({
      type: 'error',
      text: 'The safety review is still required — the gate held the acknowledged retry. Review the updated items and try again.',
    });
    return { mode: review.mode, clientId: review.clientId, ...reblocked };
  }, [postWorkoutGeneration, postPlanGeneration, setStatusMsg]);

  const {
    safetyGateReview,
    acknowledging,
    openSafetyGateReview,
    cancelSafetyGateReview,
    confirmSafetyGateReview,
  } = useWorkoutPlannerSafetyGate({ onAcknowledged });

  const handleSwanCoachWorkoutGenerate = useCallback(async (selectedClientId: number | null, overrides?: PlannerGenerateOverrides) => {
    if (isGuidedGenerationMode(generationMode)) {
      setGenerating(true);
      try {
        await handleGuidedCandidateGenerate(selectedClientId, overrides);
      } finally {
        setGenerating(false);
      }
      return;
    }
    if (!selectedClientId) return;
    const review = await postWorkoutGeneration(selectedClientId, undefined, overrides);
    if (review) openSafetyGateReview({ mode: 'workout', clientId: selectedClientId, ...review });
  }, [generationMode, handleGuidedCandidateGenerate, openSafetyGateReview, postWorkoutGeneration]);

  const handleGeneratePlan = useCallback(async (selectedClientId: number | null) => {
    if (!canGenerateHorizonPlan(selectedClientId, planDuration)) return;
    const review = await postPlanGeneration(selectedClientId);
    if (review) openSafetyGateReview({ mode: 'plan', clientId: selectedClientId, ...review });
  }, [openSafetyGateReview, planDuration, postPlanGeneration]);

  return {
    generating,
    generatingPlan,
    generatingCandidates,
    guidedCandidates,
    degradedIntelligence,
    explanations,
    showExplanations,
    safetyGateReview,
    acknowledgingSafetyGate: acknowledging,
    confirmSafetyGateReview,
    cancelSafetyGateReview,
    clearExplanations,
    clearGuidedCandidates,
    handleSwanCoachWorkoutGenerate,
    handleGeneratePlan,
    handleSelectGuidedCandidate,
    handleToggleExplanations,
  };
};
