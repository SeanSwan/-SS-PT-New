/**
 * ============================================================================
 * FILE: chartDataController.mjs
 * PURPOSE: Canonical client-progress chart endpoints (Phase 14 rebuild)
 * LAST MODIFIED: 2026-04-15 (Phase 14 — 12-chart canonical rebuild)
 * ============================================================================
 *
 * PHASE 14 (2026-04-15) SOURCE-OF-TRUTH REBUILD:
 * The pre-Phase-14 controller mixed three patterns:
 *   1. snake_case tables that actually exist (`workout_sessions`,
 *      `body_measurements`, `daily_macro_logs`)
 *   2. PascalCase-quoted tables that DO NOT exist in production
 *      (`"WorkoutSessions"`, `"WorkoutExercises"`, `"Exercises"`, `"Sets"`)
 *   3. mixed-up join chains that assumed both
 *
 * Net result: five of nine chart endpoints (muscle-group-focus,
 * cardio-endurance, session-frequency, muscle-recovery, rpe-by-exercise)
 * silently failed through `safeQuery` and returned empty arrays for every
 * request. The canonical client progress dashboard rendered "No data yet"
 * regardless of real workout history. This was the "chart source-of-truth
 * drift" flagged in the Phase 14 audit.
 *
 * Phase 14 rebuild establishes `workout_logs` (joined to `workout_sessions`)
 * as the canonical analytics backbone for workout-driven charts. 12 canonical
 * chart endpoints are now truthful:
 *
 *    1. chart-workout-frequency           — workout_sessions weekly count
 *    2. chart-attendance-reliability      — workout_sessions.status breakdown
 *    3. chart-weekly-volume               — SUM(weight*reps) per week from workout_logs
 *    4. chart-sets-reps-trend             — count(logs) + sum(reps) per week
 *    5. chart-duration-trend              — workout_sessions.duration per session
 *    6. chart-intensity-rpe-trend         — avg(wl.rpe) precedence, fallback ws.intensity
 *    7. chart-pr-timeline                 — running-max best set per exercise
 *    8. chart-anchor-lifts                — top-3 most-frequent exercises, max weight over time
 *    9. chart-exercise-frequency          — all-time exercises by session count from workout_logs
 *   10. chart-movement-pattern-balance    — volume aggregated into NASM movement patterns
 *   11. chart-muscle-group-balance        — volume aggregated into NASM muscle groups
 *   12. chart-recovery-signal             — per-exercise pain-note and high-RPE clustering
 *
 * Preserved legacy (still truthful, serve other surfaces):
 *    - chart-weight-progression           — body_measurements (unchanged)
 *    - chart-body-fat-trend               — body_measurements (unchanged)
 *    - chart-macro-split                  — daily_macro_logs (unchanged, nutrition)
 *
 * Explicitly deprecated — still routed for back-compat, but return empty
 * arrays so no caller renders wrong data:
 *    - chart-muscle-group-focus  (replaced by chart-muscle-group-balance)
 *    - chart-cardio-endurance    (broken PascalCase join, out of scope)
 *    - chart-session-frequency   (replaced by chart-workout-frequency)
 *    - chart-muscle-recovery     (broken PascalCase join, replaced in spirit by chart-recovery-signal)
 *    - chart-rpe-by-exercise     (replaced by chart-intensity-rpe-trend)
 *
 * All new canonical queries use ONLY the real snake_case tables:
 *   `workout_logs`, `workout_sessions`, `body_measurements`, `daily_macro_logs`
 *
 * JWT SECURITY: `userId` always comes from `req.params.userId`, which is
 * injected by `clientAnalyticsRoutes.mjs` from `req.user.id` (JWT-derived).
 * Client-facing routes never accept `userId` from the URL; only admin/trainer
 * routes pass it explicitly through IDOR middleware.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Shared helpers
// ─────────────────────────────────────────────────────────────

import { MOVEMENT_PATTERN_CASE_SQL } from '../services/analytics/movementPatternSql.mjs';
import { MUSCLE_GROUP_CASE_SQL, MUSCLE_GROUP_DISPLAY } from '../services/analytics/muscleGroupSql.mjs';

const safeQuery = async (sequelize, sql, replacements, context = '') => {
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows || [];
  } catch (error) {
    console.error(`[Analytics Query Failed — ${context}]`, {
      message: error?.message,
      userId: replacements?.userId,
    });
    throw error;
  }
};

const INTERNAL_ERROR = 'internal_error';

const sendChartError = (res) => res.status(500).json({
  success: false,
  message: 'Unable to load chart data',
  error: INTERNAL_ERROR,
});

// Validate userId is a positive integer — returns parsed int or null
const parseUserId = (raw) => {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Standard short-circuit for all chart endpoints.
//
// REV 3 (2026-04-30, Triage Slice 1): paramless client routes (e.g.
// /api/client/analytics/chart-*) have no :userId in path; the
// injectUserId middleware sets req.params.userId but Express resets
// req.params for paramless route layers (see CLAUDE.md rule 55).
// Fall back to the authenticated user's id - auth has already passed
// by this point so this is safe and matches client-route intent.
//
// `||` (not `??`) catches empty-string sentinels, "undefined"/"null"/"0"
// string coercions; all of which are invalid userIds.
//
// Risk accepted by deferring the ValidationError refactor: any future
// addition of a 16th `requireUser` caller that omits the
// `if (!userId) return;` discipline will crash via ERR_HTTP_HEADERS_SENT.
// All 15 current callers verified disciplined; lint rule + ValidationError
// refactor scheduled in fast-follow tech-debt slices.
const requireUser = (req, res) => {
  const raw = req.params.userId || req.user?.id;
  const userId = parseUserId(raw);
  if (!userId) {
    res.status(400).json({ success: false, message: 'Invalid userId' });
    return null;
  }
  return userId;
};

// ─────────────────────────────────────────────────────────────
// SECTION: 1. Workout Frequency — bar chart, workouts per week (12 weeks)
//
// CANONICAL SOURCE: workout_sessions (status='completed').
// Phase 14 note: preserved from the 2026-04-13 canonical-surface-audit fix
// that switched from the broken PascalCase `"WorkoutSessions"` reference.
// ─────────────────────────────────────────────────────────────

export async function getWorkoutFrequencyChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR(DATE_TRUNC('week', ws.date), 'MM/DD') AS week,
         COUNT(*)::int AS count
       FROM workout_sessions ws
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', ws.date)
       ORDER BY DATE_TRUNC('week', ws.date)`,
      { userId }, 'getWorkoutFrequencyChart');

    res.json({ success: true, data: rows.map(r => ({ x: r.week, y: r.count })) });
  } catch (error) {
    console.error('Error getting workout frequency chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 2. Attendance Reliability — status breakdown (90 days)
//
// CANONICAL SOURCE: workout_sessions.status ENUM
//   values: planned | in_progress | completed | skipped | cancelled
// Returns status counts plus a derived reliabilityPercent = completed /
// (completed + skipped + cancelled). `planned` and `in_progress` are
// excluded from the denominator because they have not resolved yet.
// ─────────────────────────────────────────────────────────────

export async function getAttendanceReliabilityChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT ws.status::text AS status,
              COUNT(*)::int AS count
       FROM workout_sessions ws
       WHERE ws."userId" = :userId
         AND ws.date >= NOW() - INTERVAL '90 days'
       GROUP BY ws.status
       ORDER BY count DESC`,
      { userId }, 'getAttendanceReliabilityChart');

    // Build the status → count map for the reliability calculation.
    const byStatus = {};
    for (const r of rows) byStatus[r.status] = r.count;
    const completed = byStatus.completed || 0;
    const skipped = byStatus.skipped || 0;
    const cancelled = byStatus.cancelled || 0;
    const resolved = completed + skipped + cancelled;
    const reliabilityPercent = resolved > 0
      ? Math.round((completed / resolved) * 100)
      : 0;

    res.json({
      success: true,
      data: rows.map(r => ({ x: r.status, y: r.count })),
      reliabilityPercent,
      totals: { completed, skipped, cancelled, resolved },
    });
  } catch (error) {
    console.error('Error getting attendance reliability chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 3. Weekly Training Volume — sum(weight*reps) per week
//
// CANONICAL SOURCE: workout_logs JOIN workout_sessions.
// Returns per-week total lifted volume in lbs (weight * reps). This is
// the single most load-bearing "progress is real" chart on the dashboard.
// ─────────────────────────────────────────────────────────────

export async function getWeeklyVolumeChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR(DATE_TRUNC('week', ws.date), 'MM/DD') AS week,
         COALESCE(SUM(wl.weight * wl.reps), 0)::float AS volume,
         COUNT(DISTINCT wl."sessionId")::int AS workouts
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', ws.date)
       ORDER BY DATE_TRUNC('week', ws.date)`,
      { userId }, 'getWeeklyVolumeChart');

    res.json({
      success: true,
      data: rows.map(r => ({ x: r.week, y: Math.round(r.volume), workouts: r.workouts })),
    });
  } catch (error) {
    console.error('Error getting weekly volume chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 4. Total Sets & Reps Trend — dual series per week
//
// CANONICAL SOURCE: workout_logs JOIN workout_sessions.
// Returns two parallel weekly series so a consumer can plot them as
// grouped bars or stacked lines. Useful as a progression signal even
// when load is flat (e.g. hypertrophy-phase volume accumulation).
// ─────────────────────────────────────────────────────────────

export async function getSetsRepsTrendChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR(DATE_TRUNC('week', ws.date), 'MM/DD') AS week,
         COUNT(*)::int AS sets,
         COALESCE(SUM(wl.reps), 0)::int AS reps
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', ws.date)
       ORDER BY DATE_TRUNC('week', ws.date)`,
      { userId }, 'getSetsRepsTrendChart');

    res.json({
      success: true,
      data: {
        sets: rows.map(r => ({ x: r.week, y: r.sets })),
        reps: rows.map(r => ({ x: r.week, y: r.reps })),
      },
    });
  } catch (error) {
    console.error('Error getting sets/reps trend chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 5. Session Duration Trend — per-session duration line
//
// CANONICAL SOURCE: workout_sessions.duration (integer minutes).
// Returns the duration of every completed session in the last 90 days.
// Gracefully excludes sessions with duration = 0 (typical for transcript-
// intake logs that don't record a duration — the mapper defaults to 50,
// but pre-Phase-13 applied workouts may be stored at 0).
// ─────────────────────────────────────────────────────────────

export async function getDurationTrendChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR(ws.date, 'MM/DD') AS date,
         ws.date AS ts,
         ws.duration::int AS duration
       FROM workout_sessions ws
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.duration > 0
         AND ws.date >= NOW() - INTERVAL '90 days'
       ORDER BY ws.date ASC`,
      { userId }, 'getDurationTrendChart');

    // `x` stays the MM/DD display label the trend charts render on their axis.
    // workout_sessions.date is a TIMESTAMP and the DB session runs in UTC, so
    // that label is the UTC calendar day — a Sunday 22:00 PT workout carries
    // MONDAY's label. Ship the raw timestamp too so day-bucketing consumers
    // (the heatmap) can bucket by the user's real LOCAL day: a calendar of
    // "did I train that day" must show the day the client actually trained.
    res.json({
      success: true,
      data: rows.map(r => ({ x: r.date, y: r.duration, ts: r.ts })),
    });
  } catch (error) {
    console.error('Error getting duration trend chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 6. Average Intensity / RPE Trend — weekly precedence
//
// CANONICAL SOURCE precedence (documented):
//   PRIMARY:   workout_logs.rpe  (per-set RPE — trainer-rated, 1-10)
//   FALLBACK:  workout_sessions.intensity (session-level, 1-10)
//
// For each week, if ANY workout_logs row in that week has a non-null rpe,
// we report the average log-level RPE (source='rpe'). Otherwise we report
// the average session-level intensity (source='intensity'). This preserves
// log-level precision when trainers rated individual sets, and degrades
// gracefully to session-level intensity when they did not.
// ─────────────────────────────────────────────────────────────

export async function getIntensityRPETrendChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR(DATE_TRUNC('week', ws.date), 'MM/DD') AS week,
         AVG(wl.rpe)::float AS avg_rpe,
         AVG(ws.intensity)::float AS avg_intensity,
         COUNT(wl.rpe)::int AS rpe_count
       FROM workout_sessions ws
       LEFT JOIN workout_logs wl ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', ws.date)
       ORDER BY DATE_TRUNC('week', ws.date)`,
      { userId }, 'getIntensityRPETrendChart');

    const data = rows.flatMap(r => {
      const avgRpe = Number(r.avg_rpe);
      const avgIntensity = Number(r.avg_intensity);
      const hasRpe = r.rpe_count > 0 && Number.isFinite(avgRpe) && avgRpe > 0;
      const hasIntensity = Number.isFinite(avgIntensity) && avgIntensity > 0;
      const value = hasRpe ? avgRpe : hasIntensity ? avgIntensity : null;
      if (value === null) return [];
      return [{
        x: r.week,
        y: Math.round(value * 10) / 10,
        source: hasRpe ? 'rpe' : 'intensity',
      }];
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting intensity/RPE trend chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 7. PR Timeline — running best-set events
//
// CANONICAL SOURCE: workout_logs JOIN workout_sessions.
// Returns the heaviest set of each exercise on each day it was trained.
// The frontend can then filter to "new PR only" by comparing each row to
// the running max for that exercise — keeping the consumer free to
// render either the full progression line or the discrete PR events.
// ─────────────────────────────────────────────────────────────

export async function getPRTimelineChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT DISTINCT ON (ws.date::date, LOWER(TRIM(wl."exerciseName")))
         TO_CHAR(ws.date::date, 'YYYY-MM-DD') AS day,
         wl."exerciseName" AS exercise,
         wl.weight::float AS top_weight,
         wl.reps::int AS top_reps
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND wl.weight > 0
         AND ws.date >= NOW() - INTERVAL '180 days'
       -- Case-insensitive per-day top set (one point per exercise per day).
       ORDER BY ws.date::date, LOWER(TRIM(wl."exerciseName")), wl.weight DESC`,
      { userId }, 'getPRTimelineChart');

    res.json({
      success: true,
      data: rows.map(r => ({
        x: r.day,
        y: r.top_weight,
        exercise: r.exercise,
        reps: r.top_reps,
      })),
    });
  } catch (error) {
    console.error('Error getting PR timeline chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 8. Anchor Lift Progression — top-3 frequency, heaviest per day
//
// CANONICAL SOURCE: workout_logs JOIN workout_sessions.
// Picks the three exercises the client trains most often in the last 90
// days and returns their heaviest set on each day they were trained.
// This gives a focused progression signal for the movements the client
// actually keeps coming back to — the "anchor" lifts.
// ─────────────────────────────────────────────────────────────

export async function getAnchorLiftsChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `WITH top_exercises AS (
         -- Top-3 by frequency, case/whitespace-insensitive so a lift isn't
         -- missed because its session count is split across name variants.
         SELECT LOWER(TRIM(wl."exerciseName")) AS exercise_key
         FROM workout_logs wl
         JOIN workout_sessions ws ON wl."sessionId" = ws.id
         WHERE ws."userId" = :userId AND ws.status = 'completed'
           AND wl.weight > 0
           AND ws.date >= NOW() - INTERVAL '90 days'
         GROUP BY LOWER(TRIM(wl."exerciseName"))
         ORDER BY COUNT(DISTINCT wl."sessionId") DESC
         LIMIT 3
       )
       SELECT DISTINCT ON (ws.date::date, LOWER(TRIM(wl."exerciseName")))
         TO_CHAR(ws.date::date, 'YYYY-MM-DD') AS day,
         wl."exerciseName" AS exercise,
         wl.weight::float AS top_weight,
         wl.reps::int AS top_reps
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND wl.weight > 0
         AND LOWER(TRIM(wl."exerciseName")) IN (SELECT exercise_key FROM top_exercises)
         AND ws.date >= NOW() - INTERVAL '90 days'
       ORDER BY ws.date::date, LOWER(TRIM(wl."exerciseName")), wl.weight DESC`,
      { userId }, 'getAnchorLiftsChart');

    // Group by NORMALIZED exercise → array of {day, weight, reps}, with a
    // stable first-seen display name so case variants don't split one lift
    // into two series.
    const byExercise = {};
    const keyToDisplay = {};
    for (const r of rows) {
      const key = String(r.exercise).trim().toLowerCase();
      if (!keyToDisplay[key]) keyToDisplay[key] = r.exercise;
      const display = keyToDisplay[key];
      if (!byExercise[display]) byExercise[display] = [];
      byExercise[display].push({
        x: r.day,
        y: r.top_weight,
        reps: r.top_reps,
      });
    }

    res.json({
      success: true,
      data: byExercise,
      exercises: Object.keys(byExercise),
    });
  } catch (error) {
    console.error('Error getting anchor lifts chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 9. Exercise Frequency — all-time most-trained diary
//
// CANONICAL SOURCE: workout_logs.exerciseName JOIN workout_sessions.
// Returns every exercise by distinct session count, with total sets as a
// secondary sort key. This powers the client-facing exercise diary board.
// ─────────────────────────────────────────────────────────────

export async function getExerciseFrequencyChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT MAX(wl."exerciseName") AS exercise,
              COUNT(DISTINCT wl."sessionId")::int AS sessions,
              COUNT(*)::int AS sets
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
       -- Merge case/whitespace variants ('Bench Press' == 'bench press') into
       -- one bar instead of two, matching the Rolodex convention.
       GROUP BY LOWER(TRIM(wl."exerciseName"))
       ORDER BY sessions DESC, sets DESC, MAX(wl."exerciseName") ASC`,
      { userId }, 'getExerciseFrequencyChart');

    res.json({
      success: true,
      data: rows.map(r => ({ x: r.exercise, y: r.sessions, sets: r.sets })),
    });
  } catch (error) {
    console.error('Error getting exercise frequency chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 10. Movement Pattern Balance — NASM-aligned patterns
//
// CANONICAL SOURCE: workout_logs.exerciseName mapped to NASM movement
// patterns via ILIKE CASE. Patterns:
//   squat | hinge | push | pull | carry | core | other
//
// Mapping is conservative — uses common exercise-name substrings only.
// Unmapped exercises fall into 'other' rather than being silently
// dropped so the chart always reports real total volume.
// ─────────────────────────────────────────────────────────────

export async function getMovementPatternBalanceChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         ${MOVEMENT_PATTERN_CASE_SQL} AS pattern,
         COALESCE(SUM(wl.weight * wl.reps), 0)::float AS volume,
         COUNT(*)::int AS sets
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '90 days'
       GROUP BY pattern
       ORDER BY volume DESC`,
      { userId }, 'getMovementPatternBalanceChart');

    res.json({
      success: true,
      data: rows.map(r => ({ x: r.pattern, y: Math.round(r.volume), sets: r.sets })),
    });
  } catch (error) {
    console.error('Error getting movement pattern balance chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 11. Muscle Group Volume Balance — replaces broken radar
//
// CANONICAL SOURCE: workout_logs.exerciseName mapped to NASM muscle
// groups via ILIKE CASE. Groups:
//   Chest | Back | Shoulders | Arms | Legs | Core | Full Body | Other
//
// This replaces the broken `chart-muscle-group-focus` which silently
// returned [] against a non-existent PascalCase join chain. The new
// implementation reads the ground truth (workout_logs) with explicit
// keyword mapping that is easy to audit and extend.
// ─────────────────────────────────────────────────────────────

export async function getMuscleGroupBalanceChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         ${MUSCLE_GROUP_CASE_SQL} AS muscle_group,
         COALESCE(SUM(wl.weight * wl.reps), 0)::float AS volume,
         COUNT(*)::int AS sets
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '90 days'
       GROUP BY muscle_group
       ORDER BY volume DESC`,
      { userId }, 'getMuscleGroupBalanceChart');

    res.json({
      success: true,
      data: rows.map(r => ({ x: MUSCLE_GROUP_DISPLAY[r.muscle_group] || r.muscle_group, y: Math.round(r.volume), sets: r.sets })),
    });
  } catch (error) {
    console.error('Error getting muscle group balance chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 12. Recovery Signal — pain + high-RPE clustering
//
// CANONICAL SOURCES (Phase 15.0, 2026-04-15):
//   - workout_logs.notes         — set-specific note
//   - workout_logs."exerciseNote" — Phase 15 dedicated exercise-level note,
//                                   stamped on every row of a group
//   - workout_logs.rpe >= 9      — redline sets
//
// Phase 15.0 note: this chart now scans BOTH note columns so transcript-
// derived exercise-level observations (e.g. "shoulder clicking on
// dumbbell bench") are no longer silently lost from analytics. The
// Phase 13.2 `Coach: ` encoding embedded such notes into set 1's notes
// column, which was in scope for this regex already — new Phase 15 rows
// store the same content in `exerciseNote` instead, so the OR guard
// here catches both old and new storage shapes.
//
// Returns the top 10 exercises where the client has logged
// pain/discomfort in EITHER note column, or consistently redlined RPE
// over the last 90 days. Only rows with at least one flag are returned,
// so an empty array is a truthful "no recovery concerns" state — not
// a silent failure.
//
// Regex uses Postgres word-boundary anchors (\m, \M) so "pull-up" does
// not match "pull" in notes. Keywords: pain, hurt, sore, tight,
// discomfort, ache, strain, tweak, injury.
// ─────────────────────────────────────────────────────────────

export async function getRecoverySignalChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT wl."exerciseName" AS exercise,
              COUNT(*) FILTER (
                WHERE (
                  (wl.notes IS NOT NULL
                    AND wl.notes ~* '\\m(pain|hurt|sore|tight|discomfort|ache|strain|tweak|injury)\\M')
                  OR (wl."exerciseNote" IS NOT NULL
                    AND wl."exerciseNote" ~* '\\m(pain|hurt|sore|tight|discomfort|ache|strain|tweak|injury)\\M')
                )
              )::int AS pain_flags,
              COUNT(*) FILTER (WHERE wl.rpe >= 9)::int AS high_rpe_flags,
              COUNT(*)::int AS total_sets
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '90 days'
       GROUP BY wl."exerciseName"
       HAVING
         COUNT(*) FILTER (
           WHERE (
             (wl.notes IS NOT NULL
               AND wl.notes ~* '\\m(pain|hurt|sore|tight|discomfort|ache|strain|tweak|injury)\\M')
             OR (wl."exerciseNote" IS NOT NULL
               AND wl."exerciseNote" ~* '\\m(pain|hurt|sore|tight|discomfort|ache|strain|tweak|injury)\\M')
           )
         ) > 0
         OR COUNT(*) FILTER (WHERE wl.rpe >= 9) > 0
       ORDER BY pain_flags DESC, high_rpe_flags DESC
       LIMIT 10`,
      { userId }, 'getRecoverySignalChart');

    res.json({
      success: true,
      data: rows.map(r => ({
        x: r.exercise,
        y: r.pain_flags + r.high_rpe_flags,
        painFlags: r.pain_flags,
        highRpeFlags: r.high_rpe_flags,
        totalSets: r.total_sets,
      })),
    });
  } catch (error) {
    console.error('Error getting recovery signal chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: LEGACY — preserved truthful body-composition endpoints
// These are NOT part of the 12 canonical client-progress charts, but
// they are still used by other consumers (profile gallery, admin
// client detail). The SQL is unchanged from the pre-Phase-14
// implementation and reads `body_measurements` / `daily_macro_logs`
// which have always been the correct snake_case tables.
// ─────────────────────────────────────────────────────────────

export async function getWeightProgressionChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    // Latest 50 (displayed oldest→newest). A plain ASC LIMIT froze the card
    // at the OLDEST 50 measurements — new weigh-ins never appeared (AD-2).
    const rows = await safeQuery(sequelize,
      `SELECT date, weight FROM (
         SELECT "measurementDate",
                TO_CHAR("measurementDate", 'MM/DD') AS date,
                weight::float AS weight
         FROM body_measurements
         WHERE "userId" = :userId AND weight IS NOT NULL
         ORDER BY "measurementDate" DESC
         LIMIT 50
       ) recent
       ORDER BY "measurementDate" ASC`,
      { userId }, 'getWeightProgressionChart');

    res.json({ success: true, data: rows.map(r => ({ x: r.date, y: r.weight })) });
  } catch (error) {
    console.error('Error getting weight progression chart:', error);
    return sendChartError(res);
  }
}

export async function getBodyFatTrendChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    // Latest 50 (displayed oldest→newest) — same stale-window fix as weight.
    const rows = await safeQuery(sequelize,
      `SELECT date, bf FROM (
         SELECT "measurementDate",
                TO_CHAR("measurementDate", 'MM/DD') AS date,
                "bodyFatPercentage"::float AS bf
         FROM body_measurements
         WHERE "userId" = :userId AND "bodyFatPercentage" IS NOT NULL
         ORDER BY "measurementDate" DESC
         LIMIT 50
       ) recent
       ORDER BY "measurementDate" ASC`,
      { userId }, 'getBodyFatTrendChart');

    res.json({ success: true, data: rows.map(r => ({ x: r.date, y: r.bf })) });
  } catch (error) {
    console.error('Error getting body fat trend chart:', error);
    return sendChartError(res);
  }
}

export async function getMacroSplitChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         COALESCE(SUM(protein), 0)::float AS protein,
         COALESCE(SUM(carbs), 0)::float AS carbs,
         COALESCE(SUM(fat), 0)::float AS fat
       FROM daily_macro_logs
       WHERE "userId" = :userId
         AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      { userId }, 'getMacroSplitChart');

    const r = rows[0] || { protein: 0, carbs: 0, fat: 0 };
    const total = r.protein + r.carbs + r.fat;

    res.json({
      success: true,
      data: total > 0 ? [
        { x: 'Protein', y: Math.round(r.protein) },
        { x: 'Carbs', y: Math.round(r.carbs) },
        { x: 'Fat', y: Math.round(r.fat) },
      ] : [],
      totalGrams: Math.round(total),
    });
  } catch (error) {
    console.error('Error getting macro split chart:', error);
    return sendChartError(res);
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 13. Est-1RM Trend — weekly best Brzycki estimate for the
// client's most-logged weighted exercise (charter v3 4c).
//
// Formula mirrors services/oneRepMaxService.mjs estimateBrzycki1RM:
// weight / (1.0278 - 0.0278 * reps), reps clamped to 1..15, capped at
// the same 1500 lb human ceiling. One exercise per chart keeps the
// series honest — mixing lifts would fabricate a meaningless line.
// ─────────────────────────────────────────────────────────────

export async function getEstOneRmTrendChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `WITH target AS (
         -- Most-logged lift, case/whitespace-insensitive so variants don't
         -- split the count (and the outer query below catches ALL variants).
         SELECT LOWER(TRIM(wl."exerciseName")) AS name_key,
                MAX(wl."exerciseName") AS display_name
         FROM workout_logs wl
         JOIN workout_sessions ws ON wl."sessionId" = ws.id
         WHERE ws."userId" = :userId AND ws.status = 'completed'
           AND wl.weight > 0 AND wl.reps BETWEEN 1 AND 15
           AND ws.date >= NOW() - INTERVAL '180 days'
         GROUP BY LOWER(TRIM(wl."exerciseName"))
         ORDER BY COUNT(*) DESC, MAX(wl.weight) DESC
         LIMIT 1
       )
       SELECT
         TO_CHAR(DATE_TRUNC('week', ws.date), 'MM/DD') AS week,
         -- Take the real MAX est-1RM (no LEAST clamp). Clamping garbage to a
         -- flat 1500 plotted a FABRICATED PR from a fat-finger weight — the same
         -- bug oneRepMaxService.estimateBrzycki1RM was rewritten to reject. Over-
         -- ceiling sets are DROPPED below (WHERE), so a week with only garbage
         -- yields no bar rather than a fake 1500.
         MAX(ROUND(wl.weight / (1.0278 - 0.0278 * wl.reps)))::float AS est,
         (SELECT display_name FROM target) AS exercise
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND LOWER(TRIM(wl."exerciseName")) = (SELECT name_key FROM target)
         AND wl.weight > 0 AND wl.reps BETWEEN 1 AND 15
         AND (wl.weight / (1.0278 - 0.0278 * wl.reps)) <= 1500
         AND ws.date >= NOW() - INTERVAL '180 days'
       GROUP BY DATE_TRUNC('week', ws.date)
       ORDER BY DATE_TRUNC('week', ws.date)`,
      { userId }, 'getEstOneRmTrendChart');

    res.json({
      success: true,
      exercise: rows[0]?.exercise ?? null,
      data: rows.map(r => ({ x: r.week, y: r.est })),
    });
  } catch (error) {
    console.error('Error getting est-1RM trend chart:', error);
    return sendChartError(res);
  }
}
// ─────────────────────────────────────────────────────────────
// SECTION: 14. Exercise Timeline — the Workout Rolodex drill (charter v3 4d):
// full per-exercise history for one named exercise — heaviest set, reps at
// that weight, and set count per training day. Exact-name match against the
// client's own logs (names come from the exercise-frequency chart, so the
// lookup is always grounded in real logged spellings).
// ─────────────────────────────────────────────────────────────

export async function getExerciseTimelineChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const exerciseName = String(req.query.exercise ?? '').trim();
    if (!exerciseName || exerciseName.length > 120) {
      return res.status(400).json({ success: false, message: 'exercise query param is required' });
    }
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT DISTINCT ON (ws.date::date)
         TO_CHAR(ws.date::date, 'YYYY-MM-DD') AS day,
         wl.weight::float AS top_weight,
         wl.reps::int AS top_reps,
         (SELECT COUNT(*)::int FROM workout_logs w2
            WHERE w2."sessionId" = ws.id AND w2."exerciseName" = wl."exerciseName") AS sets
       FROM workout_logs wl
       JOIN workout_sessions ws ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND wl."exerciseName" = :exerciseName
       ORDER BY ws.date::date DESC, wl.weight DESC NULLS LAST
       LIMIT 100`,
      { userId, exerciseName }, 'getExerciseTimelineChart');

    res.json({
      success: true,
      exercise: exerciseName,
      data: rows.reverse().map(r => ({
        x: r.day,
        y: r.top_weight ?? 0,
        reps: r.top_reps ?? 0,
        sets: r.sets ?? 0,
      })),
    });
  } catch (error) {
    console.error('Error getting exercise timeline chart:', error);
    return sendChartError(res);
  }
}
// ─────────────────────────────────────────────────────────────
// SECTION: 15. Weekly Ring Source — per-session facts for the Apex
// Ascension Rings (weekly workouts + weekly volume).
//
// CANONICAL SOURCE: workout_sessions LEFT JOIN workout_logs — a completed
// session with no set logs still counts toward the workouts ring.
//
// TZ TRUTH (Sean's 2026-07-12 ruling, same as the heatmap): the server
// ships the RAW session timestamp and never renders a calendar day or
// truncates a week — the client buckets "this week" in the USER'S local
// time, so a Sunday 22:00 PT workout lands on the user's Sunday, not
// UTC Monday. 28 days always covers the current + prior full local week.
// ─────────────────────────────────────────────────────────────

const RING_SOURCE_WINDOW_DAYS = 28;

export async function getWeeklyRingSourceChart(req, res) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         ws.date AS ts,
         COALESCE(ws.duration, 0)::int AS duration_minutes,
         COALESCE(SUM(wl.weight * wl.reps), 0)::float AS volume,
         COUNT(wl.id)::int AS sets
       FROM workout_sessions ws
       LEFT JOIN workout_logs wl ON wl."sessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '28 days'
       GROUP BY ws.id, ws.date, ws.duration
       ORDER BY ws.date`,
      { userId }, 'getWeeklyRingSourceChart');

    res.json({
      success: true,
      data: {
        windowDays: RING_SOURCE_WINDOW_DAYS,
        sessions: rows.map(r => ({
          ts: r.ts,
          durationMinutes: r.duration_minutes,
          volume: Math.round(r.volume),
          sets: r.sets,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting weekly ring source:', error);
    return sendChartError(res);
  }
}
