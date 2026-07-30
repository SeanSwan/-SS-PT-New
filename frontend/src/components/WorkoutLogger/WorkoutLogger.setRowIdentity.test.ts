import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import type { ExerciseEntry } from '../../services/nasmApiService';
import {
  ensureWorkoutLoggerExerciseRowIdentity,
  ensureWorkoutLoggerSetIds,
  getExerciseEntryRowKey,
  getExerciseSetRowKey,
} from './WorkoutLogger.helpers';
import { stripNullRatings } from './workoutLoggerSubmitPayload';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const exerciseWithAnonymousSets = (): ExerciseEntry => ({
  exerciseId: 'push-up',
  exerciseName: 'Push Up',
  formRating: null,
  painLevel: 0,
  performanceNotes: '',
  sets: [
    { setNumber: 1, weight: 0, reps: 12, rpe: null },
    { setNumber: 2, weight: 0, reps: 10, rpe: null },
  ],
});

describe('WorkoutLogger set row identity', () => {
  it('assigns distinct UI-only ids to duplicate exercise rows', () => {
    let counter = 0;
    const createId = () => `exercise-row-${counter += 1}`;
    const firstEntry = ensureWorkoutLoggerExerciseRowIdentity(
      exerciseWithAnonymousSets(),
      createId,
      () => 'set-row-a',
    );
    const duplicateEntry = ensureWorkoutLoggerExerciseRowIdentity(
      exerciseWithAnonymousSets(),
      createId,
      () => 'set-row-b',
    );

    expect(firstEntry.exerciseId).toBe(duplicateEntry.exerciseId);
    expect(getExerciseEntryRowKey(firstEntry)).toBe('exercise-row-1');
    expect(getExerciseEntryRowKey(duplicateEntry)).toBe('exercise-row-2');
  });

  it('does not send UI-only exercise ids to /api/workout-forms', () => {
    const exercise = ensureWorkoutLoggerExerciseRowIdentity(
      exerciseWithAnonymousSets(),
      () => 'ui-only-exercise-id',
      () => 'ui-only-set-id',
    );

    expect(stripNullRatings([exercise])[0]).not.toHaveProperty('loggerExerciseId');
  });

  it('assigns stable UI-only ids that survive set renumbering', () => {
    let counter = 0;
    const exercise = ensureWorkoutLoggerSetIds(
      exerciseWithAnonymousSets(),
      () => `set-row-${counter += 1}`,
    );

    expect(exercise.sets.map(getExerciseSetRowKey)).toEqual(['set-row-1', 'set-row-2']);

    const remainingSetAfterRemoval = { ...exercise.sets[1], setNumber: 1 };

    expect(getExerciseSetRowKey(remainingSetAfterRemoval)).toBe('set-row-2');
  });

  it('does not send UI-only set ids to /api/workout-forms', () => {
    const exercise = ensureWorkoutLoggerSetIds(
      exerciseWithAnonymousSets(),
      () => 'ui-only-set-id',
    );

    expect(stripNullRatings([exercise])[0].sets[0]).not.toHaveProperty('loggerSetId');
  });

  it('does not key dynamic set rows by array index in canonical logger views', () => {
    expect(read('ExerciseCardComponent.tsx')).not.toContain('key={setIndex}');
    expect(read('QuickLogMode.tsx')).not.toContain('key={idx}');
  });

  it('does not key dynamic exercise cards by array index or duplicate backend id', () => {
    // 2026-07-30 Runner Styles: the card render moved from WorkoutLogger.tsx
    // into runner/useRunnerEngine.tsx (single source for Classic + skins).
    // The stable-row-key contract follows the render to its new home.
    expect(read('WorkoutLogger.tsx')).not.toContain('key={exercise.exerciseId || exerciseIndex}');
    expect(read('runner/useRunnerEngine.tsx')).not.toContain('key={exercise.exerciseId || exerciseIndex}');
    expect(read('runner/useRunnerEngine.tsx')).toContain('key={getExerciseEntryRowKey(exercise)}');
  });
});
