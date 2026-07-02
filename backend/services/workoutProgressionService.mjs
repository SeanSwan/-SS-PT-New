/**
 * workoutProgressionService.mjs
 * =============================
 * Pure micro-progression engine for generated workouts.
 *
 * Sean's training doctrine: every BUILD session should be incrementally
 * better than the last comparable session — by the SMALLEST meaningful
 * increment (one extra rep first, then the smallest plate jump), never an
 * aggressive load leap, and never into pain or very high recent RPE.
 *
 * Pure module: no DB, no model imports. Callers feed it the per-exercise
 * recent performance map built from canonical workout_logs rows.
 */

const HIGH_RPE_HOLD_THRESHOLD = 9;
const LOWER_BODY_PATTERNS = new Set(['squat', 'hinge', 'lunge', 'legs', 'lower']);

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const normalizeExerciseKeyForProgression = (name) => String(name || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

/**
 * Build a per-exercise map of the most recent logged performance from the
 * recent workout summaries (newest-first rows from workout_sessions +
 * workout_logs). Only the most recent session containing the exercise
 * counts — progression compares against the LAST comparable exposure.
 *
 * Returns: { [normalizedKey]: { exerciseName, date, sets: [{weight, reps, rpe}] } }
 */
export function buildRecentExercisePerformance(recentSessions = []) {
  const performance = {};
  for (const session of recentSessions) {
    const exercises = session?.formData?.exercises;
    if (!Array.isArray(exercises)) continue;
    for (const set of exercises) {
      const key = normalizeExerciseKeyForProgression(set?.exerciseName);
      if (!key) continue;
      if (!performance[key]) {
        performance[key] = { exerciseName: set.exerciseName, date: session.date, sets: [] };
      }
      // Rows are newest-session-first; only collect sets from the first
      // (most recent) session that contains this exercise.
      if (performance[key].date !== session.date) continue;
      performance[key].sets.push({
        weight: toPositiveNumber(set.weight),
        reps: toPositiveNumber(set.reps),
        rpe: toPositiveNumber(set.rpe),
      });
    }
  }
  return performance;
}

const bestSet = (sets = []) => {
  let top = null;
  for (const set of sets) {
    if (!set?.weight || !set?.reps) continue;
    if (!top || set.weight > top.weight || (set.weight === top.weight && set.reps > top.reps)) {
      top = set;
    }
  }
  return top;
};

const maxRpe = (sets = []) => sets.reduce(
  (max, set) => (set?.rpe && set.rpe > max ? set.rpe : max),
  0,
);

export const smallestLoadIncrementFor = (exercise) => (
  LOWER_BODY_PATTERNS.has(String(exercise?.movementPattern || exercise?.category || '').toLowerCase())
    ? 5
    : 2.5
);

const parsePhaseRepMax = (repsRange) => {
  const match = String(repsRange || '').match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) return { min: Number(match[1]), max: Number(match[2]) };
  const single = Number(repsRange);
  return Number.isFinite(single) && single > 0
    ? { min: single, max: single }
    : { min: 8, max: 12 };
};

const painTouchesExercise = (exercise, painWarnings = []) => {
  const muscles = new Set((exercise?.muscles || []).map((m) => String(m).toLowerCase()));
  return painWarnings.some((warning) => {
    const region = String(warning?.bodyRegion || warning || '').toLowerCase();
    return region && muscles.has(region);
  });
};

/**
 * Compute the micro-progression recommendation for one generated exercise.
 *
 * Returns null when there is no comparable history (caller keeps the
 * phase %1RM recommendation). Otherwise returns:
 *   { action: 'add_rep'|'add_load'|'hold', weight, targetReps, basis, note }
 */
export function computeMicroProgression(exercise, lastPerformance, options = {}) {
  if (!lastPerformance || !Array.isArray(lastPerformance.sets)) return null;
  const top = bestSet(lastPerformance.sets);
  if (!top) return null;

  const { painWarnings = [], readinessLevel = null, phaseReps } = options;
  const repRange = parsePhaseRepMax(phaseReps ?? exercise?.reps);
  const recentTopRpe = maxRpe(lastPerformance.sets);

  if (painTouchesExercise(exercise, painWarnings)) {
    return {
      action: 'hold',
      weight: top.weight,
      targetReps: top.reps,
      basis: `last: ${top.weight} lb x ${top.reps}`,
      note: 'Hold load — reported pain touches this movement; keep quality, no progression.',
    };
  }

  if (recentTopRpe >= HIGH_RPE_HOLD_THRESHOLD || readinessLevel === 'low') {
    return {
      action: 'hold',
      weight: top.weight,
      targetReps: top.reps,
      basis: `last: ${top.weight} lb x ${top.reps} @ RPE ${recentTopRpe || '?'}`,
      note: 'Hold load — recent effort was near max or readiness is low; repeat and own it.',
    };
  }

  if (top.reps < repRange.max) {
    return {
      action: 'add_rep',
      weight: top.weight,
      targetReps: top.reps + 1,
      basis: `last: ${top.weight} lb x ${top.reps}`,
      note: `Progress by one rep at ${top.weight} lb (${top.reps} -> ${top.reps + 1}).`,
    };
  }

  const increment = smallestLoadIncrementFor(exercise);
  return {
    action: 'add_load',
    weight: top.weight + increment,
    targetReps: repRange.min,
    basis: `last: ${top.weight} lb x ${top.reps} (top of rep range)`,
    note: `Add the smallest jump: +${increment} lb to ${top.weight + increment} lb, reset to ${repRange.min} reps.`,
  };
}

/**
 * Apply micro-progression across a generated workout's exercises in place.
 * Returns the count of exercises that received a history-based target.
 */
export function applyMicroProgressionToExercises(exercises, recentExercisePerformance, options = {}) {
  if (!recentExercisePerformance) return 0;
  let progressed = 0;
  for (const exercise of exercises || []) {
    const key = normalizeExerciseKeyForProgression(exercise?.exerciseKey || exercise?.name);
    const progression = computeMicroProgression(
      exercise,
      recentExercisePerformance[key],
      { ...options, phaseReps: exercise?.reps },
    );
    if (!progression) continue;
    exercise.progression = progression;
    exercise.recommendedWeightMin = progression.weight;
    exercise.recommendedWeightMax = progression.weight;
    exercise.progressionNote = progression.note;
    progressed += 1;
  }
  return progressed;
}
