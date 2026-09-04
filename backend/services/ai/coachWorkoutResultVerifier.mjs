/**
 * SCU S4 — deterministic workout read-back verifier.
 *
 * This is a pure comparison boundary. It does not query, write, retry, deduct
 * credits, or infer absent health/training data. The daily-form writer remains
 * the owner of its transaction; this verifier only decides whether an observed
 * authorized read matches the requested workout footprint.
 */

const isPositiveId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;

const normalizeSet = (set) => {
  const setNumber = Number(set?.setNumber);
  const reps = Number(set?.reps);
  const load = Number(set?.load ?? set?.weight);
  if (!Number.isSafeInteger(setNumber) || setNumber < 1) return null;
  if (!Number.isFinite(reps) || reps < 0 || !Number.isFinite(load) || load < 0) return null;
  return { setNumber, reps, load };
};

const normalizeExercise = (exercise) => {
  const identity = exercise?.exerciseId ?? exercise?.exerciseKey ?? exercise?.exerciseName;
  const unit = typeof exercise?.unit === 'string' ? exercise.unit.trim().toLowerCase() : '';
  if (identity === undefined || identity === null || !String(identity).trim() || !unit) return null;
  if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) return null;
  const sets = exercise.sets.map(normalizeSet);
  if (sets.some((set) => !set)) return null;
  return { identity: String(identity), unit, sets };
};

const normalizeFootprint = (footprint) => {
  if (!footprint || !isPositiveId(footprint.actorId) || !isPositiveId(footprint.targetClientId)) return null;
  if (typeof footprint.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(footprint.date)) return null;
  if (!isPositiveId(footprint.dailyFormId) || !String(footprint.sessionId || '').trim()) return null;
  if (!Array.isArray(footprint.exercises) || footprint.exercises.length === 0) return null;
  const exercises = footprint.exercises.map(normalizeExercise);
  if (exercises.some((exercise) => !exercise)) return null;
  return {
    actorId: Number(footprint.actorId),
    targetClientId: Number(footprint.targetClientId),
    date: footprint.date,
    dailyFormId: String(footprint.dailyFormId),
    sessionId: String(footprint.sessionId),
    exercises,
  };
};

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
