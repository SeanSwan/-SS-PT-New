/**
 * SCU S8a — deterministic progress evidence.
 *
 * This calculator accepts already-authorized, verified workout records. It
 * excludes voided/unverified rows and keeps units separate, so a planner never
 * receives a fabricated trend from incomparable loads or missing history.
 *
 * G07 status semantics (empty != unavailable, null != zero):
 * - 'unavailable'         no source rows were supplied at all (reader context missing)
 * - 'empty'               a real, confirmed zero: zero logged sessions
 * - 'no_verified_records' rows exist but none completed/verified
 * - 'verified'            at least one verified completed session
 */
const asPositiveNumber = (value) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const emptyEvidence = (status, missingInputs) => ({
  status,
  completedSessionCount: 0,
  volumeByExercise: {},
  comparability: {},
  adherence: null,
  recordRefs: [],
  missingInputs,
});

export function buildCoachProgressEvidence({ sessions, scheduledCount = null } = {}) {
  if (!Array.isArray(sessions)) return emptyEvidence('unavailable', ['verified_workout_records']);
  const valid = sessions.filter((session) => (
    session?.status === 'completed'
    && session?.verified === true
    && session?.voided !== true
  ));
  if (valid.length === 0) {
    return sessions.length === 0
      ? emptyEvidence('empty', [])
      : emptyEvidence('no_verified_records', ['verified_workout_records']);
  }

  // Exercise/library keys are data, including names that collide with Object's
  // prototype. Maps prevent inherited reads and writes during accumulation.
  const volumes = new Map();
  const unitsByExercise = new Map();
  const missingInputs = new Set();
  for (const session of valid) {
    for (const exercise of Array.isArray(session.exercises) ? session.exercises : []) {
      const exerciseKey = String(exercise?.exerciseKey || '').trim();
      const unit = String(exercise?.unit || '').trim().toLowerCase();
      if (!exerciseKey || !unit) continue;
      const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
      let volume = 0;
      let recordedSets = 0;
      for (const set of sets) {
        const reps = asPositiveNumber(set?.reps);
        const load = asPositiveNumber(set?.load);
        if (reps === null || load === null || !Number.isFinite(reps * load)) {
          missingInputs.add('workout_set_values');
          continue;
        }
        volume += reps * load;
        recordedSets += 1;
      }
      if (recordedSets === 0) {
        missingInputs.add('workout_set_values');
        continue;
      }
      if (!volumes.has(exerciseKey)) volumes.set(exerciseKey, new Map());
      const units = volumes.get(exerciseKey);
      units.set(unit, (units.get(unit) || 0) + volume);
      if (!unitsByExercise.has(exerciseKey)) unitsByExercise.set(exerciseKey, new Set());
      unitsByExercise.get(exerciseKey).add(unit);
    }
  }

  const scheduled = scheduledCount == null ? null : asPositiveNumber(scheduledCount);
  // A count mismatch needs source schedule membership, not an invented denominator.
  const missingScheduleMatches = scheduled !== null && scheduled < valid.length;
  const boundedScheduled = missingScheduleMatches ? null : scheduled;
  if (missingScheduleMatches) missingInputs.add('scheduled_session_matches');
  return {
    status: 'verified',
    completedSessionCount: valid.length,
    volumeByExercise: Object.fromEntries([...volumes].map(([key, units]) => [key, Object.fromEntries(units)])),
    comparability: Object.fromEntries([...unitsByExercise].map(([key, units]) => [
      key,
      units.size > 1 ? 'mixed_units' : 'comparable',
    ])),
    // Zero planned sessions is "no schedule data", not a 0% rate.
    adherence: boundedScheduled === null || boundedScheduled === 0
      ? null
      : { scheduledCount: boundedScheduled, completedCount: valid.length, rate: valid.length / boundedScheduled },
    recordRefs: valid.map((session) => String(session.id || '')).filter(Boolean),
    missingInputs: [...missingInputs],
    ...(missingInputs.has('workout_set_values') ? { completeness: 'partial' } : {}),
  };
}
