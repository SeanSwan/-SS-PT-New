/**
 * useCopilotDraftEditor
 *
 * Purpose: Owns the editable single-workout draft state and immutable edit
 * operations so WorkoutCopilotPanel can stay focused on orchestration.
 */

import { useCallback, useState } from 'react';
import type { Exercise, WorkoutDay, WorkoutPlan } from './copilot-types';

const EMPTY_EXERCISE: Exercise = {
  name: '',
  setScheme: '',
  repGoal: '',
  restPeriod: 60,
};

export const useCopilotDraftEditor = () => {
  const [editedPlan, setEditedPlan] = useState<WorkoutPlan | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const updatePlanField = useCallback(
    <K extends keyof WorkoutPlan>(field: K, value: WorkoutPlan[K]) => {
      setEditedPlan((prev) => (prev ? { ...prev, [field]: value } : null));
    },
    [],
  );

  const updateDay = useCallback(
    <K extends keyof WorkoutDay>(dayIdx: number, field: K, value: WorkoutDay[K]) => {
      setEditedPlan((prev) => {
        if (!prev) return null;
        const days = [...prev.days];
        days[dayIdx] = { ...days[dayIdx], [field]: value };
        return { ...prev, days };
      });
    },
    [],
  );

  const updateExercise = useCallback(
    <K extends keyof Exercise>(
      dayIdx: number,
      exIdx: number,
      field: K,
      value: Exercise[K],
    ) => {
      setEditedPlan((prev) => {
        if (!prev) return null;
        const days = [...prev.days];
        const exercises = [...days[dayIdx].exercises];
        exercises[exIdx] = { ...exercises[exIdx], [field]: value };
        days[dayIdx] = { ...days[dayIdx], exercises };
        return { ...prev, days };
      });
    },
    [],
  );

  const addExercise = useCallback((dayIdx: number) => {
    setEditedPlan((prev) => {
      if (!prev) return null;
      const days = [...prev.days];
      const exercises = [...days[dayIdx].exercises, EMPTY_EXERCISE];
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  }, []);

  const removeExercise = useCallback((dayIdx: number, exIdx: number) => {
    setEditedPlan((prev) => {
      if (!prev) return null;
      const days = [...prev.days];
      const exercises = days[dayIdx].exercises.filter((_, i) => i !== exIdx);
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  }, []);

  const toggleDay = useCallback((dayIdx: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayIdx)) {
        next.delete(dayIdx);
      } else {
        next.add(dayIdx);
      }
      return next;
    });
  }, []);

  return {
    editedPlan,
    setEditedPlan,
    expandedDays,
    setExpandedDays,
    updatePlanField,
    updateDay,
    updateExercise,
    addExercise,
    removeExercise,
    toggleDay,
  };
};
