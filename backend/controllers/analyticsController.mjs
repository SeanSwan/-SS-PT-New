import {
  calculateExerciseTotals,
  calculateVolumeOverTime,
  calculateSessionUsageStats,
  getPersonalRecords,
  getWorkoutFrequency
} from '../services/analyticsService.mjs';
import { updateClientProgress, getPhaseRecommendations } from '../services/nasmProgressionService.mjs';

/**
 * Analytics Controller
 * Provides workout analytics and insights for clients and trainers
 */

/**
 * Get strength profile for radar chart
 * GET /api/analytics/:userId/strength-profile
 */
export async function getStrengthProfile(req, res) {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const exerciseTotals = await calculateExerciseTotals(userId, options);

    // Convert category totals to radar chart format
    const categories = exerciseTotals.categories;

    // Calculate percentages for radar chart (0-100 scale)
    const totalVolume = exerciseTotals.totalVolume;

    const radarData = [
      {
        subject: 'Chest',
        value: totalVolume > 0 ? Math.round((categories.chest.totalVolume / totalVolume) * 100) : 0,
        fullMark: 100
      },
      {
        subject: 'Back',
        value: totalVolume > 0 ? Math.round((categories.back.totalVolume / totalVolume) * 100) : 0,
        fullMark: 100
      },
      {
        subject: 'Shoulders',
        value: totalVolume > 0 ? Math.round((categories.shoulders.totalVolume / totalVolume) * 100) : 0,
        fullMark: 100
      },
      {
        subject: 'Arms',
        value: totalVolume > 0 ? Math.round((categories.arms.totalVolume / totalVolume) * 100) : 0,
        fullMark: 100
      },
      {
        subject: 'Legs',
        value: totalVolume > 0 ? Math.round((categories.legs.totalVolume / totalVolume) * 100) : 0,
        fullMark: 100
      },
      {
        subject: 'Core',
        value: totalVolume > 0 ? Math.round((categories.core.totalVolume / totalVolume) * 100) : 0,
        fullMark: 100
      }
    ];

    res.json({
      success: true,
      data: {
        radarData,
        categoryTotals: categories,
        totalVolume,
        totalSessions: exerciseTotals.totalSessions
      }
    });

  } catch (error) {
    console.error('Error getting strength profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get strength profile',
      error: error.message
    });
  }
}

/**
 * Get volume progression over time
 * GET /api/analytics/:userId/volume-progression
 */
export async function getVolumeProgression(req, res) {
  try {
    const { userId } = req.params;
    const { startDate, endDate, groupBy = 'week' } = req.query;

    const options = { groupBy };
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const volumeData = await calculateVolumeOverTime(userId, options);

    res.json({
      success: true,
      data: volumeData
    });

  } catch (error) {
    console.error('Error getting volume progression:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get volume progression',
      error: error.message
    });
  }
}

/**
 * Get session usage statistics (solo vs trainer-led)
 * GET /api/analytics/:userId/session-usage
 */
export async function getSessionUsage(req, res) {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const usageStats = await calculateSessionUsageStats(userId, options);

    res.json({
      success: true,
      data: usageStats
    });

  } catch (error) {
    console.error('Error getting session usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session usage',
      error: error.message
    });
  }
}

/**
 * Get personal records
 * GET /api/analytics/:userId/personal-records
 */
export async function getClientPersonalRecords(req, res) {
  try {
    const { userId } = req.params;

    const records = await getPersonalRecords(userId);

    res.json({
      success: true,
      data: records
    });

  } catch (error) {
    console.error('Error getting personal records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personal records',
      error: error.message
    });
  }
}

/**
 * Get workout frequency stats
 * GET /api/analytics/:userId/frequency
 */
export async function getFrequencyStats(req, res) {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const frequency = await getWorkoutFrequency(userId, parseInt(days));

    res.json({
      success: true,
      data: frequency
    });

  } catch (error) {
    console.error('Error getting frequency stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get frequency stats',
      error: error.message
    });
  }
}

/**
 * Get NASM progression status
 * GET /api/analytics/:userId/nasm-progress
 */
export async function getNASMProgress(req, res) {
  try {
    const { userId } = req.params;
    const { workoutSessionId } = req.query;

    if (!workoutSessionId) {
      return res.status(400).json({
        success: false,
        message: 'workoutSessionId query parameter is required'
      });
    }

    const progress = await updateClientProgress(userId, workoutSessionId);

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Error getting NASM progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get NASM progress',
      error: error.message
    });
  }
}

/**
 * Get NASM phase recommendations
 * GET /api/analytics/nasm-recommendations/:level
 */
export async function getNASMRecommendations(req, res) {
  try {
    const { level } = req.params;

    const recommendations = getPhaseRecommendations(level);

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    console.error('Error getting NASM recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get NASM recommendations',
      error: error.message
    });
  }
}

/**
 * Get comprehensive workout analytics dashboard
 * GET /api/analytics/:userId/dashboard
 */
export async function getAnalyticsDashboard(req, res) {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const [exerciseTotals, frequency, sessionUsage, personalRecords] = await Promise.all([
      calculateExerciseTotals(userId),
      getWorkoutFrequency(userId, parseInt(days)),
      calculateSessionUsageStats(userId),
      getPersonalRecords(userId)
    ]);

    res.json({
      success: true,
      data: {
        exerciseTotals,
        frequency,
        sessionUsage,
        personalRecords: personalRecords.slice(0, 10), // Top 10 PRs
        period: `${days} days`
      }
    });

  } catch (error) {
    console.error('Error getting analytics dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics dashboard',
      error: error.message
    });
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise History (Rolodex)
// PURPOSE: All-time exercise frequency, volume, PRs from materialized view
// WHY: Powers the Exercise Rolodex full-page chart
// ─────────────────────────────────────────────────────────────

/**
 * Get exercise history for a user (all-time exercise stats).
 * Uses materialized view for performance — no heavy JOINs per request.
 * GET /api/analytics/:userId/exercise-history
 */
export async function getExerciseHistory(req, res) {
  try {
    const { userId } = req.params;
    const { muscleGroup, sort = 'timesPerformed', cursor, limit = 50 } = req.query;

    const sequelize = req.app.get('sequelize');
    if (!sequelize) {
      return res.json({
        success: true,
        exercises: [],
        totalUniqueExercises: 0,
        totalAvailableExercises: 0,
        varietyScore: 0,
        usedMaterializedView: false,
      });
    }

    // Try materialized view first, fall back to direct query
    let exercises = [];
    let usedMV = false;

    try {
      const whereClause = muscleGroup && muscleGroup !== 'All'
        ? `AND "primaryMuscles" ILIKE :muscleGroup`
        : '';

      const cursorClause = cursor
        ? `AND ("lastPerformedDate", "exerciseId") < (:cursorDate, :cursorId)`
        : '';

      const orderMap = {
        timesPerformed: '"timesPerformed" DESC',
        totalVolume: '"totalVolume" DESC',
        lastPerformed: '"lastPerformedDate" DESC',
        alphabetical: '"exerciseName" ASC',
      };
      const orderBy = orderMap[sort] || orderMap.timesPerformed;

      const replacements = { userId, limit: parseInt(limit) };
      if (muscleGroup && muscleGroup !== 'All') replacements.muscleGroup = `%${muscleGroup}%`;
      if (cursor) {
        const [cursorDate, cursorId] = cursor.split(',');
        replacements.cursorDate = cursorDate;
        replacements.cursorId = parseInt(cursorId);
      }

      const [rows] = await sequelize.query(
        `SELECT * FROM "UserExerciseStats_MV"
         WHERE "userId" = :userId ${whereClause} ${cursorClause}
         ORDER BY ${orderBy}, "exerciseId" DESC
         LIMIT :limit`,
        { replacements }
      );

      exercises = rows || [];
      usedMV = true;
    } catch {
      // MV doesn't exist — fall back to direct query
      try {
        const [rows] = await sequelize.query(
          `SELECT
            e.id AS "exerciseId", e.name AS "exerciseName",
            e."primaryMuscles", e.category,
            COUNT(DISTINCT we."workoutSessionId") AS "timesPerformed",
            COALESCE(MAX(s."weightUsed"), 0) AS "maxWeight",
            COALESCE(MAX(s."repsCompleted"), 0) AS "maxReps",
            COALESCE(SUM(s."weightUsed" * s."repsCompleted"), 0) AS "totalVolume",
            MAX(ws.date) AS "lastPerformedDate",
            MIN(ws.date) AS "firstPerformedDate"
          FROM "WorkoutExercises" we
          JOIN "Exercises" e ON we."exerciseId" = e.id
          JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
          LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
          WHERE ws."userId" = :userId AND ws.status = 'completed'
          GROUP BY e.id, e.name, e."primaryMuscles", e.category
          ORDER BY "timesPerformed" DESC
          LIMIT :limit`,
          { replacements: { userId, limit: parseInt(limit) } }
        );
        exercises = rows || [];
      } catch (fallbackErr) {
        console.warn('Exercise history fallback query failed (tables may not exist):', fallbackErr.message);
        exercises = [];
      }
    }

    // Get total unique exercises and available exercises count
    const [totalResult] = await sequelize.query(
      `SELECT COUNT(DISTINCT we."exerciseId") as total
       FROM "WorkoutExercises" we
       JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
       WHERE ws."userId" = :userId AND ws.status = 'completed'`,
      { replacements: { userId } }
    ).catch(() => [[{ total: 0 }]]);

    const [availableResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM "Exercises" WHERE "isActive" = true`
    ).catch(() => [[{ total: 840 }]]);

    const totalUnique = parseInt(totalResult?.[0]?.total || 0);
    const totalAvailable = parseInt(availableResult?.[0]?.total || 840);

    res.json({
      success: true,
      exercises,
      totalUniqueExercises: totalUnique,
      totalAvailableExercises: totalAvailable,
      varietyScore: totalAvailable > 0 ? parseFloat(((totalUnique / totalAvailable) * 100).toFixed(1)) : 0,
      usedMaterializedView: usedMV,
    });
  } catch (error) {
    console.error('Error getting exercise history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exercise history',
      error: error.message,
    });
  }
}

/**
 * Get exercise variety stats for gamification.
 * GET /api/analytics/:userId/exercise-variety
 */
export async function getExerciseVariety(req, res) {
  try {
    const { userId } = req.params;
    const sequelize = req.app.get('sequelize');

    // New exercises this month
    const [newThisMonth] = await sequelize.query(
      `SELECT COUNT(DISTINCT we."exerciseId") as count
       FROM "WorkoutExercises" we
       JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
       WHERE ws."userId" = :userId
         AND ws.status = 'completed'
         AND ws.date >= DATE_TRUNC('month', NOW())
         AND we."exerciseId" NOT IN (
           SELECT DISTINCT we2."exerciseId"
           FROM "WorkoutExercises" we2
           JOIN "WorkoutSessions" ws2 ON we2."workoutSessionId" = ws2.id
           WHERE ws2."userId" = :userId
             AND ws2.status = 'completed'
             AND ws2.date < DATE_TRUNC('month', NOW())
         )`,
      { replacements: { userId } }
    ).catch(() => [[{ count: 0 }]]);

    // Muscle groups hit this month
    const [muscleGroups] = await sequelize.query(
      `SELECT DISTINCT e."primaryMuscles"
       FROM "WorkoutExercises" we
       JOIN "Exercises" e ON we."exerciseId" = e.id
       JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
       WHERE ws."userId" = :userId
         AND ws.status = 'completed'
         AND ws.date >= DATE_TRUNC('month', NOW())`,
      { replacements: { userId } }
    ).catch(() => [[]]);

    res.json({
      success: true,
      newExercisesThisMonth: parseInt(newThisMonth?.[0]?.count || 0),
      muscleGroupsHitThisMonth: muscleGroups?.length || 0,
    });
  } catch (error) {
    console.error('Error getting exercise variety:', error);
    res.status(500).json({ success: false, message: 'Failed to get variety stats' });
  }
}
