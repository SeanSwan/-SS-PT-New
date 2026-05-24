/**
 * workoutLoggerVoiceImport.ts
 * ===========================
 * Converts parsed upload results from VoiceMemoUpload into the same
 * ExerciseEntry shape the manual WorkoutLogger path already saves.
 */
import type { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import type { ParsedExercise, ParsedWorkout } from './VoiceMemoUpload';

function finiteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parsedSetToEntry(set: ParsedExercise['sets'][number], index: number): ExerciseSet {
  return {
    setNumber: finiteNumber(set.setNumber, index + 1),
    weight: finiteNumber(set.weight),
    reps: finiteNumber(set.reps),
    rpe: nullableNumber(set.rpe),
    tempo: '',
    restTime: 60,
    formQuality: nullableNumber(set.formQuality),
    notes: typeof set.notes === 'string' ? set.notes : '',
  };
}

export function parsedWorkoutToExerciseEntries(
  workout: ParsedWorkout,
  idPrefix = `upload-${Date.now().toString(36)}`,
): ExerciseEntry[] {
  if (!Array.isArray(workout.exercises)) return [];

  return workout.exercises
    .filter((exercise) => typeof exercise.exerciseName === 'string' && exercise.exerciseName.trim().length > 0)
    .map((exercise, exerciseIndex) => {
      const sourceSets = Array.isArray(exercise.sets) && exercise.sets.length > 0
        ? exercise.sets
        : [{ setNumber: 1, weight: 0, reps: 0 }];

      return {
        exerciseId: `${idPrefix}-${exerciseIndex + 1}`,
        exerciseName: exercise.exerciseName.trim(),
        sets: sourceSets.map(parsedSetToEntry),
        formRating: nullableNumber(exercise.formRating),
        painLevel: finiteNumber(exercise.painLevel),
        performanceNotes: typeof exercise.performanceNotes === 'string' ? exercise.performanceNotes : '',
      };
    });
}

export function appendImportedSessionNotes(current: string, imported: unknown): string {
  if (typeof imported !== 'string' || imported.trim().length === 0) return current;
  const cleanImported = imported.trim();
  return current.trim().length > 0 ? `${current.trim()}\n\n${cleanImported}` : cleanImported;
}
