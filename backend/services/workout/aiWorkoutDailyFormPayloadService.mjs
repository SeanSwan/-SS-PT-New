/**
 * AI Workout Daily Form Payload Service
 * =====================================
 * Validates and normalizes Swan Coach workout-log payloads before the
 * canonical DailyWorkoutForm adapter writes diary, billing, and chart truth.
 */

export class AiWorkoutDailyFormError extends Error {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'AiWorkoutDailyFormError';
    this.code = code;
  }
}

export const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parseNonNegativeInteger = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const toIsoDateOnly = (value) => {
  if (!value) return new Date().toISOString().split('T')[0];
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().split('T')[0] : null;
};

export const normalizeText = (value, fallback = '') => {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim());
};

const exerciseMetadata = (exercise) => {
  const out = {};
  for (const key of ['category', 'exerciseFamily', 'movementPattern', 'nasmMovementPattern', 'bodyPartCategory']) {
    const value = normalizeText(exercise?.[key], null);
    if (value) out[key] = value;
  }
  for (const key of ['muscleGroups', 'tags']) {
    const values = normalizeStringArray(exercise?.[key]);
    if (values.length > 0) out[key] = values;
  }
  return out;
};

export const normalizeIntensity = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new AiWorkoutDailyFormError('intensity must be between 1 and 10');
  }
  return parsed;
};

const normalizeSet = (set, setNumber) => ({
  setNumber,
  reps: parseNonNegativeInteger(set?.reps, 0) ?? 0,
  weight: Number.isFinite(Number(set?.weight)) && Number(set?.weight) >= 0
    ? Number(set.weight)
    : 0,
  tempo: normalizeText(set?.tempo, null),
  restTime: parseNonNegativeInteger(set?.restTime ?? set?.rest ?? set?.restSeconds, null),
  rpe: set?.rpe === undefined || set?.rpe === null || set?.rpe === ''
    ? null
    : Number(set.rpe),
  notes: normalizeText(set?.notes, null),
});

export function normalizeAiExercises(exercises) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new AiWorkoutDailyFormError('exercises must be a non-empty array');
  }
  return exercises.map((exercise) => {
    const exerciseName = normalizeText(exercise?.exerciseName ?? exercise?.name);
    if (!exerciseName) {
      throw new AiWorkoutDailyFormError('Each exercise needs a name');
    }
    const exerciseNote = normalizeText(
      exercise?.exerciseNote ?? exercise?.performanceNotes,
      null,
    );
    const sourceSets = Array.isArray(exercise?.sets)
      ? exercise.sets
      : Array.from({ length: Math.max(1, Number(exercise?.sets) || 1) }, () => ({
          reps: exercise?.reps,
          weight: exercise?.weight,
          tempo: exercise?.tempo,
          restTime: exercise?.restSeconds ?? exercise?.restTime ?? exercise?.rest,
          rpe: exercise?.rpe,
          notes: exercise?.notes,
        }));

    if (sourceSets.length === 0) {
      throw new AiWorkoutDailyFormError(`Exercise "${exerciseName}" needs at least one set`);
    }
    return {
      exerciseName,
      exerciseNote,
      ...exerciseMetadata(exercise),
      sets: sourceSets.map((set, index) => normalizeSet(set, index + 1)),
    };
  });
}

export function buildWorkoutRows(exercises, sessionId) {
  return exercises.flatMap((exercise) => exercise.sets.map((set) => ({
    sessionId,
    exerciseName: exercise.exerciseName,
    setNumber: set.setNumber,
    reps: set.reps,
    weight: set.weight,
    tempo: set.tempo,
    rest: set.restTime,
    rpe: set.rpe,
    notes: set.notes,
    exerciseNote: exercise.exerciseNote,
  })));
}
