/**
 * Workout Plan Route Helpers
 * ==========================
 *
 * Pure helpers used by workoutPlanRoutes. Keeping these here reduces route
 * ownership and gives UUID, metadata, and active-status behavior focused tests.
 */

import { sanitizeWorkoutPlanMetadataForPersistence } from './workoutPlanDataPrivacyService.mjs';

const WORKOUT_PLAN_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const normalizeWorkoutPlanId = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return WORKOUT_PLAN_UUID_PATTERN.test(normalized) ? normalized : null;
};

export const parseStrictPositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export const toPlainObject = (value) => (
  typeof value?.toJSON === 'function' ? value.toJSON() : value
);

export const currentDateOnly = () => new Date().toISOString().slice(0, 10);

const isPlainRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
const PRIMARY_METADATA_KEYS = new Set(['isprimaryplan', 'primary']);

const isPrimaryMetadataKey = (key) => (
  PRIMARY_METADATA_KEYS.has(String(key).replace(/[^a-z0-9]/gi, '').toLowerCase())
);

const omitRequestPrimaryMetadata = (metadata) => (
  Object.entries(metadata).reduce((safe, [key, value]) => {
    if (!isPrimaryMetadataKey(key)) safe[key] = value;
    return safe;
  }, {})
);

export const mergePlanMetadata = (plan, nextMetadata) => {
  const raw = toPlainObject(plan) || {};
  const current = isPlainRecord(raw.metadata) ? raw.metadata : {};
  const next = isPlainRecord(nextMetadata) ? omitRequestPrimaryMetadata(nextMetadata) : {};
  return sanitizeWorkoutPlanMetadataForPersistence({ ...current, ...next });
};

export const buildDuplicatePlanMetadata = (plan) => {
  const raw = toPlainObject(plan) || {};
  const metadata = sanitizeWorkoutPlanMetadataForPersistence(raw.metadata);
  delete metadata.planPdf;
  delete metadata.isPrimaryPlan;
  delete metadata.primary;
  return { ...metadata, duplicatedFrom: raw.id };
};

const isActivePlan = (plan) => cleanPlanStatus(plan) === 'active';
const cleanPlanStatus = (plan) => String(toPlainObject(plan)?.status || '').trim().toLowerCase();
export const selectCurrentWorkoutPlan = (fallbackPlan, plans = []) => (
  Array.isArray(plans) ? plans.find(isActivePlan) : null
) || (isActivePlan(fallbackPlan) ? fallbackPlan : null);
