/**
 * Hook: useWorkoutPlannerPageActions
 * Purpose: Own page-level event handlers for the Workout Planner shell.
 */

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { WorkoutPlannerConfirmRequest } from './WorkoutPlannerConfirmDialog';
import type { GeneratedPlan, PlanDuration, PlanExercise } from './WorkoutPlannerTypes';

interface WorkoutPlannerPageActionsInput {
  plannerReturnTo: string | null;
  navigate: NavigateFunction;
  isDirty: boolean;
  loadedPlanId: string | null;
  loadedPlanName: string | null;
  loadPlanIntoBuilder: (planId: string, planName: string) => Promise<void> | void;
  handleCardDuplicate: (planId: string, planName: string) => void;
  clearSearchForBrowse: () => void;
  setTeachModeOpen: Dispatch<SetStateAction<boolean>>;
  setPlanDuration: Dispatch<SetStateAction<PlanDuration>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setConfirmRequest: Dispatch<SetStateAction<WorkoutPlannerConfirmRequest | null>>;
}

export const useWorkoutPlannerPageActions = ({
  plannerReturnTo,
  navigate,
  isDirty,
  loadedPlanId,
  loadedPlanName,
  loadPlanIntoBuilder,
  handleCardDuplicate,
  clearSearchForBrowse,
  setTeachModeOpen,
  setPlanDuration,
  setGeneratedPlan,
  setPlanExercises,
  setConfirmRequest,
}: WorkoutPlannerPageActionsInput) => {
  const removeExercise = useCallback((id: string) => {
    setPlanExercises(prev => prev.filter(planExercise => planExercise.id !== id));
  }, [setPlanExercises]);

  const updateExercise = useCallback((id: string, field: keyof PlanExercise, value: unknown) => {
    setPlanExercises(prev =>
      prev.map(planExercise => (
        planExercise.id === id ? { ...planExercise, [field]: value } : planExercise
      ))
    );
  }, [setPlanExercises]);

  const handleLoadPlan = useCallback((planId: string, planName: string) => {
    if (isDirty) {
      setConfirmRequest({
        title: 'Discard unsaved builder changes?',
        message: `Load "${planName}" and replace the exercises currently in the builder.`,
        confirmLabel: 'Load plan',
        tone: 'warning',
        onConfirm: () => loadPlanIntoBuilder(planId, planName),
      });
      return;
    }

    void loadPlanIntoBuilder(planId, planName);
  }, [isDirty, loadPlanIntoBuilder, setConfirmRequest]);

  const handleReturnToClientHub = useCallback(() => {
    if (plannerReturnTo) navigate(plannerReturnTo);
  }, [navigate, plannerReturnTo]);

  const handleTeachModeToggle = useCallback(() => {
    setTeachModeOpen(value => !value);
  }, [setTeachModeOpen]);

  const handlePlanDurationChange = useCallback((nextDuration: PlanDuration) => {
    setPlanDuration(nextDuration);
    setGeneratedPlan(null);
    setPlanExercises([]);
  }, [setGeneratedPlan, setPlanDuration, setPlanExercises]);

  const handleDuplicateLoadedPlan = useCallback(() => {
    if (!loadedPlanId) return;
    handleCardDuplicate(loadedPlanId, loadedPlanName || 'plan');
  }, [handleCardDuplicate, loadedPlanId, loadedPlanName]);

  const handleBrowseAddExercise = useCallback(() => {
    clearSearchForBrowse();
  }, [clearSearchForBrowse]);

  return {
    removeExercise,
    updateExercise,
    handleLoadPlan,
    handleReturnToClientHub,
    handleTeachModeToggle,
    handlePlanDurationChange,
    handleDuplicateLoadedPlan,
    handleBrowseAddExercise,
  };
};
