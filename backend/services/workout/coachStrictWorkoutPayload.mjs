/**
 * Strict Coach workout payload boundary.
 * Used only by the versioned reviewed Coach path; legacy logger normalization
 * remains unchanged. This validates resolved data, not library ownership.
 */
const identifier = (value) => {
  if (typeof value !== 'string' && !(Number.isSafeInteger(value) && value > 0)) return null;
  const text = String(value).trim();
  return text && text.length <= 128 ? text : null;
};
const numeric = (value) => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export function strictCoachWorkoutInput(exercises, ErrorType = Error) {
  const refuse = (message, code) => {
    const error = new ErrorType(message, code);
    error.code = code;
    throw error;
  };
  if (!Array.isArray(exercises) || exercises.length === 0 || exercises.length > 100)
    refuse('Provide between 1 and 100 resolved exercises.', 'WORKOUT_EXERCISES_INVALID');
  const instances = new Set();
  return exercises.map((exercise) => {
    const exerciseId = identifier(exercise?.exerciseId);
    const exerciseKey = identifier(exercise?.exerciseKey);
    if (!exerciseId && !exerciseKey)
      refuse('Resolve an exercise from the exercise library.', 'WORKOUT_EXERCISE_ID_REQUIRED');
    const unit = typeof exercise?.unit === 'string' ? exercise.unit.trim().toLowerCase() : '';
    if (!['lb', 'kg', 'bodyweight'].includes(unit))
      refuse('Choose an explicit supported load unit.', 'WORKOUT_UNIT_REQUIRED');
    const exerciseInstanceId = identifier(exercise?.exerciseInstanceId);
    if (!exerciseInstanceId || instances.has(exerciseInstanceId))
      refuse('Each exercise instance needs a unique identity.', 'WORKOUT_EXERCISE_INSTANCE_REQUIRED');
    instances.add(exerciseInstanceId);
    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0 || exercise.sets.length > 200)
      refuse('Provide between 1 and 200 explicit sets.', 'WORKOUT_SETS_INVALID');
    const ordinals = new Set();
    const sets = exercise.sets.map((set) => {
      const ordinal = numeric(set?.setNumber);
      if (!Number.isSafeInteger(ordinal) || ordinal < 1 || ordinals.has(ordinal))
        refuse('Set numbers must be unique positive integers.', 'WORKOUT_SET_ORDER_INVALID');
      ordinals.add(ordinal);
      const reps = numeric(set?.reps);
      if (!Number.isSafeInteger(reps))
        refuse('Provide the exact completed repetition count.', 'WORKOUT_REPS_INVALID');
      const hasWeight = Object.hasOwn(set, 'weight'), hasLoad = Object.hasOwn(set, 'load');
      const weight = numeric(hasWeight ? set.weight : set.load);
      if ((!hasWeight && !hasLoad) || weight === null ||
          (hasLoad && numeric(set.load) !== weight) || (unit === 'bodyweight' && weight !== 0))
        refuse('Provide a valid nonnegative load without conflicting values.', 'WORKOUT_LOAD_INVALID');
      return { ...set, setNumber: ordinal, reps, weight };
    });
    return { ...exercise, ...(exerciseId ? { exerciseId } : {}),
      ...(exerciseKey ? { exerciseKey } : {}), exerciseInstanceId, unit, sets };
  });
}
