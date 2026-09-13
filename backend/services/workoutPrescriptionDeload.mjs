const DEFAULT_DELOAD_FACTOR = 0.7;
export const DELOAD_POLICY_VERSION = 'H20-volume-v1';

function reduceNumeric(value, factor) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.max(1, Math.floor(value * factor));
  }
  if (typeof value !== 'string') return null;
  const single = value.match(/^\s*(\d+)\s*$/);
  if (single) return String(Math.max(1, Math.floor(Number(single[1]) * factor)));
  const range = value.match(/^\s*(\d+)\s*([-–])\s*(\d+)\s*$/);
  if (!range) return null;
  const min = Math.max(1, Math.floor(Number(range[1]) * factor));
  const max = Math.max(min, Math.floor(Number(range[3]) * factor));
  return `${min}${range[2]}${max}`;
}

function applySetReduction(exercise, factor) {
  const raw = exercise.sets;
  const sets = Number(raw);
  if (Number.isInteger(sets) && sets >= 2) {
    const nextSets = Math.max(1, Math.floor(sets * factor));
    // A numeric-string prescription ("4") must not flip type on save: the
    // reduction writes back the same type it read (lane F finding).
    const nextValue = typeof raw === 'string' ? String(nextSets) : nextSets;
    return {
      ...exercise,
      sets: nextValue,
      setScheme: exercise.reps != null ? `${nextSets}x${exercise.reps}` : exercise.setScheme,
      deload: {
        policyVersion: DELOAD_POLICY_VERSION,
        applied: nextSets !== sets,
        reason: nextSets !== sets ? 'sets_reduced' : 'integer_floor_no_change',
        before: { sets: raw },
        after: { sets: nextValue },
      },
    };
  }
  return null;
}

function applyRepOrDurationReduction(exercise, factor) {
  const repFields = ['reps', 'repGoal'];
  for (const field of repFields) {
    const reduced = reduceNumeric(exercise[field], factor);
    if (reduced === null) continue;
    const next = { ...exercise, [field]: reduced };
    if (field === 'reps' && exercise.repGoal != null) {
      const reducedGoal = reduceNumeric(exercise.repGoal, factor);
      if (reducedGoal !== null) next.repGoal = reducedGoal;
    }
    if (field === 'reps' && exercise.sets != null) {
      next.setScheme = `${exercise.sets}x${reduced}`;
    }
    next.deload = {
      policyVersion: DELOAD_POLICY_VERSION,
      applied: String(reduced) !== String(exercise[field]),
      reason: String(reduced) !== String(exercise[field]) ? 'reps_reduced' : 'integer_floor_no_change',
      before: { [field]: exercise[field] },
      after: { [field]: reduced },
    };
    return next;
  }

  for (const field of ['durationSec', 'durationSeconds', 'workSeconds']) {
    const reduced = reduceNumeric(exercise[field], factor);
    if (reduced === null) continue;
    const next = { ...exercise, [field]: reduced };
    next.deload = {
      policyVersion: DELOAD_POLICY_VERSION,
      applied: String(reduced) !== String(exercise[field]),
      reason: String(reduced) !== String(exercise[field]) ? 'duration_reduced' : 'integer_floor_no_change',
      before: { [field]: exercise[field] },
      after: { [field]: reduced },
    };
    return next;
  }

  return {
    ...exercise,
    deload: {
      policyVersion: DELOAD_POLICY_VERSION,
      applied: false,
      reason: 'unsupported_prescription',
      before: {},
      after: {},
    },
  };
}

export function applyVolumeDeloadPrescription(exercises = [], factor = DEFAULT_DELOAD_FACTOR) {
  const safeFactor = Number.isFinite(factor) && factor > 0 && factor < 1
    ? factor
    : DEFAULT_DELOAD_FACTOR;
  // A default parameter only covers `undefined`, not an explicit null. The
  // deload-week caller can pass null, and `null.map` threw
  // "Cannot read properties of null" on that path.
  const list = Array.isArray(exercises) ? exercises : [];
  return list.map((exercise) => (
    applySetReduction(exercise, safeFactor) || applyRepOrDurationReduction(exercise, safeFactor)
  ));
}
