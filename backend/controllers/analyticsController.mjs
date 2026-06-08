import {
  calculateExerciseTotals,
  calculateVolumeOverTime,
  calculateSessionUsageStats,
  getPersonalRecords,
  getWorkoutFrequency
} from '../services/analyticsService.mjs';
import {
  getExerciseHistoryFromLogs,
  getExerciseVarietyFromLogs,
} from '../services/analyticsExerciseHistoryService.mjs';
import { updateClientProgress, getPhaseRecommendations } from '../services/nasmProgressionService.mjs';
import logger from '../utils/logger.mjs';

const ANALYTICS_INTERNAL_ERROR = 'analytics_internal_error';

function sendAnalyticsError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: ANALYTICS_INTERNAL_ERROR,
  });
}

function logAnalyticsError(message, error, req) {
  logger.error(message, {
    userId: req.params?.userId,
    errorName: error.name,
    errorCode: error.code || ANALYTICS_INTERNAL_ERROR,
  });
}

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
    logAnalyticsError('Error getting strength profile', error, req);
    return sendAnalyticsError(res, 'Failed to get strength profile');
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
    logAnalyticsError('Error getting volume progression', error, req);
    return sendAnalyticsError(res, 'Failed to get volume progression');
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
    logAnalyticsError('Error getting session usage', error, req);
    return sendAnalyticsError(res, 'Failed to get session usage');
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
    logAnalyticsError('Error getting personal records', error, req);
    return sendAnalyticsError(res, 'Failed to get personal records');
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
    logAnalyticsError('Error getting frequency stats', error, req);
    return sendAnalyticsError(res, 'Failed to get frequency stats');
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
    logAnalyticsError('Error getting NASM progress', error, req);
    return sendAnalyticsError(res, 'Failed to get NASM progress');
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
    logAnalyticsError('Error getting NASM recommendations', error, req);
    return sendAnalyticsError(res, 'Failed to get NASM recommendations');
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
    logAnalyticsError('Error getting analytics dashboard', error, req);
    return sendAnalyticsError(res, 'Failed to get analytics dashboard');
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise History (Rolodex)
// PURPOSE: All-time exercise frequency, volume, PRs from workout logs
// WHY: Powers the Exercise Rolodex full-page chart
// ─────────────────────────────────────────────────────────────

/**
 * Get exercise history for a user (all-time exercise stats).
 * Uses canonical workout_logs joined to workout_sessions.
 * GET /api/analytics/:userId/exercise-history
 */
export async function getExerciseHistory(req, res) {
  try {
    const { userId } = req.params;
    const { muscleGroup, sort = 'timesPerformed', cursor, limit = 50 } = req.query;

    const history = await getExerciseHistoryFromLogs(userId, {
      muscleGroup,
      sort,
      cursor,
      limit,
      sequelize: req.app.get('sequelize'),
    });

    return res.json({
      success: true,
      ...history,
    });

  } catch (error) {
    logAnalyticsError('Error getting exercise history', error, req);
    return sendAnalyticsError(res, 'Failed to get exercise history');
  }
}

/**
 * Get exercise variety stats for gamification.
 * GET /api/analytics/:userId/exercise-variety
 */
export async function getExerciseVariety(req, res) {
  try {
    const { userId } = req.params;
    const variety = await getExerciseVarietyFromLogs(userId, {
      sequelize: req.app.get('sequelize'),
    });

    return res.json({
      success: true,
      ...variety,
    });

  } catch (error) {
    logAnalyticsError('Error getting exercise variety', error, req);
    return sendAnalyticsError(res, 'Failed to get variety stats');
  }
}
