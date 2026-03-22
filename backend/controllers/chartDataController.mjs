/**
 * ============================================================================
 * FILE: chartDataController.mjs
 * PURPOSE: Dedicated chart data endpoints for 9 Victory charts
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides optimized SQL queries that return pre-shaped
 * data for each Victory chart. One endpoint per chart, each returns array of
 * {x, y} or {label, value} objects ready for Victory consumption.
 *
 * HOW IT FITS IN THE APP: Victory Chart Component → useAnalytics → GET /api/analytics/:userId/chart-* → this controller
 * KEY DECISIONS: Server-side aggregation so frontend receives chart-ready data.
 *   No N+1 queries — each endpoint is a single SQL aggregate.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Helper
// ─────────────────────────────────────────────────────────────

const safeQuery = async (sequelize, sql, replacements) => {
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows || [];
  } catch { return []; }
};

// Validate userId is a positive integer — returns parsed int or null
const parseUserId = (raw) => {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// ─────────────────────────────────────────────────────────────
// SECTION: 1. Workout Frequency — bar chart (workouts per week, last 12 weeks)
// ─────────────────────────────────────────────────────────────

export async function getWorkoutFrequencyChart(req, res) {
  try {
    const userId = parseUserId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR(DATE_TRUNC('week', ws.date), 'MM/DD') AS week,
         COUNT(*)::int AS count
       FROM "WorkoutSessions" ws
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', ws.date)
       ORDER BY DATE_TRUNC('week', ws.date)`,
      { userId });

    res.json({ success: true, data: rows.map(r => ({ x: r.week, y: r.count })) });
  } catch (error) {
    console.error('Error getting workout frequency chart:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 2. Weight Progression — line chart (body weight over time)
// ─────────────────────────────────────────────────────────────

export async function getWeightProgressionChart(req, res) {
  try {
    const userId = parseUserId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR("measurementDate", 'MM/DD') AS date,
         weight::float AS weight
       FROM body_measurements
       WHERE "userId" = :userId AND weight IS NOT NULL
       ORDER BY "measurementDate" ASC
       LIMIT 50`,
      { userId });

    res.json({ success: true, data: rows.map(r => ({ x: r.date, y: r.weight })) });
  } catch (error) {
    console.error('Error getting weight progression chart:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 3. Muscle Group Focus — radar chart (volume by muscle group)
// ─────────────────────────────────────────────────────────────

export async function getMuscleGroupFocusChart(req, res) {
  try {
    const userId = parseUserId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         COALESCE(e."bodyPartCategory", 'other') AS muscle,
         COALESCE(SUM(s."weightUsed" * s."repsCompleted"), 0)::float AS volume
       FROM "WorkoutExercises" we
       JOIN "Exercises" e ON we."exerciseId" = e.id
       JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
       LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '90 days'
       GROUP BY e."bodyPartCategory"
       ORDER BY volume DESC`,
      { userId });

    // Normalize to 0-100 scale for radar
    const maxVol = Math.max(...rows.map(r => r.volume), 1);
    res.json({
      success: true,
      data: rows.map(r => ({ x: r.muscle, y: Math.round((r.volume / maxVol) * 100) }))
    });
  } catch (error) {
    console.error('Error getting muscle group focus chart:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 4. Macro Split — pie/donut chart (avg daily macros)
// ─────────────────────────────────────────────────────────────

export async function getMacroSplitChart(req, res) {
  try {
    const userId = parseUserId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         COALESCE(SUM(protein), 0)::float AS protein,
         COALESCE(SUM(carbs), 0)::float AS carbs,
         COALESCE(SUM(fat), 0)::float AS fat
       FROM daily_macro_logs
       WHERE "userId" = :userId
         AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      { userId });

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
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 5. Cardio Endurance — line chart (duration by cardio type)
// ─────────────────────────────────────────────────────────────

export async function getCardioEnduranceChart(req, res) {
  try {
    const userId = parseUserId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR(ws.date, 'MM/DD') AS date,
         ws.date AS raw_date,
         e.name AS exercise,
         COALESCE(SUM(s.duration), 0)::int AS duration_sec,
         COALESCE(SUM(s.distance), 0)::float AS distance
       FROM "WorkoutExercises" we
       JOIN "Exercises" e ON we."exerciseId" = e.id
       JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
       LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND (
           LOWER(e.name) LIKE '%running%' OR LOWER(e.name) LIKE '%run%'
           OR LOWER(e.name) LIKE '%bike%' OR LOWER(e.name) LIKE '%cycling%'
           OR LOWER(e.name) LIKE '%elliptical%'
           OR LOWER(e.name) LIKE '%swimming%' OR LOWER(e.name) LIKE '%swim%'
           OR LOWER(e.name) LIKE '%treadmill%'
           OR LOWER(e.name) LIKE '%rowing%'
           OR e."bodyPartCategory" = 'cardio'
         )
         AND ws.date >= NOW() - INTERVAL '90 days'
       GROUP BY ws.date, e.name
       ORDER BY ws.date`,
      { userId });

    // Group by cardio type
    const typeMap = {};
    for (const r of rows) {
      const name = r.exercise.toLowerCase();
      let type = 'other';
      if (name.includes('run') || name.includes('treadmill')) type = 'running';
      else if (name.includes('bike') || name.includes('cycling')) type = 'cycling';
      else if (name.includes('elliptical')) type = 'elliptical';
      else if (name.includes('swim')) type = 'swimming';
      else if (name.includes('row')) type = 'rowing';

      if (!typeMap[type]) typeMap[type] = [];
      typeMap[type].push({ x: r.date, y: Math.round(r.duration_sec / 60) });
    }

    res.json({ success: true, data: typeMap });
  } catch (error) {
    console.error('Error getting cardio endurance chart:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 6. Session Frequency — area chart (sessions per week, 24 weeks)
// ─────────────────────────────────────────────────────────────

export async function getSessionFrequencyChart(req, res) {
  try {
    const userId = parseUserId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR(DATE_TRUNC('week', ws.date), 'MM/DD') AS week,
         COUNT(*)::int AS sessions,
         SUM(ws.duration)::int AS total_minutes
       FROM "WorkoutSessions" ws
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '24 weeks'
       GROUP BY DATE_TRUNC('week', ws.date)
       ORDER BY DATE_TRUNC('week', ws.date)`,
      { userId });

    res.json({ success: true, data: rows.map(r => ({ x: r.week, y: r.sessions, minutes: r.total_minutes })) });
  } catch (error) {
    console.error('Error getting session frequency chart:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 7. Body Fat Trend — line chart (body fat % over time)
// ─────────────────────────────────────────────────────────────

export async function getBodyFatTrendChart(req, res) {
  try {
    const userId = parseUserId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         TO_CHAR("measurementDate", 'MM/DD') AS date,
         "bodyFatPercentage"::float AS bf
       FROM body_measurements
       WHERE "userId" = :userId AND "bodyFatPercentage" IS NOT NULL
       ORDER BY "measurementDate" ASC
       LIMIT 50`,
      { userId });

    res.json({ success: true, data: rows.map(r => ({ x: r.date, y: r.bf })) });
  } catch (error) {
    console.error('Error getting body fat trend chart:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 8. Muscle Recovery — heatmap (days since last hit per muscle group)
// ─────────────────────────────────────────────────────────────

export async function getMuscleRecoveryChart(req, res) {
  try {
    const userId = parseUserId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const sequelize = req.app.get('sequelize');

    const rows = await safeQuery(sequelize,
      `SELECT
         COALESCE(e."bodyPartCategory", 'other') AS muscle,
         MAX(ws.date) AS last_trained,
         EXTRACT(DAY FROM NOW() - MAX(ws.date))::int AS days_since,
         COUNT(DISTINCT ws.id)::int AS times_last_30d
       FROM "WorkoutExercises" we
       JOIN "Exercises" e ON we."exerciseId" = e.id
       JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.date >= NOW() - INTERVAL '30 days'
       GROUP BY e."bodyPartCategory"
       ORDER BY days_since DESC`,
      { userId });

    res.json({
      success: true,
      data: rows.map(r => ({
        x: r.muscle,
        y: r.days_since,
        sessions: r.times_last_30d,
        status: r.days_since <= 2 ? 'recovering' : r.days_since <= 4 ? 'ready' : 'overdue'
      }))
    });
  } catch (error) {
    console.error('Error getting muscle recovery chart:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: 9. RPE by Exercise — scatter/grouped bar (last 24 sessions)
// ─────────────────────────────────────────────────────────────

export async function getRPEByExerciseChart(req, res) {
  try {
    const userId = parseUserId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const sequelize = req.app.get('sequelize');

    // Get the last 24 completed sessions
    const rows = await safeQuery(sequelize,
      `SELECT
         e.name AS exercise,
         ws.date,
         TO_CHAR(ws.date, 'MM/DD') AS session_date,
         COALESCE(AVG(s.rpe), we."difficultyRating", ws.intensity)::float AS avg_rpe
       FROM "WorkoutExercises" we
       JOIN "Exercises" e ON we."exerciseId" = e.id
       JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
       LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'
         AND ws.id IN (
           SELECT id FROM "WorkoutSessions"
           WHERE "userId" = :userId AND status = 'completed'
           ORDER BY date DESC LIMIT 24
         )
       GROUP BY e.name, ws.date, we."difficultyRating", ws.intensity
       ORDER BY ws.date, e.name`,
      { userId });

    // Group by exercise for multi-series
    const byExercise = {};
    for (const r of rows) {
      if (!byExercise[r.exercise]) byExercise[r.exercise] = [];
      byExercise[r.exercise].push({
        x: r.session_date,
        y: Math.round(r.avg_rpe * 10) / 10,
      });
    }

    // Return top 8 most frequent exercises
    const sorted = Object.entries(byExercise)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);

    res.json({
      success: true,
      data: Object.fromEntries(sorted),
      exercises: sorted.map(([name]) => name),
    });
  } catch (error) {
    console.error('Error getting RPE by exercise chart:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
