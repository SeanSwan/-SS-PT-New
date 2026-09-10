/**
 * SCU S8a — deterministic progress evidence.
 *
 * This calculator accepts already-authorized, verified workout records. It
 * excludes voided/unverified rows and keeps units separate, so a planner never
 * receives a fabricated trend from incomparable loads or missing history.
 */
const asPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const emptyEvidence = () => ({
  status: 'unavailable',
  completedSessionCount: 0,
  volumeByExercise: {},
  comparability: {},
  adherence: null,
  recordRefs: [],
  missingInputs: ['verified_workout_records'],
});

export function buildCoachProgressEvidence({ sessions, scheduledCount = null } = {}) {
  const rows = Array.isArray(sessions) ? sessions : [];
  const valid = rows.filter((session) => (
    session?.status === 'completed'
    && session?.verified === true
    && session?.voided !== true
  ));
  if (valid.length === 0) return emptyEvidence();

  // Exercise/library keys are data, including names that collide with Object's
  // prototype. Maps prevent inherited reads and writes during accumulation.
  const volumes = new Map();
  const unitsByExercise = new Map();
  for (const session of valid) {
    for (const exercise of Array.isArray(session.exercises) ? session.exercises : []) {
      const exerciseKey = String(exercise?.exerciseKey || '').trim();
      const unit = String(exercise?.unit || '').trim().toLowerCase();
      if (!exerciseKey || !unit) continue;
      const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
      const volume = sets.reduce((total, set) => {
        const reps = asPositiveNumber(set?.reps);
        const load = asPositiveNumber(set?.load);
        return reps === null || load === null ? total : total + (reps * load);
      }, 0);
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
  return {
    status: 'verified',
    completedSessionCount: valid.length,
    volumeByExercise: Object.fromEntries([...volumes].map(([key, units]) => [key, Object.fromEntries(units)])),
    comparability: Object.fromEntries([...unitsByExercise].map(([key, units]) => [
      key,
      units.size > 1 ? 'mixed_units' : 'comparable',
    ])),
    adherence: boundedScheduled === null
      ? null
      : { scheduledCount: boundedScheduled, completedCount: valid.length, rate: valid.length / boundedScheduled },
    recordRefs: valid.map((session) => String(session.id || '')).filter(Boolean),
    missingInputs: missingScheduleMatches ? ['scheduled_session_matches'] : [],
  };
}
