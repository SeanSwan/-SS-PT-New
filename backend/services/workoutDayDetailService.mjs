/**
 * ============================================================================
 * FILE: workoutDayDetailService.mjs
 * PURPOSE: Resolves a chart display date (MM/DD) to the real workout(s)
 *          behind it — the "tap a chart point, see the exact workout" slice.
 * CREATED: 2026-07-02 (Slice 8.4 — Progress Intelligence)
 * ============================================================================
 *
 * CONTRACT:
 * Canonical chart payloads render x as TO_CHAR(ws.date,'MM/DD') inside a
 * 90-day window, so MM/DD is unambiguous there. This service resolves the
 * label back to the most recent matching completed-session date within a
 * 120-day guard window, then returns set-level truth (exercise, reps,
 * weight, RPE) from workout_logs. Ownership is enforced twice: sessions are
 * selected by userId, and logs are selected only by those session ids.
 * Null-honest: unknown label or no sessions -> { date: null, sessions: [] }.
 */

export const MD_LABEL_REGEX = /^\d{2}\/\d{2}$/;

export const RESOLVE_MD_SQL = `SELECT ws.date::date::text AS iso_date
  FROM workout_sessions ws
  WHERE ws."userId" = :userId AND ws.status = 'completed'
    AND TO_CHAR(ws.date, 'MM/DD') = :md
    AND ws.date >= NOW() - INTERVAL '120 days'
  ORDER BY ws.date DESC
  LIMIT 1`;

export const DAY_SESSIONS_SQL = `SELECT
    ws.id,
    ws.duration::int AS duration,
    TO_CHAR(ws.date, 'HH24:MI') AS start_time
  FROM workout_sessions ws
  WHERE ws."userId" = :userId AND ws.status = 'completed'
    AND ws.date::date = (:isoDate)::date
  ORDER BY ws.date ASC`;

export const DAY_LOGS_SQL = `SELECT
    wl."sessionId" AS session_id,
    wl."exerciseName" AS exercise,
    wl.reps::int AS reps,
    wl.weight::float AS weight,
    wl.rpe::float AS rpe
  FROM workout_logs wl
  WHERE wl."sessionId" IN (:sessionIds)
  ORDER BY wl."sessionId" ASC`;

/** null/undefined stay null — Number(null) is 0, which would fake real data. */
const numOrNull = (v) => (
  v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v)
);

/** Groups flat log rows into per-session exercise blocks (row order kept). */
export function groupDayLogs(sessionRows, logRows) {
  const sessions = (sessionRows || []).map((s) => ({
    id: s.id,
    duration: numOrNull(s.duration),
    startTime: s.start_time ?? null,
    exercises: [],
  }));
  const byId = new Map(sessions.map((s) => [s.id, s]));
  for (const row of logRows || []) {
    const session = byId.get(row.session_id);
    if (!session) continue;
    let block = session.exercises.find((e) => e.name === row.exercise);
    if (!block) {
      block = { name: row.exercise, sets: [] };
      session.exercises.push(block);
    }
    block.sets.push({
      reps: numOrNull(row.reps),
      weight: numOrNull(row.weight),
      rpe: numOrNull(row.rpe),
    });
  }
  return sessions;
}

export const RESOLVE_WEEK_SQL = `SELECT (DATE_TRUNC('week', ws.date))::date::text AS week_start
  FROM workout_sessions ws
  WHERE ws."userId" = :userId AND ws.status = 'completed'
    AND TO_CHAR(DATE_TRUNC('week', ws.date), 'MM/DD') = :md
    AND ws.date >= NOW() - INTERVAL '120 days'
  ORDER BY ws.date DESC
  LIMIT 1`;

export const WEEK_SESSIONS_SQL = `SELECT
    ws.id,
    ws.duration::int AS duration,
    TO_CHAR(ws.date, 'HH24:MI') AS start_time,
    ws.date::date::text AS iso_date
  FROM workout_sessions ws
  WHERE ws."userId" = :userId AND ws.status = 'completed'
    AND ws.date >= (:weekStart)::date
    AND ws.date < (:weekStart)::date + INTERVAL '7 days'
  ORDER BY ws.date ASC`;

/**
 * Week variant (Slice 9): resolves a weekly chart's 'MM/DD' week-start label
 * to that training week and returns per-day grouped set-level truth.
 * Same double ownership scoping as the day variant.
 */
export async function getWorkoutWeekDetail(sequelize, userId, mdLabel) {
  if (!MD_LABEL_REGEX.test(String(mdLabel || ''))) {
    return { weekStart: null, days: [], invalidLabel: true };
  }
  const run = async (sql, replacements, context) => {
    try {
      const [rows] = await sequelize.query(sql, { replacements });
      return rows || [];
    } catch (error) {
      console.error(`[Workout Week Query Failed — ${context}]`, { message: error?.message, userId });
      throw error;
    }
  };

  const resolved = await run(RESOLVE_WEEK_SQL, { userId, md: mdLabel }, 'resolve-week');
  const weekStart = resolved[0]?.week_start ?? null;
  if (!weekStart) return { weekStart: null, days: [] };

  const sessionRows = await run(WEEK_SESSIONS_SQL, { userId, weekStart }, 'week-sessions');
  if (sessionRows.length === 0) return { weekStart, days: [] };

  const logRows = await run(
    DAY_LOGS_SQL,
    { sessionIds: sessionRows.map((s) => s.id) },
    'week-logs',
  );

  const byDate = new Map();
  for (const s of sessionRows) {
    const date = s.iso_date ?? 'unknown';
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(s);
  }
  const days = [...byDate.entries()].map(([date, rows]) => ({
    date,
    sessions: groupDayLogs(rows, logRows),
  }));
  return { weekStart, days };
}

export async function getWorkoutDayDetail(sequelize, userId, mdLabel) {
  if (!MD_LABEL_REGEX.test(String(mdLabel || ''))) {
    return { date: null, sessions: [], invalidLabel: true };
  }
  const run = async (sql, replacements, context) => {
    try {
      const [rows] = await sequelize.query(sql, { replacements });
      return rows || [];
    } catch (error) {
      console.error(`[Workout Day Query Failed — ${context}]`, { message: error?.message, userId });
      throw error;
    }
  };

  const resolved = await run(RESOLVE_MD_SQL, { userId, md: mdLabel }, 'resolve-md');
  const isoDate = resolved[0]?.iso_date ?? null;
  if (!isoDate) return { date: null, sessions: [] };

  const sessionRows = await run(DAY_SESSIONS_SQL, { userId, isoDate }, 'day-sessions');
  if (sessionRows.length === 0) return { date: isoDate, sessions: [] };

  const logRows = await run(
    DAY_LOGS_SQL,
    { sessionIds: sessionRows.map((s) => s.id) },
    'day-logs',
  );
  return { date: isoDate, sessions: groupDayLogs(sessionRows, logRows) };
}

export default getWorkoutDayDetail;
