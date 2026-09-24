/**
 * SCU S4 — deterministic workout read-back verifier.
 *
 * This is a pure comparison boundary. It does not query, write, retry, deduct
 * credits, or infer absent health/training data. The daily-form writer remains
 * the owner of its transaction; this verifier only decides whether an observed
 * authorized read matches the requested workout footprint.
 */
import { normalizeCoachSemanticFootprint, verifyCoachSemanticReadback } from './coachWorkoutSemanticFootprint.mjs';

const nonnegativeNumber = (value) => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};
const isPositiveId = (value) => Number.isSafeInteger(nonnegativeNumber(value)) && Number(value) > 0;
const isIdentity = (value) => (typeof value === 'string' && value.trim().length > 0)
  || (typeof value === 'number' && isPositiveId(value));
// The persisted DailyWorkoutForm primary key is UUID. Numeric references remain
// accepted for legacy helper callers until the versioned footprint adapter lands.
const isFormId = (value) => isPositiveId(value) || (typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const normalizeSet = (set) => {
  const setNumber = nonnegativeNumber(set?.setNumber);
  const reps = nonnegativeNumber(set?.reps);
  const hasLoad = set != null && Object.hasOwn(set, 'load');
  const hasWeight = set != null && Object.hasOwn(set, 'weight');
  const load = nonnegativeNumber(hasLoad ? set.load : set?.weight);
  if (!Number.isSafeInteger(setNumber) || setNumber < 1) return null;
  if (!Number.isSafeInteger(reps) || load === null) return null;
  if (hasLoad && hasWeight && nonnegativeNumber(set.weight) !== load) return null;
  return { setNumber, reps, load };
};

const normalizeExercise = (exercise) => {
  const identity = exercise?.exerciseId ?? exercise?.exerciseKey;
  const unit = typeof exercise?.unit === 'string' ? exercise.unit.trim().toLowerCase() : '';
  if (!isIdentity(identity) || !['lb', 'kg', 'bodyweight'].includes(unit)) return null;
  if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) return null;
  const sets = exercise.sets.map(normalizeSet);
  if (sets.some((set) => !set)) return null;
  if (unit === 'bodyweight' && sets.some(set => set.load !== 0)) return null;
  if (new Set(sets.map((set) => set.setNumber)).size !== sets.length) return null;
  return { identity: String(identity), unit, sets };
};

const normalizeFootprint = (footprint) => {
  if (!footprint || !isPositiveId(footprint.actorId) || !isPositiveId(footprint.targetClientId)) return null;
  if (typeof footprint.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(footprint.date)) return null;
  const date = new Date(`${footprint.date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== footprint.date) return null;
  if (!isFormId(footprint.dailyFormId) || !isIdentity(footprint.sessionId)) return null;
  if (!isPositiveId(footprint.version)) return null;
  if (!Array.isArray(footprint.exercises) || footprint.exercises.length === 0) return null;
  const exercises = footprint.exercises.map(normalizeExercise);
  if (exercises.some((exercise) => !exercise)) return null;
  return {
    actorId: Number(footprint.actorId),
    targetClientId: Number(footprint.targetClientId),
    date: footprint.date,
    dailyFormId: String(footprint.dailyFormId),
    sessionId: String(footprint.sessionId),
    version: Number(footprint.version),
    exercises,
  };
};

/**
 * Convert the canonical writer's normalized exercise payload into the small
 * semantic object used for hashing and independent read-back. Display names,
 * notes, timestamps, and other mutable presentation fields are intentionally
 * excluded.
 */
export function buildCoachWorkoutFootprint(input = {}) {
  if (Object.hasOwn(input, 'schemaVersion') && input.schemaVersion !== 2) return null;
  return normalizeCoachSemanticFootprint({ ...input, schemaVersion: 2 });
}

const sameFootprint = (expected, observed) => JSON.stringify(expected) === JSON.stringify(observed);

const recordRefs = (observed) => {
  const version = Number.isSafeInteger(Number(observed.version)) ? Number(observed.version) : null;
  return [
    { kind: 'daily_workout_form', id: String(observed.dailyFormId), version },
    { kind: 'workout_session', id: String(observed.sessionId), version },
  ];
};

/**
 * @returns {{status:string,reasonCode:string|null,recordRefs:Array,realAffectedCount:number|null}}
 */
export function verifyCoachWorkoutReadback({ expected, observed }) {
  if (expected && Object.hasOwn(expected, 'schemaVersion') || observed && Object.hasOwn(observed, 'schemaVersion'))
    return verifyCoachSemanticReadback({ expected, observed });
  const normalizedExpected = normalizeFootprint(expected);
  if (!normalizedExpected) {
    return {
      status: 'unknown', reasonCode: 'EXPECTED_FOOTPRINT_INVALID', recordRefs: [], realAffectedCount: null,
    };
  }
  if (!observed) {
    return {
      status: 'committed_unverified', reasonCode: 'READBACK_UNAVAILABLE', recordRefs: [], realAffectedCount: null,
    };
  }
  const normalizedObserved = normalizeFootprint(observed);
  if (!normalizedObserved || !sameFootprint(normalizedExpected, normalizedObserved)) {
    return {
      status: 'unknown', reasonCode: 'READBACK_MISMATCH', recordRefs: [], realAffectedCount: null,
    };
  }
  const realAffectedCount = normalizedObserved.exercises
    .reduce((count, exercise) => count + exercise.sets.length, 0);
  return {
    status: 'verified', reasonCode: null, recordRefs: recordRefs(observed), realAffectedCount,
  };
}

export default { verifyCoachWorkoutReadback };
