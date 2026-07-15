/**
 * Workout Plan Revision Service
 * =============================
 *
 * Creates a deterministic identity for prescribed plan content. Runtime cursor
 * and completion evidence are excluded so logging a completed workout does not
 * rewrite the prescription that the completion receipt points to.
 */

import { createHash } from 'node:crypto';
const MUTABLE_PROGRESS_KEYS = new Set([
  'completed',
  'completedAt',
  'completionSource',
  'currentDay',
  'currentWeek',
  'dailyWorkoutFormId',
  'trainerNotes',
  'workoutSessionId',
]);

const normalizeCanonicalValue = (value) => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((entry) => (
    entry === undefined ? null : normalizeCanonicalValue(entry)
  ));
  if (!value || typeof value !== 'object') return null;

  return Object.keys(value)
    .filter((key) => !MUTABLE_PROGRESS_KEYS.has(key) && value[key] !== undefined)
    .sort()
    .reduce((result, key) => {
      result[key] = normalizeCanonicalValue(value[key]);
      return result;
    }, Object.create(null));
};

export const canonicalizeWorkoutPlanContent = (planData) => (
  normalizeCanonicalValue(planData && typeof planData === 'object' ? planData : {})
);

export const hashWorkoutPlanContent = (planData) => (
  createHash('sha256')
    .update(JSON.stringify(canonicalizeWorkoutPlanContent(planData)))
    .digest('hex')
);

const positiveRevision = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
};
export class WorkoutPlanRevisionConflictError extends Error {
  constructor(currentRevision) {
    super('Workout plan changed after it was loaded. Reload before saving.');
    this.name = 'WorkoutPlanRevisionConflictError';
    this.code = 'WORKOUT_PLAN_REVISION_CONFLICT';
    this.statusCode = 409;
    this.currentRevision = positiveRevision(currentRevision);
  }
}

/**
 * Resolves the next immutable prescription identity.
 *
 * A stale no-op is accepted because it writes no prescribed content. A stale
 * material mutation fails with a 409-safe domain error.
 */
export const resolveWorkoutPlanContentRevision = ({
  currentRevision,
  currentHash,
  nextPlanData,
  expectedRevision,
} = {}) => {
  const revision = positiveRevision(currentRevision);
  const nextHash = hashWorkoutPlanContent(nextPlanData);
  const hasCurrentHash = typeof currentHash === 'string' && /^[a-f0-9]{64}$/i.test(currentHash);
  const changed = !hasCurrentHash || nextHash.toLowerCase() !== currentHash.toLowerCase();

  const parsedExpectedRevision = Number(expectedRevision);
  const hasValidExpectedRevision = (
    Number.isSafeInteger(parsedExpectedRevision) && parsedExpectedRevision > 0
  );
  if (
    changed
    && hasCurrentHash
    && (!hasValidExpectedRevision || parsedExpectedRevision !== revision)
  ) {
    throw new WorkoutPlanRevisionConflictError(revision);
  }

  return {
    changed,
    revision: hasCurrentHash && changed ? revision + 1 : revision,
    hash: nextHash,
  };
};
