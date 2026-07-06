/**
 * SwanExercisePicker — pure filter pipeline (Phase 2.3a)
 * ======================================================
 * Composes the app's EXISTING filter logic rather than duplicating it
 * (Rule 63 anti-dupe): equip/type narrowing comes from the logger's
 * `applyEquipTypeFilters`, section narrowing from the shared
 * SECTION_PATTERNS module. This file adds only the composition order,
 * the excludeIds dedupe, and the primary-muscle narrowing that the
 * workout-page surface contributes to the family.
 *
 * Order matters: dedupe first (cheapest, always on), then equip/type,
 * then muscle, then section — each step narrows the pool for the next.
 */
import { applyEquipTypeFilters } from '../../WorkoutLogger/NASMExerciseRolodex.helpers';
import { matchesSectionContextForTesting } from '../../WorkoutLogger/NASMExerciseRolodex.sectionFilter';
import type { ExerciseSlim, SectionContext } from './types';

export interface SwanPickerFilterState {
  typeFilter?: string | null;
  muscleFilter?: string | null;
  equipFilter?: string | null;
  sectionContext?: SectionContext;
}

export function applySwanPickerFilters(
  pool: ExerciseSlim[],
  state: SwanPickerFilterState,
  excludeIds: Array<string | number> = [],
): ExerciseSlim[] {
  const excluded = new Set(excludeIds.map(String));
  let next = excluded.size > 0 ? pool.filter((ex) => !excluded.has(String(ex.id))) : pool;

  next = applyEquipTypeFilters(next, state.typeFilter ?? null, state.equipFilter ?? null);

  if (state.muscleFilter) {
    const muscle = state.muscleFilter.toLowerCase();
    next = next.filter((ex) =>
      (ex.primaryMuscles ?? []).some((m) => m.toLowerCase() === muscle));
  }

  if (state.sectionContext && state.sectionContext !== 'main') {
    next = next.filter((ex) => matchesSectionContextForTesting(ex, state.sectionContext));
  }

  return next;
}

/** Same level semantics the workout-page surface always showed. */
export const exerciseLevel = (difficulty: number): number =>
  Math.max(1, Math.ceil((Number(difficulty) || 0) / 100));

export const EXERCISE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'core', label: 'Core' },
  { value: 'balance', label: 'Balance' },
  { value: 'stability', label: 'Stability' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'stabilizers', label: 'Stabilizers' },
  { value: 'injury_prevention', label: 'Injury Prevention' },
  { value: 'injury_recovery', label: 'Injury Recovery' },
  { value: 'compound', label: 'Compound' },
];

export const MUSCLE_GROUP_OPTIONS = [
  { value: '', label: 'All Muscles' },
  { value: 'Glutes', label: 'Glutes' },
  { value: 'Calves', label: 'Calves' },
  { value: 'Shoulders', label: 'Shoulders' },
  { value: 'Hamstrings', label: 'Hamstrings' },
  { value: 'Abs', label: 'Abs' },
  { value: 'Chest', label: 'Chest' },
  { value: 'Biceps', label: 'Biceps' },
  { value: 'Triceps', label: 'Triceps' },
  { value: 'Lower Back', label: 'Lower Back' },
  { value: 'Quadriceps', label: 'Quadriceps' },
  { value: 'Core', label: 'Core' },
];

export const EQUIPMENT_OPTIONS = [
  { value: '', label: 'All Equipment' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'band', label: 'Band' },
  { value: 'cable', label: 'Cable' },
  { value: 'machine', label: 'Machine' },
];
