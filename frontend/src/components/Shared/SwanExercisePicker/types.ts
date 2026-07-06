/**
 * SwanExercisePicker — shared types + mode contract (Phase 2.3a)
 * ==============================================================
 * ONE picker family for every exercise-selection surface in the app.
 * The repo grew five parallel pickers (logger rolodex, bootcamp rolodex,
 * planner panel, workout-mgmt library, workout-page selector) — each with
 * its own fetch, filter, and row markup. This module is the convergence
 * point: a mode string picks the surface's density/filters/action label,
 * and EVERY mode emits the same `ExerciseSlim` (the always-emit invariant)
 * so consumers adapt at their own edge instead of forking the picker.
 *
 * 2.3a ships the core (search/filter/virtual list) and adopts the
 * workout-page mode. Preview + Sheet surfaces land in 2.3b alongside the
 * richer modes that need them (logger-rolodex, bootcamp-station) — the
 * mode contract is designed for all five NOW so 2.3b is additive only.
 */
import type { SectionContext } from '../../WorkoutLogger/NASMExerciseRolodex.sectionFilter';

export type { ExerciseSlim } from '../../WorkoutLogger/exerciseSearchWorker';
export type { SectionContext };

export type SwanPickerMode =
  | 'logger-rolodex'
  | 'bootcamp-station'
  | 'planner'
  | 'workout-mgmt'
  | 'workout-page';

/** Where the picker's query/filter state lives between mounts. */
export type SwanPickerPersistence = 'ephemeral' | 'session' | 'url';

export interface SwanPickerModeConfig {
  showTypeFilter: boolean;
  showMuscleFilter: boolean;
  showEquipmentFilter: boolean;
  /** Section-context narrowing (warmup/balance_core/cooldown) — logger lane. */
  showSectionFilter: boolean;
  /** Media thumbnails in rows — 2.3b surface, typed now for the contract. */
  showMedia: boolean;
  /** Accessible action: `${actionLabel} ${exercise.name}${actionAriaSuffix}`. */
  actionLabel: string;
  actionAriaSuffix: string;
  rowHeight: number;
  visibleRows: number;
}

export const SWAN_PICKER_MODES: Record<SwanPickerMode, SwanPickerModeConfig> = {
  'logger-rolodex': {
    showTypeFilter: true,
    showMuscleFilter: true,
    showEquipmentFilter: true,
    showSectionFilter: true,
    showMedia: true,
    actionLabel: 'Select',
    actionAriaSuffix: '',
    rowHeight: 96,
    visibleRows: 6,
  },
  'bootcamp-station': {
    showTypeFilter: true,
    showMuscleFilter: false,
    showEquipmentFilter: true,
    showSectionFilter: false,
    showMedia: true,
    actionLabel: 'Add',
    actionAriaSuffix: ' to class',
    rowHeight: 96,
    visibleRows: 6,
  },
  planner: {
    showTypeFilter: true,
    showMuscleFilter: true,
    showEquipmentFilter: false,
    showSectionFilter: false,
    showMedia: false,
    actionLabel: 'Add',
    actionAriaSuffix: ' to workout',
    rowHeight: 88,
    visibleRows: 7,
  },
  'workout-mgmt': {
    showTypeFilter: true,
    showMuscleFilter: true,
    showEquipmentFilter: true,
    showSectionFilter: false,
    showMedia: false,
    actionLabel: 'Add',
    actionAriaSuffix: ' to workout',
    rowHeight: 88,
    visibleRows: 7,
  },
  'workout-page': {
    showTypeFilter: true,
    showMuscleFilter: true,
    showEquipmentFilter: false,
    showSectionFilter: false,
    showMedia: false,
    actionLabel: 'Add',
    actionAriaSuffix: ' to workout',
    rowHeight: 88,
    visibleRows: 7,
  },
};

export interface SwanExercisePickerOptions {
  mode: SwanPickerMode;
  /** Already-picked exercises to hide (dedupe at the rendered surface). */
  excludeIds?: Array<string | number>;
  sectionContext?: SectionContext;
  /** Namespaces persisted state; required for session/url persistence. */
  persistKey?: string;
  persistence?: SwanPickerPersistence;
}
