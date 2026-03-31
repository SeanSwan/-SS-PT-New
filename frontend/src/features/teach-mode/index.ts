/**
 * ============================================================================
 * FILE: index.ts
 * PURPOSE: Public barrel export for the Teach Mode feature module
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 */

// Types
export type {
  TeachModeContext,
  TeachModeTab,
  TeachModeConfig,
  TeachModeState,
  TeachModeTabDefinition,
  ExerciseTeachData,
  ExerciseEntityData,
} from './types/TeachModeContracts';

export { EXERCISE_TEACH_TABS } from './types/TeachModeContracts';

// Hooks
export { useExerciseTeachData } from './hooks/useExerciseTeachData';
