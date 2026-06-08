/**
 * useWorkoutMcp.planGenerationData.ts
 * ===================================
 * Shared data helpers for generated workout-plan persistence.
 *
 * Keeps identity stripping and record coercion out of the main generation
 * adapter so plan-save logic stays small and auditable.
 */

const PLAN_DATA_IDENTITY_KEYS = new Set([
  'address', 'client', 'clientemail', 'clientname', 'clientprofile', 'dateofbirth',
  'email', 'firstname', 'lastname', 'phone', 'phonenumber', 'selectedclient',
]);

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const toRecord = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

export const recordArrayFrom = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const isIdentityPlanDataKey = (key: string) =>
  PLAN_DATA_IDENTITY_KEYS.has(key.replace(/[_-]/g, '').toLowerCase());

const sanitizePlanDataRecord = (value: Record<string, unknown>) =>
  Object.entries(value).reduce<Record<string, unknown>>((cleaned, [key, child]) => {
    if (!isIdentityPlanDataKey(key)) cleaned[key] = sanitizePlanDataForPersistence(child);
    return cleaned;
  }, {});

export const sanitizePlanDataForPersistence = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizePlanDataForPersistence);
  if (typeof value === 'string') return value.replace(EMAIL_PATTERN, '[redacted]');
  return isRecord(value) ? sanitizePlanDataRecord(value) : value;
};
