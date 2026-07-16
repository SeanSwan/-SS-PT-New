/**
 * ============================================================================
 * FILE: trainingPlanProjectionFeatureFlag.ts
 * PURPOSE: Fail closed unless the UMS projection build flag is explicitly true.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

export const trainingPlanScheduleProjectionsEnabled = (
  value: unknown = import.meta.env.VITE_TRAINING_PLAN_SCHEDULE_PROJECTIONS,
): boolean => typeof value === 'string' && value.trim().toLowerCase() === 'true';