/**
 * ExerciseSelector — workout-page adapter over SwanExercisePicker (2.3a)
 * ======================================================================
 * First adopter of the shared picker family. This file used to own its
 * own fetch + filter + card list; all of that now lives in
 * components/Shared/SwanExercisePicker (worker-backed search over the
 * role-open /api/exercises/library, virtualized to the full 840-exercise
 * library instead of this page's old unvirtualized list).
 *
 * The adapter's whole job: keep the WorkoutPlanner contract stable —
 * same props, and onAddExercise still receives ExerciseSelectorExercise
 * (mapped from the picker's always-emit ExerciseSlim at this edge).
 * `clientId` stays in the props for caller compatibility; the library
 * endpoint is role-open so the fetch no longer gates on it.
 */
import React from 'react';
import SwanExercisePicker from '../../../components/Shared/SwanExercisePicker/SwanExercisePicker';
import type { ExerciseSlim } from '../../../components/Shared/SwanExercisePicker/types';
import type { ExerciseSelectorExercise } from './ExerciseSelector.logic';

interface ExerciseSelectorProps {
  clientId: string | null;
  onAddExercise: (exercise: ExerciseSelectorExercise) => void;
  selectedExerciseIds: string[];
}

export const toSelectorExercise = (exercise: ExerciseSlim): ExerciseSelectorExercise => ({
  id: exercise.id,
  name: exercise.name,
  exerciseType: exercise.exerciseType,
  primaryMuscles: exercise.primaryMuscles ?? [],
  difficulty: exercise.difficulty ?? 0,
  recommendedSets: exercise.recommendedSets ?? undefined,
  recommendedReps: exercise.recommendedReps ?? undefined,
  recommendedRest: exercise.restInterval ?? exercise.defaultRestSeconds ?? undefined,
});

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onAddExercise,
  selectedExerciseIds
}) => (
  <SwanExercisePicker
    mode="workout-page"
    title="Exercise Library"
    excludeIds={selectedExerciseIds}
    onSelect={(exercise) => onAddExercise(toSelectorExercise(exercise))}
  />
);

export default ExerciseSelector;
