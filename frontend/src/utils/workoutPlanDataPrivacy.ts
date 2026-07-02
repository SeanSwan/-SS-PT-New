/**
 * Workout plan data privacy helpers.
 *
 * Generated workout plans are stored in WorkoutPlan.planData JSONB and reused
 * by planner, PDF, and logger handoff surfaces. This module removes direct
 * client identity fields and contact details while preserving training data.
 */

const PLAN_DATA_IDENTITY_KEYS = new Set([
  'address', 'client', 'clientemail', 'clientname', 'clientprofile', 'contactemail',
  'contactphone', 'dateofbirth', 'email', 'emergencycontact', 'emergencyphone',
  'firstname', 'lastname', 'phone', 'phonenumber', 'selectedclient',
]);

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\b\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const isIdentityPlanDataKey = (key: string) =>
  PLAN_DATA_IDENTITY_KEYS.has(key.replace(/[_-]/g, '').toLowerCase());

const redactContactDetails = (value: string) =>
  value.replace(EMAIL_PATTERN, '[redacted]').replace(PHONE_PATTERN, '[redacted]');

const sanitizeWorkoutPlanDataRecord = (value: Record<string, unknown>) =>
  Object.entries(value).reduce<Record<string, unknown>>((cleaned, [key, child]) => {
    if (!isIdentityPlanDataKey(key)) cleaned[key] = sanitizeWorkoutPlanDataForPersistence(child);
    return cleaned;
  }, {});

export const sanitizeWorkoutPlanDataForPersistence = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeWorkoutPlanDataForPersistence);
  if (typeof value === 'string') return redactContactDetails(value);
  return isRecord(value) ? sanitizeWorkoutPlanDataRecord(value) : value;
};
