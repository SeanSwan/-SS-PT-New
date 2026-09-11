/**
 * G07/T33 — source-linked reader for coach progress evidence.
 *
 * Joins workout_sessions -> workout_exercises -> sets (model-verified schema:
 * WorkoutSession.mjs tableName 'workout_sessions' with status ENUM
 * planned|in_progress|completed|skipped|cancelled; WorkoutExercise.mjs
 * 'workout_exercises' with exercise_id; Set.mjs 'sets' with reps_completed /
 * weight_used) and maps real rows onto the S8a calculator contract.
 *
 * Honesty rules:
 * - verification is DERIVED only from the real status enum; there is no
 *   verified/voided column and none is invented.
 * - the weight unit comes from the client's latest body_measurements row;
 *   when absent the unit is '' and 'weight_unit' lands in missingInputs —
 *   volume buckets for unitless exercises are skipped by the calculator
 *   instead of guessing lbs vs kg.
 * - the scheduled denominator counts status 'planned' sessions in the same
 *   window; zero planned sessions -> null (no invented adherence rate).
 * - rows are read fresh on every call; nothing here is cached.
 */

const DEFAULT_WINDOW_DAYS = 28;
const SESSION_ROW_LIMIT = 240;

const joinedSessionSql = (sinceIso) => [
  'SELECT ws.id AS session_id, ws.status, ws.date,',
  '       we.id AS workout_exercise_id, we.exercise_id,',
  '       s.id AS set_id, s.reps_completed, s.weight_used',
  ' FROM workout_sessions ws',
  ' JOIN workout_exercises we ON we."workoutSessionId" = ws.id',
  ' JOIN sets s ON s."workoutExerciseId" = we.id',
  " WHERE ws.\"userId\" = :userId AND ws.status IN ('in_progress', 'completed', 'skipped', 'cancelled')",
  ' AND ws.date >= :sinceDate',
  ' ORDER BY ws.date DESC',
  // LIMIT+1 pattern: an extra row proves truncation so partial evidence is
  // flagged ('session_row_cap') instead of silently wrong.
  ` LIMIT ${SESSION_ROW_LIMIT + 1}`,
].join('\n');

const plannedSql = [
  'SELECT ws.id AS session_id FROM workout_sessions ws',
  " WHERE ws.\"userId\" = :userId AND ws.status = 'planned' AND ws.date >= :sinceDate",
].join('\n');

const unitSql = [
  'SELECT bm."weightUnit" FROM body_measurements bm',
  ' WHERE bm."userId" = :userId AND bm."weightUnit" IS NOT NULL',
  ' ORDER BY bm."measurementDate" DESC, bm."createdAt" DESC',
  ' LIMIT 1',
].join('\n');

/** Statuses that mean "logged but not a verified completed session". */
const NON_COMPLETIONS = new Set(['in_progress', 'skipped', 'cancelled']);

export async function readCoachProgressRecords({ sequelize, userId, windowDays: windowDaysInput, deps = {} } = {}) {
  const query = deps.query
    ?? (async (sql, options) => {
      const [rows] = await sequelize.query(sql, { ...options, type: sequelize.QueryTypes?.SELECT });
      return Array.isArray(rows) ? rows : [];
    });
  if (!sequelize || !Number(userId)) {
    return { sessions: [], scheduledCount: null, missingInputs: ['authorized_reader_context'] };
  }

  const windowDays = Number.isSafeInteger(Number(windowDaysInput)) && Number(windowDaysInput) > 0
    ? Number(windowDaysInput)
    : DEFAULT_WINDOW_DAYS;
  const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const options = { replacements: { userId: Number(userId), sinceDate } };

  const [flatRows, plannedRows, unitRows] = await Promise.all([
    query(joinedSessionSql(sinceDate), options),
    query(plannedSql, options),
    query(unitSql, options),
  ]);

  const weightUnit = String(unitRows?.[0]?.weightUnit || '').trim().toLowerCase();
  const missingInputs = [];
  if (!weightUnit) missingInputs.push('weight_unit');

  // Truncation honesty: drop the probe row and mark the evidence partial.
  let joinedRows = flatRows;
  if (joinedRows.length > SESSION_ROW_LIMIT) {
    joinedRows = joinedRows.slice(0, SESSION_ROW_LIMIT);
    missingInputs.push('session_row_cap');
  }

  // Assemble flat joined rows -> calculator contract. Sets without both a
  // recorded rep count and load are carried as-is; the calculator treats
  // null as "not recorded" (never zero).
  const sessionsByRef = new Map();
  for (const row of joinedRows) {
    const sessionRef = String(row?.session_id || '');
    if (!sessionRef) continue;
    let session = sessionsByRef.get(sessionRef);
    if (!session) {
      session = {
        id: sessionRef,
        date: row?.date,
        status: String(row?.status || ''),
        verified: row?.status === 'completed',
        voided: NON_COMPLETIONS.has(String(row?.status || '')),
        exercises: [],
      };
      sessionsByRef.set(sessionRef, session);
    }
    const exerciseRef = String(row?.workout_exercise_id || '');
    let exercise = session.exercises.find((candidate) => candidate._ref === exerciseRef);
    if (!exercise) {
      exercise = {
        _ref: exerciseRef,
        exerciseKey: String(row?.exercise_id || ''),
        unit: weightUnit,
        sets: [],
      };
      session.exercises.push(exercise);
    }
    exercise.sets.push({ reps: row?.reps_completed ?? null, load: row?.weight_used ?? null });
  }
  for (const session of sessionsByRef.values()) {
    for (const exercise of session.exercises) delete exercise._ref;
  }

  return {
    sessions: [...sessionsByRef.values()],
    scheduledCount: plannedRows.length,
    missingInputs,
  };
}
