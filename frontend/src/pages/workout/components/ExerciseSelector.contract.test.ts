/**
 * ExerciseSelector contract (rewritten for the 2.3a shared-picker adoption)
 *
 * The pre-2.3a lock pinned this file's PRIVATE internals (authAxios fetch +
 * local getFilteredExercises). Those guarantees didn't disappear — they
 * moved into the shared family this surface now adopts, so the lock follows
 * them: the role-open library endpoint lives in useExerciseSearch (which
 * the shared picker wraps), filtering stays client-side in the picker's
 * pure pipeline, and this adapter keeps the WorkoutPlanner emit shape.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { toSelectorExercise } from './ExerciseSelector';
import type { ExerciseSlim } from '../../../components/Shared/SwanExercisePicker/types';

const selectorSource = readFileSync(
  resolve(process.cwd(), 'src/pages/workout/components/ExerciseSelector.tsx'),
  'utf8'
);
const searchHookSource = readFileSync(
  resolve(process.cwd(), 'src/components/WorkoutLogger/useExerciseSearch.ts'),
  'utf8'
);
const pickerHookSource = readFileSync(
  resolve(process.cwd(), 'src/components/Shared/SwanExercisePicker/useSwanExercisePicker.ts'),
  'utf8'
);

describe('ExerciseSelector protected workout planner contract', () => {
  it('adopts the shared picker in workout-page mode with excludeIds dedupe', () => {
    expect(selectorSource).toContain('SwanExercisePicker');
    expect(selectorSource).toContain('mode="workout-page"');
    expect(selectorSource).toContain('excludeIds={selectedExerciseIds}');
    expect(selectorSource).toContain('toSelectorExercise');
  });

  it('still reaches the authenticated client-safe exercise library endpoint (via the shared search hook)', () => {
    expect(pickerHookSource).toContain('useExerciseSearch');
    expect(searchHookSource).toContain("'/api/exercises/library'");
    expect(selectorSource).not.toContain("from 'axios'");
  });

  it('keeps the WorkoutPlanner emit shape at the adapter edge', () => {
    const slim = {
      id: '42',
      name: 'Barbell Squat',
      exerciseType: 'compound',
      primaryMuscles: ['Quadriceps', 'Glutes'],
      difficulty: 250,
      recommendedSets: 3,
      recommendedReps: 8,
      restInterval: 90,
    } as unknown as ExerciseSlim;

    expect(toSelectorExercise(slim)).toEqual({
      id: '42',
      name: 'Barbell Squat',
      exerciseType: 'compound',
      primaryMuscles: ['Quadriceps', 'Glutes'],
      difficulty: 250,
      recommendedSets: 3,
      recommendedReps: 8,
      recommendedRest: 90,
    });
  });

  it('stays a lean adapter: no styling, no fetch, under the line cap', () => {
    expect(selectorSource).not.toContain('styled.');
    expect(selectorSource).not.toContain('useEffect');
    expect(selectorSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
