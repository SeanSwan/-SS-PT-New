/** Strict v2 semantic identity for the canonical workout diary.
 * Models have no integer content revision. This projection binds actual UUIDs,
 * owners, exercise instances and exact set values; display/free text is excluded.
 * Pure validation only: library resolution, authorization and persistence are callers.
 */
import { strictCoachWorkoutInput } from '../workout/coachStrictWorkoutPayload.mjs';
const uuid = value => typeof value === 'string'
  && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const positive = value => (typeof value === 'number' || typeof value === 'string')
  && /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
const canonicalId = value => (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
  || (typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 128);
export const validCoachDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export function normalizeCoachSemanticFootprint(input) {
  if (input?.schemaVersion !== 2 || !positive(input.actorId) || !positive(input.targetClientId)
    || !uuid(input.dailyFormId) || !uuid(input.sessionId) || !validCoachDate(input.date)) return null;
  try {
    // A second valid identifier cannot launder a malformed provided identifier.
    // The legacy normalizer spreads unknown fields; validate presence, not truthiness.
    if (!Array.isArray(input.exercises) || input.exercises.some(exercise =>
      !exercise || ['exerciseId', 'exerciseKey'].some(key =>
        Object.hasOwn(exercise, key) && !canonicalId(exercise[key])))) return null;
    const validated = strictCoachWorkoutInput(input.exercises);
    const exercises = validated.map((exercise, index) => {
      const original = input.exercises[index];
      return {
        ...(exercise.exerciseId ? { exerciseId: typeof original.exerciseId === 'number'
          ? original.exerciseId : exercise.exerciseId } : {}),
        ...(exercise.exerciseKey ? { exerciseKey: typeof original.exerciseKey === 'number'
          ? original.exerciseKey : exercise.exerciseKey } : {}),
        exerciseInstanceId: exercise.exerciseInstanceId, unit: exercise.unit,
        sets: exercise.sets.map(set => ({ setNumber: set.setNumber, reps: set.reps, load: set.weight })),
      };
    });
    return { schemaVersion: 2, actorId: Number(input.actorId), targetClientId: Number(input.targetClientId),
      date: input.date, dailyFormId: input.dailyFormId.toLowerCase(), sessionId: input.sessionId.toLowerCase(), exercises };
  } catch { return null; }
}

export function verifyCoachSemanticReadback({ expected, observed }) {
  const wanted = normalizeCoachSemanticFootprint(expected);
  const unavailable = reasonCode => ({ status: 'unknown', reasonCode, recordRefs: [], realAffectedCount: null });
  if (!wanted) return unavailable('EXPECTED_FOOTPRINT_INVALID');
  if (!observed) return { ...unavailable('READBACK_UNAVAILABLE'), status: 'committed_unverified' };
  const actual = normalizeCoachSemanticFootprint(observed);
  if (!actual || JSON.stringify(wanted) !== JSON.stringify(actual)) return unavailable('READBACK_MISMATCH');
  return { status: 'verified', reasonCode: null,
    recordRefs: [{ kind: 'daily_workout_form', id: actual.dailyFormId }, { kind: 'workout_session', id: actual.sessionId }],
    realAffectedCount: actual.exercises.reduce((n, exercise) => n + exercise.sets.length, 0) };
}
