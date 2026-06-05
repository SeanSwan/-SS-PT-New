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
  GeneratedWorkout,
  PlanDuration,
  PlanExercise,
  PlanGoal,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

interface PlannerAuthClient {
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
}

interface GeneratedWorkoutResponse {
  success?: boolean;
  workout?: GeneratedWorkout & {
    context?: {
      criticalDataUnavailable?: boolean;
    };
  };
}

interface GeneratedPlanResponse {
  success?: boolean;
  plan?: GeneratedPlan;
}

interface WorkoutPlannerGenerationActionsInput {
  authAxios: PlannerAuthClient;
  category: WorkoutCategory;
  goal: PlanGoal;
  phaseNumber: number;
  planDuration: PlanDuration;
  sessionsPerWeek: number;
  selectedEquipmentProfileId: number | null;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  setPhaseNumber: Dispatch<SetStateAction<number>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
  resetLoadedPlanState: () => void;
}

const parseRestSeconds = (rest: unknown) => {
  if (typeof rest === 'number') return rest;
  const restText = String(rest || '60').toLowerCase();
  if (restText.includes('min')) return (parseInt(restText, 10) || 3) * 60;
  return parseInt(restText.replace(/[^0-9]/g, ''), 10) || 60;
};

const getGeneratedPlanSafetyWarning = (plan: GeneratedPlan) => {
  const structuredWarning = plan.recommendationDetails?.find(
    detail => detail.type === 'safety_warning'
  );
  if (structuredWarning?.text) return structuredWarning.text;

  return plan.recommendations.find(recommendation => {
    const lower = recommendation.toLowerCase();
    return lower.includes('pain') && lower.includes('injury') && lower.includes('could not be loaded');
  });
};

export const useWorkoutPlannerGenerationActions = ({
  authAxios,
  category,
  goal,
  phaseNumber,
  planDuration,
  sessionsPerWeek,
  selectedEquipmentProfileId,
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

  const handleAIGenerate = useCallback(async (selectedClientId: number | null) => {
    if (!selectedClientId) return;
    setGenerating(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setExplanations([]);
    setShowExplanations(false);
    try {
      const res = await authAxios.post('/api/workout-builder/generate', {
        clientId: selectedClientId,
        category,
        exerciseCount: 6,
        rotationPattern: 'standard',
        primaryGoal: goal,
        nasmPhase: phaseNumber,
        ...(selectedEquipmentProfileId ? { equipmentProfileId: selectedEquipmentProfileId } : {}),
      });
      const data = res.data as GeneratedWorkoutResponse | undefined;
      if (data?.success && data.workout) {
        const workout = data.workout;
        const isDegraded = workout.context?.criticalDataUnavailable === true;
        setDegradedIntelligence(isDegraded);
        if (isDegraded) {
          const safetyWarning = workout.explanations?.find(
            (explanation) => explanation.type === 'safety_warning'
          );
          setStatusMsg({
            type: 'error',
            text: safetyWarning?.message || 'Pain/injury data unavailable - review this workout carefully before assigning.',
          });
        }

        if (workout.nasmPhase) setPhaseNumber(workout.nasmPhase);
        const generated: PlanExercise[] = workout.exercises.map((exercise, index) => ({
          id: `gen-${index}-${Date.now()}`,
          exerciseSlim: {
            id: exercise.exerciseKey,
            name: exercise.exerciseName,
            exerciseKey: exercise.exerciseKey,
            exerciseType: exercise.category || 'compound',
            bodyPartCategory: exercise.muscles?.[0] || 'Full Body',
            primaryMuscles: exercise.muscles || [],
            difficulty: 300,
          },
          sets: exercise.sets,
          reps: String(exercise.reps),
          tempo: exercise.tempo,
          restSeconds: parseRestSeconds(exercise.rest),
          intensityPercent: typeof exercise.intensity === 'number'
            ? exercise.intensity
            : (parseInt(String(exercise.intensity).replace(/[^0-9]/g, ''), 10) || 70),
          notes: exercise.recommendedWeightMin
            ? `Recommended: ${exercise.recommendedWeightMin}-${exercise.recommendedWeightMax} lbs (based on ${exercise.basedOn1RM} lb 1RM)`
            : '',
        }));
        setPlanExercises(generated);
        resetLoadedPlanState();

        if (workout.explanations && workout.explanations.length > 0) {
          setExplanations(workout.explanations);
          setShowExplanations(true);
        }
      }
    } catch (err: unknown) {
      logApiError('AI generation failed', err);
      const errData = (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
      const specificMsg = errData?.details || errData?.error;
      if (specificMsg?.includes('client context unavailable')) {
        setStatusMsg({ type: 'error', text: 'Unable to generate workout: Client data could not be loaded. Verify the client has an active profile with pain entries and equipment profile.' });
      } else if (specificMsg?.includes('equipment')) {
        setStatusMsg({ type: 'error', text: `Unable to generate workout: ${specificMsg}. Please verify the client's equipment profile.` });
      } else if (specificMsg) {
        setStatusMsg({ type: 'error', text: `Workout generation failed: ${specificMsg}` });
      } else {
        setStatusMsg({ type: 'error', text: 'Swan Coach generation failed. Check client data and try again.' });
      }
    } finally {
      setGenerating(false);
    }
  }, [authAxios, category, goal, phaseNumber, resetLoadedPlanState, selectedEquipmentProfileId, setPhaseNumber, setPlanExercises, setStatusMsg]);

  const handleGeneratePlan = useCallback(async (selectedClientId: number | null) => {
    if (!selectedClientId || planDuration === 'single') return;
    setGeneratingPlan(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setGeneratedPlan(null);
    setPlanExercises([]);
    resetLoadedPlanState();
    try {
      const res = await authAxios.post('/api/workout-builder/plan', {
        clientId: selectedClientId,
        durationWeeks: Number(planDuration),
        sessionsPerWeek,
        primaryGoal: goal,
        startingPhaseOverride: phaseNumber,
        ...(selectedEquipmentProfileId ? { equipmentProfileId: selectedEquipmentProfileId } : {}),
      });
      const data = res.data as GeneratedPlanResponse | undefined;
      if (data?.success && data.plan) {
        const safetyWarning = getGeneratedPlanSafetyWarning(data.plan);
        const isDegraded = Boolean(safetyWarning);
        setDegradedIntelligence(isDegraded);
        setGeneratedPlan(data.plan);
        setStatusMsg(safetyWarning
          ? { type: 'error', text: safetyWarning }
          : { type: 'success', text: `${data.plan.planSummary.durationWeeks}-week periodized plan generated successfully!` });
      }
    } catch (err: unknown) {
      logApiError('Plan generation failed', err);
      const errData = (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
      const specificMsg = errData?.details || errData?.error;
      setStatusMsg({ type: 'error', text: specificMsg ? `Plan generation failed: ${specificMsg}` : 'Failed to generate training plan. Check client data and try again.' });
    } finally {
      setGeneratingPlan(false);
    }
  }, [authAxios, goal, phaseNumber, planDuration, resetLoadedPlanState, selectedEquipmentProfileId, sessionsPerWeek, setGeneratedPlan, setPlanExercises, setStatusMsg]);

  return {
    generating,
    generatingPlan,
    degradedIntelligence,
    explanations,
    showExplanations,
    clearExplanations,
    handleAIGenerate,
    handleGeneratePlan,
    handleToggleExplanations,
  };
};
