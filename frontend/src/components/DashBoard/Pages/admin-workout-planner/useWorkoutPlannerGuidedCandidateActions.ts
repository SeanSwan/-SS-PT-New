import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { logApiError } from '../../../../utils/logApiError';
import type {
  GeneratedPlan,
  HardcoreTrainingMethod,
  PlanExercise,
  PlanGoal,
  TrainingIntensityMode,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
import type {
  SwanCoachGenerationMode,
  WorkoutGuidedCandidateExercise,
  WorkoutGuidedCandidatesResponse,
} from './WorkoutPlannerGuidedCandidateTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';
import { workoutGenerationErrorMessage } from './workoutPlannerGenerationActions.helpers';
import type { PlannerGenerateOverrides } from './workoutPlannerGenerateIntent';
import {
  buildWorkoutCandidateRequest,
  mapGuidedCandidateToPlanExercise,
  readGuidedCandidates,
} from './workoutPlannerGuidedCandidates.helpers';

interface PlannerAuthClient {
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
}

interface GuidedCandidateActionsInput {
  authAxios: PlannerAuthClient;
  category: WorkoutCategory;
  goal: PlanGoal;
  phaseNumber: number;
  selectedEquipmentProfileId: number | null;
  trainingIntensityMode: TrainingIntensityMode;
  hardcoreMethod: HardcoreTrainingMethod;
  generationMode: SwanCoachGenerationMode;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
  resetLoadedPlanState: () => void;
}

export const useWorkoutPlannerGuidedCandidateActions = ({
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
}: GuidedCandidateActionsInput) => {
  const [guidedCandidates, setGuidedCandidates] = useState<WorkoutGuidedCandidatesResponse | null>(null);
  const [generatingCandidates, setGeneratingCandidates] = useState(false);

  const clearGuidedCandidates = useCallback(() => setGuidedCandidates(null), []);

  const handleGuidedCandidateGenerate = useCallback(async (
    selectedClientId: number | null,
    overrides?: PlannerGenerateOverrides,
  ) => {
    if (!selectedClientId) return;
    setGeneratingCandidates(true);
    setStatusMsg(null);
    setGuidedCandidates(null);
    try {
      const res = await authAxios.post('/api/workout-builder/candidates', buildWorkoutCandidateRequest({
        selectedClientId,
        // Spoken overrides win over dropdown state for the immediate call (H4).
        category: overrides?.category ?? category,
        goal: overrides?.goal ?? goal,
        phaseNumber: overrides?.phaseNumber ?? phaseNumber,
        selectedEquipmentProfileId,
        trainingIntensityMode,
        hardcoreMethod,
        generationMode,
      }));
      const candidates = readGuidedCandidates(res.data);
      if (!candidates) {
        setStatusMsg({ type: 'error', text: 'Swan Coach did not return guided exercise options. Try Auto generation.' });
        return;
      }
      setGuidedCandidates(candidates);
      setGeneratedPlan(null);
      resetLoadedPlanState();
      setStatusMsg({ type: 'success', text: 'Swan Coach returned guided exercise options.' });
    } catch (err: unknown) {
      logApiError('Swan Coach candidate generation failed', err);
      setStatusMsg(workoutGenerationErrorMessage(err));
    } finally {
      setGeneratingCandidates(false);
    }
  }, [authAxios, category, generationMode, goal, hardcoreMethod, phaseNumber, resetLoadedPlanState, selectedEquipmentProfileId, setGeneratedPlan, setStatusMsg, trainingIntensityMode]);

  const handleSelectGuidedCandidate = useCallback((candidate: WorkoutGuidedCandidateExercise) => {
    setPlanExercises(items => [...items, mapGuidedCandidateToPlanExercise(candidate)]);
    setGeneratedPlan(null);
    resetLoadedPlanState();
    setStatusMsg({ type: 'success', text: `${candidate.exerciseName} added to this workout.` });
  }, [resetLoadedPlanState, setGeneratedPlan, setPlanExercises, setStatusMsg]);

  return {
    guidedCandidates,
    generatingCandidates,
    clearGuidedCandidates,
    handleGuidedCandidateGenerate,
    handleSelectGuidedCandidate,
  };
};