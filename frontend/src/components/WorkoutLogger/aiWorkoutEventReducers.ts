import type { AIUpdateSetPayload } from '../../utils/aiWorkoutEvents';
import type { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';

const normalizeExerciseName = (value: string) => value.trim().toLowerCase();

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const applyNumberField = <K extends 'weight' | 'reps' | 'rpe'>(
  set: ExerciseSet,
  field: K,
  value: unknown
): ExerciseSet => {
  if (!isFiniteNumber(value)) return set;
  return { ...set, [field]: value };
};

export const applyAIUpdateSet = (
  exercises: ExerciseEntry[],
  payload: AIUpdateSetPayload
): ExerciseEntry[] => {
  const needle = normalizeExerciseName(payload.exerciseName || '');
  if (!needle) return exercises;

  const exerciseIndex = exercises.findIndex((exercise) => {
    const haystack = normalizeExerciseName(exercise.exerciseName);
    return haystack === needle || haystack.includes(needle) || needle.includes(haystack);
  });

  if (exerciseIndex < 0) return exercises;

  const exercise = exercises[exerciseIndex];
  const explicitSetNumber = payload.setNumber;
  if (explicitSetNumber !== undefined && (!Number.isInteger(explicitSetNumber) || explicitSetNumber < 1)) {
    return exercises;
  }

  const setIndex = explicitSetNumber !== undefined
    ? exercise.sets.findIndex((set) => set.setNumber === explicitSetNumber)
    : exercise.sets.length - 1;

  if (setIndex < 0 || setIndex >= exercise.sets.length) return exercises;

  let nextSet = exercise.sets[setIndex];
  nextSet = applyNumberField(nextSet, 'weight', payload.weight);
  nextSet = applyNumberField(nextSet, 'reps', payload.reps);
  nextSet = applyNumberField(nextSet, 'rpe', payload.rpe);

  if (typeof payload.tempo === 'string' && payload.tempo.trim()) {
    nextSet = { ...nextSet, tempo: payload.tempo.trim() };
  }

  if (nextSet === exercise.sets[setIndex]) return exercises;

  return exercises.map((item, index) => {
    if (index !== exerciseIndex) return item;

    return {
      ...item,
      sets: item.sets.map((set, currentSetIndex) =>
        currentSetIndex === setIndex ? nextSet : set
      ),
    };
  });
};
