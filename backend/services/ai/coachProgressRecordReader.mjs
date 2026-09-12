/** Source-linked progress over the actual canonical logger and normalized sets.
 * Daily-form/Coach saves write workout_logs (lbs per WorkoutLoggerTypes and
 * coachWorkoutLibraryResolver). Normalized sets have no persisted load unit;
 * do not borrow an unrelated body measurement's unit. Prefer canonical logs
 * when both representations exist so one workout is never double counted.
 */
const DEFAULT_WINDOW_DAYS = 28;
const MAX_WINDOW_DAYS = 366;
const SESSION_ROW_LIMIT = 240;
const joinedSessionSql = `
 SELECT ws.id AS session_id, ws.status, ws.date,
   CASE WHEN wl.id IS NOT NULL THEN wl."exerciseName" ELSE we.id::text END AS workout_exercise_id,
   CASE WHEN wl.id IS NOT NULL THEN wl."exerciseName" ELSE we."exerciseId"::text END AS exercise_id,
   COALESCE(wl.id::text, s.id::text) AS set_id,
   CASE WHEN wl.id IS NOT NULL THEN wl.reps ELSE s."repsCompleted" END AS reps_completed,
   CASE WHEN wl.id IS NOT NULL THEN wl.weight ELSE s."weightUsed" END AS weight_used,
   CASE WHEN wl.id IS NOT NULL THEN 'lbs' ELSE '' END AS weight_unit
 FROM workout_sessions ws
 LEFT JOIN workout_logs wl ON wl."sessionId" = ws.id
 LEFT JOIN workout_exercises we ON we."workoutSessionId" = ws.id
   AND NOT EXISTS (SELECT 1 FROM workout_logs source WHERE source."sessionId" = ws.id)
 LEFT JOIN sets s ON s."workoutExerciseId" = we.id
 WHERE ws."userId" = :userId AND ws.status IN ('in_progress', 'completed', 'skipped', 'cancelled')
   AND ws.date >= :sinceDate AND ws.date <= :now
 ORDER BY ws.date DESC, ws.id, wl.id, we.id, s.id
 LIMIT ${SESSION_ROW_LIMIT + 1}`;
const NON_COMPLETIONS = new Set(['in_progress', 'skipped', 'cancelled']);

export async function readCoachProgressRecords({ sequelize, userId, windowDays: input, deps = {} } = {}) {
  if (!sequelize || !Number.isSafeInteger(Number(userId)) || Number(userId) <= 0) {
    return { sessions: [], scheduledCount: null, missingInputs: ['authorized_reader_context'] };
  }
  const query = deps.query ?? ((sql, options) => sequelize.query(sql, { ...options, type: 'SELECT' }));
  const windowDays = Number.isSafeInteger(Number(input)) && Number(input) > 0
    ? Math.min(Number(input), MAX_WINDOW_DAYS) : DEFAULT_WINDOW_DAYS;
  const now = new Date();
  const sinceDate = new Date(now.getTime() - windowDays * 86400000).toISOString();
  const flatRows = await query(joinedSessionSql, { replacements: { userId: Number(userId), sinceDate, now: now.toISOString() } });
  if (!Array.isArray(flatRows)) throw new Error('Invalid workout record response');
  const missingInputs = new Set();
  // Planned sessions are not the denominator for completed sessions: source
  // schedule membership must be joined before an adherence rate is meaningful.
  if (flatRows.length) missingInputs.add('scheduled_session_matches');
  if (flatRows.length > SESSION_ROW_LIMIT) missingInputs.add('session_row_cap');
  const sessionsByRef = new Map();
  for (const row of flatRows.slice(0, SESSION_ROW_LIMIT)) {
    const sessionRef = String(row?.session_id || '');
    if (!sessionRef) continue;
    let session = sessionsByRef.get(sessionRef);
    if (!session) {
      session = { id: sessionRef, date: row.date, status: row.status,
        verified: row.status === 'completed', voided: NON_COMPLETIONS.has(row.status), exercises: [] };
      sessionsByRef.set(sessionRef, session);
    }
    if (row.set_id == null || !row.exercise_id) { missingInputs.add('workout_set_records'); continue; }
    const unit = ['lbs', 'kg'].includes(row.weight_unit) ? row.weight_unit : '';
    if (!unit) missingInputs.add('weight_unit');
    const exerciseRef = String(row.workout_exercise_id || row.exercise_id);
    let exercise = session.exercises.find(e => e._ref === exerciseRef && e.unit === unit);
    if (!exercise) {
      exercise = { _ref: exerciseRef, exerciseKey: String(row.exercise_id), unit, sets: [] };
      session.exercises.push(exercise);
    }
    exercise.sets.push({ reps: row.reps_completed ?? null, load: row.weight_used ?? null });
  }
  for (const session of sessionsByRef.values()) for (const exercise of session.exercises) delete exercise._ref;
  return { sessions: [...sessionsByRef.values()], scheduledCount: null, missingInputs: [...missingInputs] };
}
