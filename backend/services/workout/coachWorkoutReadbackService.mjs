/**
 * Canonical workout read-back in one PostgreSQL read-only snapshot.
 * The supplied footprint locates rows; it never supplies observed field values.
 * WorkoutLog lacks canonical identity/unit, so validate its complete counted
 * projection against the form JSON. No domain writes, retries or partial reads.
 */
import { normalizeCoachSemanticFootprint, validCoachDate } from '../ai/coachWorkoutSemanticFootprint.mjs';
const valueOf = (row, key) => row?.[key] ?? row?.dataValues?.[key];
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
// Shared with precommit validation; both paths use the same real DATE projection.
export function sessionDay(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  if (validCoachDate(value)) return value;
  if (typeof value !== 'string' || !validCoachDate(value.slice(0, 10))
    || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}
const tuple = (name, ordinal, reps, weight) => JSON.stringify([name, ordinal, reps, weight]);
// Exact counted projection, also used to refuse altered write results before COMMIT.
export function logProjectionMatches(logs, rawExercises, semanticExercises, sessionId) {
  const wanted = new Map();
  for (const [index, exercise] of semanticExercises.entries()) {
    const name = rawExercises[index]?.exerciseName;
    if (typeof name !== 'string' || !name.trim() || name.length > 255) return false;
    for (const set of exercise.sets) {
      const key = tuple(name, set.setNumber, set.reps, set.load);
      wanted.set(key, (wanted.get(key) || 0) + 1);
    }
  }
  const ids = new Set();
  for (const row of logs) {
    const id = valueOf(row, 'id'), ordinal = valueOf(row, 'setNumber');
    const reps = valueOf(row, 'reps'), weight = valueOf(row, 'weight');
    if (!Number.isSafeInteger(id) || id < 1 || ids.has(id) || valueOf(row, 'sessionId') !== sessionId
      || !Number.isSafeInteger(ordinal) || ordinal < 1 || !Number.isSafeInteger(reps)
      || reps < 0 || !numeric(weight)) return false;
    ids.add(id);
    const key = tuple(valueOf(row, 'exerciseName'), ordinal, reps, weight);
    if (!wanted.has(key)) return false;
    const remaining = wanted.get(key) - 1;
    if (remaining === 0) wanted.delete(key); else wanted.set(key, remaining);
  }
  return wanted.size === 0;
}

export async function readCoachWorkoutFootprint({ models, footprint, intentId, requestHash, proposalId }) {
  const identity = { intentId, requestHash, proposalId };
  const unavailable = { found: false, ...identity, observed: null };
  const Form = models?.DailyWorkoutForm, Session = models?.WorkoutSession, Log = models?.WorkoutLog;
  const db = models?.sequelize || Form?.sequelize;
  const expected = normalizeCoachSemanticFootprint(footprint);
  if (!expected || !db?.transaction || !db?.query || !Form?.findByPk || !Session?.findByPk || !Log?.findAll
    || Form.sequelize !== db || Session.sequelize !== db || Log.sequelize !== db) return unavailable;
  try {
    return await db.transaction({ readOnly: true, isolationLevel: 'REPEATABLE READ' }, async transaction => {
      // Installed Sequelize v6 ignores readOnly for PostgreSQL SQL establishment.
      // The explicit setting is verified with SHOW transaction_read_only in DB tests.
      await db.query('SET TRANSACTION READ ONLY', { transaction });
      const form = await Form.findByPk(expected.dailyFormId, { transaction });
      const session = await Session.findByPk(expected.sessionId, { transaction });
      const missing = { found: true, ...identity, observed: null };
      if (!form || !session) return missing;
      const formId = valueOf(form, 'id'), sessionId = valueOf(session, 'id');
      const actorId = valueOf(form, 'trainerId'), clientId = valueOf(form, 'clientId');
      const date = valueOf(form, 'date'), exercises = valueOf(form, 'formData')?.exercises;
      if (formId !== expected.dailyFormId || sessionId !== expected.sessionId
        || valueOf(form, 'sessionId') !== sessionId || clientId !== valueOf(session, 'userId')
        || actorId !== valueOf(session, 'trainerId') || clientId !== expected.targetClientId
        || actorId !== expected.actorId || !validCoachDate(date) || sessionDay(valueOf(session, 'date')) !== date)
        return missing;
      const observed = normalizeCoachSemanticFootprint({
        schemaVersion: 2, actorId, targetClientId: clientId, date, dailyFormId: formId, sessionId, exercises,
      });
      if (!observed) return missing;
      const logs = await Log.findAll({ where: { sessionId }, order: [['id', 'ASC']], limit: 20001, transaction });
      if (!Array.isArray(logs) || !logProjectionMatches(logs, exercises, observed.exercises, sessionId)) return missing;
      return { found: true, ...identity, observed };
    });
  } catch { return unavailable; }
}
export default { readCoachWorkoutFootprint };
