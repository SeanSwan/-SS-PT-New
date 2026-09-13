import { describe, expect, it } from 'vitest';
import {
  createExerciseSearchWorkerState,
  EXERCISE_SEARCH_RESULT_CAP,
  normalizeCategory,
  searchExercises,
} from './exerciseSearchCore';
import { searchExercisesSync, type ExerciseSlim } from './exerciseSearchWorker';

function exercise(overrides: Partial<ExerciseSlim> = {}): ExerciseSlim {
  return {
    id: 'one',
    name: 'Neutral Move',
    exerciseKey: 'one',
    exerciseType: 'mobility',
    bodyPartCategory: 'Full Body',
    primaryMuscles: ['Hamstring'],
    difficulty: 1,
    ...overrides,
  };
}

describe('exercise search scoring contract', () => {
  it('normalizes category aliases and preserves catalog order for blank queries', () => {
    const rows = [
      exercise({ id: 'first', bodyPartCategory: 'full_body' }),
      exercise({ id: 'second', bodyPartCategory: 'Full Body' }),
      exercise({ id: 'other', bodyPartCategory: 'Chest' }),
    ];
    expect(searchExercisesSync(rows, '', 'Full Body').map((row) => row.id)).toEqual(['first', 'second']);
  });

  it('does not claim alphabetical ordering for a blank query', () => {
    const rows = [
      exercise({ id: 'zulu', name: 'Zulu Press' }),
      exercise({ id: 'alpha', name: 'Alpha Press' }),
    ];
    // Catalog order is the contract; sorting would return ['alpha', 'zulu'].
    expect(searchExercisesSync(rows, '', null).map((row) => row.id)).toEqual(['zulu', 'alpha']);
  });

  it('matches type and primary muscle fields with the same fallback scorer', () => {
    const rows = [
      exercise({ id: 'type', name: 'Quiet Motion', exerciseType: 'cardio', primaryMuscles: ['Quadriceps'] }),
      exercise({ id: 'muscle', name: 'Quiet Motion', exerciseType: 'strength', primaryMuscles: ['Hamstring'] }),
    ];
    expect(searchExercisesSync(rows, 'cardio', null).map((row) => row.id)).toEqual(['type']);
    expect(searchExercisesSync(rows, 'ham', null).map((row) => row.id)).toEqual(['muscle']);
  });

  it('caps a non-blank query at the existing result limit and keeps ties stable', () => {
    const rows = Array.from({ length: 130 }, (_, index) =>
      exercise({ id: `row-${index}`, name: `Press Variant ${index}` }));
    const capped = searchExercisesSync(rows, 'press', null);
    expect(capped).toHaveLength(EXERCISE_SEARCH_RESULT_CAP);
    expect(capped[0].id).toBe('row-0');
  });

  it('treats All as no category filter, matching the chip contract', () => {
    expect(normalizeCategory('All')).toBeNull();
    expect(normalizeCategory('  ')).toBeNull();
    expect(normalizeCategory(42)).toBeNull();
    expect(normalizeCategory('Chest')).toBe('chest');
  });

  it('ignores malformed optional token values instead of calling string methods on them', () => {
    const malformed = exercise({
      name: 'Unrelated',
      exerciseType: 'strength',
      primaryMuscles: [42 as unknown as string],
    });
    expect(() => searchExercisesSync([malformed], 'chest', null)).not.toThrow();
    expect(searchExercisesSync([malformed], 'chest', null)).toEqual([]);
  });

  it('survives a malformed catalog payload without throwing', () => {
    expect(() => searchExercises(null, 'press', null)).not.toThrow();
    expect(searchExercises(undefined, 'press', null)).toEqual([]);
    expect(
      searchExercises([null as unknown as ExerciseSlim], 'press', null),
    ).toEqual([]);
  });
});

describe('worker handler parity with the synchronous fallback', () => {
  it('returns byte-identical rows for the same catalog, query and category', () => {
    const rows = [
      exercise({ id: 'bench', name: 'Bench Press', exerciseType: 'strength', bodyPartCategory: 'Chest', primaryMuscles: ['Chest'] }),
      exercise({ id: 'squat', name: 'Back Squat', exerciseType: 'strength', bodyPartCategory: 'Legs', primaryMuscles: ['Quadriceps'] }),
      exercise({ id: 'bike', name: 'Air Bike', exerciseType: 'cardio', bodyPartCategory: 'Full Body', primaryMuscles: ['Quadriceps'] }),
    ];
    const state = createExerciseSearchWorkerState();
    state.handle({ type: 'CACHE', exercises: rows, catalogRevision: 4 });

    for (const [query, category] of [['press', null], ['', 'Full Body'], ['quad', null], ['bike', 'Full Body']] as const) {
      const reply = state.handle({
        type: 'SEARCH',
        query,
        category,
        catalogRevision: 4,
        searchSequence: 9,
      });
      expect(reply?.exercises).toEqual(searchExercisesSync(rows, query, category));
      expect(reply).toEqual(expect.objectContaining({ catalogRevision: 4, searchSequence: 9, query }));
    }
  });

  it('ignores unknown message shapes and never replies to CACHE', () => {
    const state = createExerciseSearchWorkerState();
    expect(state.handle({ type: 'CACHE', exercises: [], catalogRevision: 1 })).toBeNull();
    expect(state.handle(null)).toBeNull();
    expect(state.handle({ type: 'NOPE' })).toBeNull();
  });
});
