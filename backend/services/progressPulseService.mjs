/**
 * ============================================================================
 * FILE: progressPulseService.mjs
 * PURPOSE: Progress Intelligence "pulse" metrics for the canonical client
 *          progress surface — weekly training streak, push/pull balance,
 *          variety score, weekly volume trend, last-workout recency.
 * CREATED: 2026-07-02 (Slice 8.1 — Progress Intelligence)
 * ============================================================================
 *
 * DATA TRUTH (Rule: charts from real logs only):
 * All queries read ONLY the canonical snake_case analytics backbone
 * established by the Phase 14 rebuild: `workout_sessions` (completed) and
 * `workout_logs` joined on `wl."sessionId" = ws.id`. No mock data, no
 * fabricated rows. Every metric is null-honest: when the underlying history
 * is empty the metric is null (never a fake zero-progress story).
 *
 * STREAK SEMANTICS (deliberate product choice):
 * Day-based streaks punish real training cadences (a 3x/week client can
 * never hold one). The pulse streak is WEEK-based: consecutive ISO weeks
 * (Postgres date_trunc('week')) with >= WEEK_TARGET distinct training days.
 * The in-progress current week never BREAKS a streak — it is "pending"
 * until it either qualifies (extends) or the week ends without qualifying.
 * Gamification's day-based `User.streakDays` is a separate, untouched system.
 *
 * PURE HELPERS: computeWeeklyStreak / computePushPull / computeVariety are
 * exported pure functions so tests lock the math without a DB.
 */

import { MOVEMENT_PATTERN_CASE_SQL, NAMED_MOVEMENT_PATTERNS } from './analytics/movementPatternSql.mjs';

export const WEEK_TARGET_DAYS = 2;      // days/week that qualify a week for the streak
export const PULSE_WINDOW_DAYS = 30;    // push/pull + variety trailing window
export const STREAK_WINDOW_DAYS = 364;  // 52 weeks of streak history

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const toUtcMs = (isoDate) => Date.parse(`${String(isoDate).slice(0, 10)}T00:00:00Z`);

/**
 * @param {Array<{week_start:string, training_days:number}>} rows ascending week rows
 * @param {string|null} currentWeekStart ISO date of date_trunc('week', NOW())
 * @param {number} target qualifying training days per week
 */
export function computeWeeklyStreak(rows, currentWeekStart, target = WEEK_TARGET_DAYS) {
  const empty = {
    weeklyCurrent: 0, weeklyLongest: 0, weekTarget: target,
    daysThisWeek: 0, currentWeekPending: false,
  };
  if (!Array.isArray(rows) || rows.length === 0 || !currentWeekStart) return empty;

  const byWeek = new Map();
  for (const r of rows) {
    const ms = toUtcMs(r.week_start);
    if (Number.isFinite(ms)) byWeek.set(ms, Number(r.training_days) || 0);
  }
  if (byWeek.size === 0) return empty;

  const currentMs = toUtcMs(currentWeekStart);
  const qualifies = (ms) => (byWeek.get(ms) || 0) >= target;
  const daysThisWeek = byWeek.get(currentMs) || 0;

  // Current streak: walk back from the current week. A not-yet-qualifying
  // current week is pending — start the walk at the previous week instead.
  let weeklyCurrent = 0;
  let cursor = qualifies(currentMs) ? currentMs : currentMs - WEEK_MS;
  while (qualifies(cursor)) {
    weeklyCurrent += 1;
    cursor -= WEEK_MS;
  }

  // Longest streak: longest consecutive qualifying run across the window.
  let weeklyLongest = 0;
  let run = 0;
  let prev = null;
  for (const ms of [...byWeek.keys()].sort((a, b) => a - b)) {
    if (!qualifies(ms)) { run = 0; prev = null; continue; }
    run = (prev !== null && ms - prev === WEEK_MS) ? run + 1 : 1;
    prev = ms;
    if (run > weeklyLongest) weeklyLongest = run;
  }

  return {
    weeklyCurrent,
    weeklyLongest: Math.max(weeklyLongest, weeklyCurrent),
    weekTarget: target,
    daysThisWeek,
    currentWeekPending: weeklyCurrent > 0 && daysThisWeek < target,
  };
}

/** Ratio ~1:1 is the coaching target; thresholds are deliberately generous. */
export function computePushPull(patternRows) {
  const rows = Array.isArray(patternRows) ? patternRows : [];
  const volumeOf = (p) => {
    const row = rows.find((r) => r.pattern === p);
    return row ? Math.max(0, Number(row.volume) || 0) : 0;
  };
  const pushVolume = Math.round(volumeOf('push'));
  const pullVolume = Math.round(volumeOf('pull'));
  if (pushVolume <= 0 || pullVolume <= 0) {
    return { pushVolume, pullVolume, ratio: null, label: 'insufficient_data' };
  }
  const ratio = Number((pushVolume / pullVolume).toFixed(2));
  const label = ratio > 1.25 ? 'push_heavy' : ratio < 0.8 ? 'pull_heavy' : 'balanced';
  return { pushVolume, pullVolume, ratio, label };
}

/** Variety: pattern coverage weighs 60, exercise diversity weighs 40. */
export function computeVariety(patternRows) {
  const rows = Array.isArray(patternRows) ? patternRows : [];
  const active = rows.filter((r) => (Number(r.sets) || 0) > 0);
  if (active.length === 0) {
    return { score: null, distinctExercises: 0, patternsCovered: 0, patternsTotal: NAMED_MOVEMENT_PATTERNS.length };
  }
  const patternsCovered = active
    .filter((r) => NAMED_MOVEMENT_PATTERNS.includes(r.pattern)).length;
  const distinctExercises = active
    .reduce((sum, r) => sum + (Number(r.exercises) || 0), 0);
  const score = Math.round(
    (Math.min(patternsCovered, 6) / 6) * 60
    + (Math.min(distinctExercises, 12) / 12) * 40,
  );
  return { score, distinctExercises, patternsCovered, patternsTotal: NAMED_MOVEMENT_PATTERNS.length };
}

// ─────────────────────────────────────────────────────────────
// SQL — canonical snake_case backbone only (workout_sessions, workout_logs)
// ─────────────────────────────────────────────────────────────

export const WEEKLY_TRAINING_DAYS_SQL = `SELECT
    (date_trunc('week', ws.date))::date::text AS week_start,
    COUNT(DISTINCT ws.date::date)::int AS training_days,
    (date_trunc('week', NOW()))::date::text AS current_week_start
  FROM workout_sessions ws
  WHERE ws."userId" = :userId AND ws.status = 'completed'
    AND ws.date >= NOW() - INTERVAL '${STREAK_WINDOW_DAYS} days'
  GROUP BY 1 ORDER BY 1 ASC`;

export const PATTERN_WINDOW_SQL = `SELECT
    ${MOVEMENT_PATTERN_CASE_SQL} AS pattern,
    COALESCE(SUM(wl.weight * wl.reps), 0)::float AS volume,
    COUNT(*)::int AS sets,
    COUNT(DISTINCT wl."exerciseName")::int AS exercises
  FROM workout_logs wl
  JOIN workout_sessions ws ON wl."sessionId" = ws.id
  WHERE ws."userId" = :userId AND ws.status = 'completed'
    AND ws.date >= NOW() - INTERVAL '${PULSE_WINDOW_DAYS} days'
  GROUP BY pattern`;

export const WEEK_VOLUME_SQL = `SELECT
    COALESCE(SUM(wl.weight * wl.reps) FILTER (
      WHERE ws.date >= date_trunc('week', NOW())), 0)::float AS this_week,
    COALESCE(SUM(wl.weight * wl.reps) FILTER (
      WHERE ws.date >= date_trunc('week', NOW()) - INTERVAL '7 days'
        AND ws.date < date_trunc('week', NOW())), 0)::float AS prior_week
  FROM workout_logs wl
  JOIN workout_sessions ws ON wl."sessionId" = ws.id
  WHERE ws."userId" = :userId AND ws.status = 'completed'
    AND ws.date >= date_trunc('week', NOW()) - INTERVAL '7 days'`;

export const LAST_WORKOUT_SQL = `SELECT
    MAX(ws.date)::text AS last_workout,
    (NOW()::date - MAX(ws.date)::date)::int AS days_ago
  FROM workout_sessions ws
  WHERE ws."userId" = :userId AND ws.status = 'completed'`;

/** Orchestrates the four queries and composes the pulse payload. */
export async function getProgressPulse(sequelize, userId) {
  const run = async (sql, context) => {
    try {
      const [rows] = await sequelize.query(sql, { replacements: { userId } });
      return rows || [];
    } catch (error) {
      console.error(`[Progress Pulse Query Failed — ${context}]`, { message: error?.message, userId });
      throw error;
    }
  };

  const [weekRows, patternRows, volumeRows, lastRows] = await Promise.all([
    run(WEEKLY_TRAINING_DAYS_SQL, 'pulse-weekly-days'),
    run(PATTERN_WINDOW_SQL, 'pulse-pattern-window'),
    run(WEEK_VOLUME_SQL, 'pulse-week-volume'),
    run(LAST_WORKOUT_SQL, 'pulse-last-workout'),
  ]);

  const currentWeekStart = weekRows[0]?.current_week_start ?? null;
  const streak = computeWeeklyStreak(weekRows, currentWeekStart);
  const pushPull = computePushPull(patternRows);
  const variety = computeVariety(patternRows);

  const thisWeek = Math.round(Number(volumeRows[0]?.this_week) || 0);
  const priorWeek = Math.round(Number(volumeRows[0]?.prior_week) || 0);
  const deltaPct = priorWeek > 0
    ? Math.round(((thisWeek - priorWeek) / priorWeek) * 100)
    : null;

  const lastWorkoutDate = lastRows[0]?.last_workout ?? null;
  const daysAgoRaw = lastRows[0]?.days_ago;
  const daysAgo = lastWorkoutDate !== null && Number.isFinite(Number(daysAgoRaw))
    ? Math.max(0, Number(daysAgoRaw))
    : null;

  return {
    streak,
    pushPull,
    variety,
    volume: { thisWeek, priorWeek, deltaPct },
    lastWorkout: { date: lastWorkoutDate, daysAgo },
  };
}

export default getProgressPulse;
