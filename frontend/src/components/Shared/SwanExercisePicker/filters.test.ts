/**
 * SwanExercisePicker filters — pure pipeline tests (Phase 2.3a)
 *
 * Locks: excludeIds dedupe (string AND number ids), case-insensitive type
 * filter, primary-muscle filter, bodyweight-equipment semantics, and the
 * section-context pass-through ('main'/undefined = no narrowing).
 */
import { describe, expect, it } from 'vitest';
import { applySwanPickerFilters, exerciseLevel } from './filters';
import type { ExerciseSlim } from './types';

const slim = (over: Partial<ExerciseSlim>): ExerciseSlim => ({
  id: 'x',
  name: 'Exercise',
  exerciseKey: 'x',
  exerciseType: 'compound',
  bodyPartCategory: 'Full Body',
  primaryMuscles: [],
  secondaryMuscles: [],
  difficulty: 100,
  equipment: [],
  equipmentNeeded: [],
  source: 'swanstudios',
  optPhases: [],
  canBePerformedAtHome: true,
  catalogVideoSample: null,
  ...over,
} as ExerciseSlim);

const pool = [
  slim({ id: '1', name: 'Barbell Squat', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes'], equipment: ['Barbell'] }),
  slim({ id: '2', name: 'Plank', exerciseType: 'core', primaryMuscles: ['Core'], equipment: [] }),
  slim({ id: '3', name: 'Biceps Curl', exerciseType: 'isolation', primaryMuscles: ['Biceps'], equipment: ['Dumbbell'] }),
];

describe('applySwanPickerFilters', () => {
  it('drops excluded ids whether callers pass strings or numbers', () => {
    const out = applySwanPickerFilters(pool, {}, ['1', 3 as unknown as string]);
    expect(out.map((e) => e.id)).toEqual(['2']);
  });

  it('narrows by exercise type case-insensitively', () => {
    const out = applySwanPickerFilters(pool, { typeFilter: 'CORE' }, []);
    expect(out.map((e) => e.id)).toEqual(['2']);
  });

  it('narrows by primary muscle', () => {
    const out = applySwanPickerFilters(pool, { muscleFilter: 'biceps' }, []);
    expect(out.map((e) => e.id)).toEqual(['3']);
  });

  it('treats empty equipment as bodyweight', () => {
    const out = applySwanPickerFilters(pool, { equipFilter: 'bodyweight' }, []);
    expect(out.map((e) => e.id)).toEqual(['2']);
  });

  it("applies no section narrowing for 'main' or missing context", () => {
    expect(applySwanPickerFilters(pool, { sectionContext: 'main' }, [])).toHaveLength(3);
    expect(applySwanPickerFilters(pool, {}, [])).toHaveLength(3);
  });
});

describe('exerciseLevel', () => {
  it('mirrors the workout-page level semantics (ceil(difficulty/100), min 1)', () => {
    expect(exerciseLevel(0)).toBe(1);
    expect(exerciseLevel(100)).toBe(1);
    expect(exerciseLevel(250)).toBe(3);
  });
});
