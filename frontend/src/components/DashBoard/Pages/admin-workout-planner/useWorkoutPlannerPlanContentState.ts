/**
 * HOOK: useWorkoutPlannerPlanContentState
 * PURPOSE: Owns workout-plan payload building, loaded-plan identity, saved
 * snapshot baselines, and dirty-state detection for the planner page.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  type GeneratedPlan,
  type OPTPhaseParams,
  type PlanExercise,
  type PlanGoal,
  type WorkoutCategory,
  WORKOUT_CATEGORIES,
} from './WorkoutPlannerTypes';
import { buildContentSignature, buildPlanData as composePlanData } from './planDataBuilder';

interface ManualSnapshotInput {
  phaseName: string;
  phaseNumber: number;
  category: WorkoutCategory;
  goal: PlanGoal;
  planExercises: PlanExercise[];
}

interface UseWorkoutPlannerPlanContentStateArgs {
  phase: OPTPhaseParams;
  phaseNumber: number;
  category: WorkoutCategory;
  goal: PlanGoal;
  planExercises: PlanExercise[];
  generatedPlan: GeneratedPlan | null;
}

const getWorkoutCategoryLabel = (category: WorkoutCategory) =>
  WORKOUT_CATEGORIES.find(option => option.value === category)?.label || 'Full Body';

export function useWorkoutPlannerPlanContentState({
  phase,
  phaseNumber,
  category,
  goal,
  planExercises,
  generatedPlan,
}: UseWorkoutPlannerPlanContentStateArgs) {
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [loadedPlanName, setLoadedPlanName] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const categoryLabel = getWorkoutCategoryLabel(category);

  const hasGeneratedHorizonPlan = !!(
    generatedPlan
    && Array.isArray(generatedPlan.weeks)
    && generatedPlan.weeks.length > 0
  );

  const buildPlanData = useCallback(() => {
    if (hasGeneratedHorizonPlan && generatedPlan) {
      return composePlanData({
        mode: 'generated',
        generatedPlan,
        category,
        goal,
      });
    }

    return composePlanData({
      mode: 'manual',
      phaseName: phase.name,
      phaseNumber,
      category,
      categoryLabel: getWorkoutCategoryLabel(category),
      goal,
      planExercises,
    });
  }, [phase.name, phaseNumber, category, planExercises, goal, hasGeneratedHorizonPlan, generatedPlan]);

  const buildGeneratedSnapshot = useCallback((
    restored: GeneratedPlan,
    snapshotCategory: WorkoutCategory,
    snapshotGoal: PlanGoal,
  ) => buildContentSignature({
    mode: 'generated',
    generatedPlan: restored,
    category: snapshotCategory,
    goal: snapshotGoal,
  }), []);

  const buildManualSnapshot = useCallback((input: ManualSnapshotInput) => buildContentSignature({
    mode: 'manual',
    phaseName: input.phaseName,
    phaseNumber: input.phaseNumber,
    category: input.category,
    categoryLabel: getWorkoutCategoryLabel(input.category),
    goal: input.goal,
    planExercises: input.planExercises,
  }), []);

  const currentExercisesSig = useMemo(() => {
    if (hasGeneratedHorizonPlan && generatedPlan) {
      return buildContentSignature({ mode: 'generated', generatedPlan, category, goal });
    }

    return buildManualSnapshot({
      phaseName: phase.name,
      phaseNumber,
      category,
      goal,
      planExercises,
    });
  }, [
    planExercises,
    hasGeneratedHorizonPlan,
    generatedPlan,
    category,
    goal,
    phase.name,
    phaseNumber,
    buildManualSnapshot,
  ]);

  const isDirty = useMemo(() => {
    if (planExercises.length === 0 && !hasGeneratedHorizonPlan) return false;
    if (savedSnapshot === null) return true;
    return currentExercisesSig !== savedSnapshot;
  }, [planExercises.length, savedSnapshot, currentExercisesSig, hasGeneratedHorizonPlan]);

  const resetLoadedPlanState = useCallback(() => {
    setLoadedPlanId(null);
    setLoadedPlanName(null);
    setSavedSnapshot(null);
  }, []);

  return {
    loadedPlanId,
    loadedPlanName,
    categoryLabel,
    hasGeneratedHorizonPlan,
    currentExercisesSig,
    isDirty,
    buildPlanData,
    buildGeneratedSnapshot,
    buildManualSnapshot,
    setLoadedPlanId,
    setLoadedPlanName,
    setSavedSnapshot,
    resetLoadedPlanState,
  };
}
