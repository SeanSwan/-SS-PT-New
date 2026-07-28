/**
 * Workout Plan Route Helpers
 * ==========================
 *
 * Pure helpers used by workoutPlanRoutes. Keeping these here reduces route
 * ownership and gives primary-plan metadata behavior focused test coverage.
 */

export const ACTIVATE_MAX_RETRIES = 2;

export const isUniqueViolation = (err) =>
  err?.original?.code === '23505' || err?.parent?.code === '23505';

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

export const mergePlanMetadata = (plan, nextMetadata) => {
  const raw = toPlainObject(plan) || {};
  const current = isPlainRecord(raw.metadata) ? raw.metadata : {};
  const next = isPlainRecord(nextMetadata) ? nextMetadata : {};
  return { ...current, ...next };
};

export const buildDuplicatePlanMetadata = (plan) => {
  const raw = toPlainObject(plan) || {};
  const metadata = isPlainRecord(raw.metadata) ? { ...raw.metadata } : {};
  delete metadata.planPdf;
  return {
    ...metadata,
    isPrimaryPlan: false,
    primary: false,
    duplicatedFrom: raw.id,
  };
};

export const parseCopyDurationWeeks = (value) => {
  const parsed = parseStrictPositiveInteger(value);
  return parsed && parsed <= 52 ? parsed : null;
};

const cloneJson = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  return JSON.parse(JSON.stringify(value));
};

const normalizeCopiedPlanWeeks = (planData, durationWeeks) => {
  const cloned = cloneJson(planData, { weeks: [] });
  if (!Array.isArray(cloned.weeks)) {
    return { ...cloned, weeks: [] };
  }
  if (!durationWeeks) return cloned;

  return {
    ...cloned,
    weeks: cloned.weeks.slice(0, durationWeeks),
  };
};

export const buildWorkoutPlanCopyPayload = ({
  original,
  trainerId,
  targetClientId,
  title,
  durationWeeks,
} = {}) => {
  const raw = toPlainObject(original) || {};
  const sourceClientId = parseStrictPositiveInteger(raw.userId);
  const resolvedTargetClientId = parseStrictPositiveInteger(targetClientId) || sourceClientId;
  const resolvedDurationWeeks = parseCopyDurationWeeks(durationWeeks)
    || parseCopyDurationWeeks(raw.durationWeeks)
    || 4;

  return {
    userId: resolvedTargetClientId,
    trainerId,
    title: (typeof title === 'string' && title.trim().length > 0)
      ? title.trim()
      : `${raw.title} (copy)`,
    description: raw.description,
    nasmPhase: raw.nasmPhase,
    durationWeeks: resolvedDurationWeeks,
    status: 'draft',
    currentWeek: 1,
    currentDay: 1,
    planData: normalizeCopiedPlanWeeks(raw.planData, resolvedDurationWeeks),
    progressNotes: [],
    createdBy: 'trainer',
    metadata: {
      ...buildDuplicatePlanMetadata(raw),
      copiedFromClientId: sourceClientId,
      targetClientId: resolvedTargetClientId,
      copyHorizonWeeks: resolvedDurationWeeks,
    },
  };
};

export const markPlanPrimary = (plan, isPrimary) => {
  const raw = toPlainObject(plan) || {};
  const metadata = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {};
  return {
    ...raw,
    metadata: {
      ...metadata,
      isPrimaryPlan: isPrimary,
      primary: isPrimary,
    },
  };
};

const isPrimaryActivePlan = (plan) => {
  const raw = toPlainObject(plan) || {};
  const metadata = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {};
  return raw.status === 'active' && (metadata.isPrimaryPlan === true || metadata.primary === true);
};

export const selectCurrentWorkoutPlan = (fallbackPlan, plans = []) => (
  Array.isArray(plans) ? plans.find(isPrimaryActivePlan) : null
) || fallbackPlan;
