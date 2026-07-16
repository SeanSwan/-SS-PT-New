/**
 * ============================================================================
 * FILE: workoutPlanRevisionService.mjs
 * PURPOSE: Produce deterministic revisions and hashes for prescribed plan content.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Canonicalizes the prescription portion of planData,
 * hashes it with SHA-256, and resolves optimistic revision changes. Runtime
 * completion and cursor evidence is intentionally excluded from the identity.
 * HOW IT FITS IN THE APP: Plan writers -> revision service -> WorkoutPlan identity.
 * KEY DECISIONS: Stable key sorting makes hashes deterministic; null-prototype
 * objects keep hostile keys inert; stale material writes fail with HTTP 409.
 * NASM PROTOCOL CONTEXT: Preserves the exact phase/exercise prescription that
 * completed-workout receipts and progress projections must reference.
 */

import { createHash } from 'node:crypto';

// SECTION: Canonical prescription normalization
// PURPOSE: Remove mutable progress evidence and stabilize object key order.
// WHY: The same prescription must hash identically across writers and runtimes.
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

/**
 * Canonicalizes prescribed workout-plan data for deterministic serialization.
 * @param {unknown} planData Raw JSON-compatible workout-plan content.
 * @returns {unknown} Stable content with mutable progress evidence removed.
 */
export const canonicalizeWorkoutPlanContent = (planData) => (
  normalizeCanonicalValue(planData && typeof planData === 'object' ? planData : {})
);

/**
 * Computes the lowercase SHA-256 identity of prescribed workout-plan content.
 * @param {unknown} planData Raw JSON-compatible workout-plan content.
 * @returns {string} A 64-character lowercase hexadecimal digest.
 */
export const hashWorkoutPlanContent = (planData) => (
  createHash('sha256')
    .update(JSON.stringify(canonicalizeWorkoutPlanContent(planData)))
    .digest('hex')
);

const positiveRevision = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
};

/**
 * Domain error returned when a material plan write targets a stale revision.
 */
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
 * @param {object} input Current identity, next plan data, and expected revision.
 * @returns {{changed: boolean, revision: number, hash: string}} Resolved identity.
 * @throws {WorkoutPlanRevisionConflictError} For stale or missing mutation intent.
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
