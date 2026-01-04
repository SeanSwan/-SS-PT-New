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
