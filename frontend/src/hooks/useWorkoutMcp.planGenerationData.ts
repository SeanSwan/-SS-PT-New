/**
 * useWorkoutMcp.planGenerationData.ts
 * ===================================
 * Shared data helpers for generated workout-plan persistence.
 *
 * Keeps identity stripping and record coercion out of the main generation
 * adapter so plan-save logic stays small and auditable.
 */

import { sanitizeWorkoutPlanDataForPersistence } from '../utils/workoutPlanDataPrivacy';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const toRecord = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

export const recordArrayFrom = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

export const sanitizePlanDataForPersistence = sanitizeWorkoutPlanDataForPersistence;
