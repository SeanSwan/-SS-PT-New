/**
 * ============================================================================
 * FILE: bootcamp/index.mjs
 * PURPOSE: Barrel export for bootcamp service modules
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

export { generateBootcampClass } from './bootcampGenerator.mjs';
export { optimizeStationFlow } from './flowOptimizer.mjs';
export {
  saveBootcampTemplate,
  logBootcampClass,
  getClassHistory,
  getTemplates,
  createSpaceProfile,
  getSpaceProfiles,
  updateSpaceProfile,
  getExerciseTrends,
  approveExerciseTrend,
} from './bootcampCrud.mjs';
export {
  FORMAT_CONFIG,
  DAY_TYPE_MUSCLES,
  CARDIO_FINISHERS,
  LAP_EXERCISES,
  SETUP_TIME_CATEGORIES,
  formatExerciseName,
  distributeMuscleGroups,
} from './bootcampConstants.mjs';
export {
  queryExercisesForBootcamp,
  estimateSetupTime,
} from './exerciseRolodexBridge.mjs';
export {
  generateBoard2,
  applyPyramidStyle,
  applySupersetStyle,
  generateStretches,
} from './classStyleModifiers.mjs';
export {
  createSprint, getSprintById, listSprints,
  updateSprint, archiveSprint,
  updateWeek, updateSlot, confirmSlotUsed,
  getSprintExerciseMemoryKeys,
} from './sprintService.mjs';
export {
  generateSprintClasses,
  regenerateSlot,
} from './sprintGenerator.mjs';
