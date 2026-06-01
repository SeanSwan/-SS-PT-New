import { getWorkoutSession, Op } from '../models/index.mjs';
import sequelize from '../database.mjs';
import { calculateExerciseTotalsFromLogs } from './analyticsExerciseTotalsService.mjs';
import { calculateVolumeOverTimeFromLogs } from './analyticsVolumeService.mjs';

// Models resolved at call time (after initializeModelsCache() runs at startup)
const getModels = () => ({
  WorkoutSession: getWorkoutSession(),
});

const EMPTY_FREQUENCY = { period: '30 days', totalWorkouts: 0, avgPerWeek: 0, currentStreak: 0, longestStreak: 0, uniqueWorkoutDays: 0 };
const EMPTY_SESSION_USAGE = { total: 0, solo: { count: 0, percentage: 0 }, trainerLed: { count: 0, percentage: 0 } };

/**
 * Analytics Service
 * Processes workout data for visualization and insights
 * Pools data from both solo client workouts AND trainer-led sessions
 */

/**
 * Calculate total volume and reps by exercise category
 * Used for strength profile radar chart and exercise distribution
 *
 * @param {string} userId - User ID
 * @param {Object} options - Time range and filter options
 * @returns {Object} Exercise totals by category
 */
export async function calculateExerciseTotals(userId, options = {}) {
  try {
    return await calculateExerciseTotalsFromLogs(userId, options);

  } catch (error) {
    console.error('Error calculating exercise totals:', error);
    throw error;
  }
}

/**
 * Calculate volume over time for trend analysis
 * Used for volume progression charts
 *
 * @param {string} userId - User ID
 * @param {Object} options - Time range and grouping options
 * @returns {Array} Time series data points
 */
export async function calculateVolumeOverTime(userId, options = {}) {
  try {
    return await calculateVolumeOverTimeFromLogs(userId, options);

  } catch (error) {
    console.error('Error calculating volume over time:', error);
    throw error;
  }
}

/**
 * Calculate session usage statistics
 * Shows how client is using their session package (solo vs trainer-led ratio)
 *
 * @param {string} userId - User ID
 * @param {Object} options - Filter options
 * @returns {Object} Usage statistics
 */
export async function calculateSessionUsageStats(userId, options = {}) {
  try {
    const { WorkoutSession } = getModels();
    if (!WorkoutSession) return EMPTY_SESSION_USAGE;
    const whereClause = {
      userId,
      status: 'completed'
    };

    if (options.startDate || options.endDate) {
      whereClause.date = {};
      if (options.startDate) whereClause.date[Op.gte] = options.startDate;
      if (options.endDate) whereClause.date[Op.lte] = options.endDate;
    }

    const [soloCount, trainerLedCount, totalWorkouts] = await Promise.all([
      WorkoutSession.count({
        where: { ...whereClause, sessionType: 'solo' }
      }),
      WorkoutSession.count({
        where: { ...whereClause, sessionType: 'trainer-led' }
      }),
      WorkoutSession.count({ where: whereClause })
    ]);

    const soloPercentage = totalWorkouts > 0 ? ((soloCount / totalWorkouts) * 100).toFixed(1) : 0;
    const trainerLedPercentage = totalWorkouts > 0 ? ((trainerLedCount / totalWorkouts) * 100).toFixed(1) : 0;

    return {
      total: totalWorkouts,
      solo: {
        count: soloCount,
        percentage: parseFloat(soloPercentage)
      },
      trainerLed: {
        count: trainerLedCount,
        percentage: parseFloat(trainerLedPercentage)
      }
    };

  } catch (error) {
    console.error('Error calculating session usage stats:', error);
    throw error;
  }
}

/**
 * Get personal records for a client
 * Finds maximum weight lifted for each exercise
 *
 * @param {string} userId - User ID
 * @returns {Array} Array of personal records
 */
export async function getPersonalRecords(userId) {
  // canonical-surface-audit 2026-04-13 (PR rewire slice):
  // The prior implementation used Sequelize ORM with includes through a
  // schema-drifted empty chain: WorkoutSession → WorkoutExercise → Set.
  // Real prod schema (verified via information_schema on DATABASE_URL):
  //   - workout_exercises: 0 rows, no `exerciseName` column
  //   - sets: 0 rows, real columns are weightUsed/repsCompleted (not weight/reps)
  //   - workout_sessions: `date` column (not `sessionDate`)
  // The real per-set data for production sessions lives in `workout_logs`:
  //   id, sessionId, exerciseName, setNumber, reps, weight, tempo, rest, rpe
  // Frontend consumer (ClientProgressDashboardPage.tsx:354,478-487) expects
  // an array of `{ exerciseName, weight, reps, date, sessionId, unit }`, so
  // the raw query returns the top row per exerciseName (highest weight, then
  // latest date as tiebreak) and the outer result is sorted by max_weight DESC
  // to match the frontend's `slice(0, 4)` Highlights block ordering.
  try {
    const [rows] = await sequelize.query(
      `WITH max_per_exercise AS (
         SELECT DISTINCT ON (wl."exerciseName")
           wl."exerciseName" AS exercise_name,
           wl.weight::float AS max_weight,
           wl.reps AS reps_at_max,
           ws.date AS session_date,
           ws.id AS session_id
         FROM workout_logs wl
         JOIN workout_sessions ws ON wl."sessionId" = ws.id
         WHERE ws."userId" = :userId
           AND ws.status = 'completed'
           AND wl.weight IS NOT NULL
           AND wl.weight > 0
         ORDER BY wl."exerciseName", wl.weight DESC, ws.date DESC
       )
       SELECT * FROM max_per_exercise
       ORDER BY max_weight DESC`,
      { replacements: { userId } }
    );

    // Defensive map + filter — the SQL already excludes null/zero weight, but
    // the service must not crash if a row slips through (driver quirks, etc.).
    return (rows || [])
      .filter((r) => r && r.max_weight != null && Number(r.max_weight) > 0)
      .map((r) => ({
        exerciseName: r.exercise_name,
        weight: Number(r.max_weight),
        reps: r.reps_at_max != null ? Number(r.reps_at_max) : null,
        date: r.session_date,
        sessionId: r.session_id,
        unit: 'lbs',
      }));
  } catch (error) {
    console.error('Error getting personal records:', error);
    return [];
  }
}

/**
 * Get workout frequency statistics
 *
 * @param {string} userId - User ID
 * @param {number} days - Number of days to analyze (default 30)
 * @returns {Object} Frequency statistics
 */
export async function getWorkoutFrequency(userId, days = 30) {
  try {
    const { WorkoutSession } = getModels();
    if (!WorkoutSession) return { ...EMPTY_FREQUENCY, period: `${days} days` };
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const workouts = await WorkoutSession.findAll({
      where: {
        userId,
        status: 'completed',
        date: { [Op.gte]: startDate }
      },
      order: [['date', 'ASC']]
    });

    const totalWorkouts = workouts.length;
    const avgPerWeek = (totalWorkouts / days) * 7;

    // Calculate streak (consecutive days with workouts)
    let currentStreak = 0;
    let longestStreak = 0;
    let streakDays = 0;

    const workoutDates = workouts.map(w => new Date(w.date).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(workoutDates)].sort();

    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) {
        streakDays = 1;
      } else {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          streakDays++;
        } else {
          if (streakDays > longestStreak) longestStreak = streakDays;
          streakDays = 1;
        }
      }
    }

    if (streakDays > longestStreak) longestStreak = streakDays;

    // Check if streak is current
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (uniqueDates.includes(today) || uniqueDates.includes(yesterdayStr)) {
      currentStreak = streakDays;
    }

    return {
      period: `${days} days`,
      totalWorkouts,
      avgPerWeek: parseFloat(avgPerWeek.toFixed(1)),
      currentStreak,
      longestStreak,
      uniqueWorkoutDays: uniqueDates.length
    };

  } catch (error) {
    console.error('Error getting workout frequency:', error);
    throw error;
  }
}
