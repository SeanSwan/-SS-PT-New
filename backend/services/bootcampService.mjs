/**
 * ============================================================================
 * FILE: bootcampService.mjs
 * PURPOSE: Re-export barrel for backward compatibility
 * NOTE: Implementation moved to services/bootcamp/ directory
 * ============================================================================
 */

export {
  generateBootcampClass,
  saveBootcampTemplate,
  logBootcampClass,
  getClassHistory,
  getTemplates,
  createSpaceProfile,
  getSpaceProfiles,
  updateSpaceProfile,
  getExerciseTrends,
  approveExerciseTrend,
  queryExercisesForBootcamp,
} from './bootcamp/index.mjs';
