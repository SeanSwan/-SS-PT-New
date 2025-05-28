/**
 * Dashboard Routes
 * ===============
 * API routes for client dashboard data including stats and analytics
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics for authenticated user
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    // For now, return mock data until we implement proper stat tracking
    const stats = {
      totalWorkouts: 156,
      weeklyWorkouts: 4,
      monthlyWorkouts: 24,
      currentStreak: 7,
      longestStreak: 18,
      averageWorkoutDuration: 45,
      caloriesBurned: 2340,
      goalsCompleted: 12,
      lastWorkout: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      weeklyProgress: 0.8, // 80% of weekly goal
      monthlyProgress: 0.6 // 60% of monthly goal
    };

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
});

/**
 * @route   GET /api/dashboard/recent-activity
 * @desc    Get recent activity for the user
 * @access  Private
 */
router.get('/recent-activity', protect, async (req, res) => {
  try {
    // Mock recent activity data
    const activities = [
      {
        id: 1,
        type: 'workout',
        title: 'Upper Body Strength',
        description: 'Completed 45-minute workout',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        icon: '💪',
        points: 150
      },
      {
        id: 2,
        type: 'achievement',
        title: 'Week Warrior',
        description: 'Completed 7 days in a row',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        icon: '🏆',
        points: 500
      },
      {
        id: 3,
        type: 'milestone',
        title: '100 Workouts',
        description: 'Reached 100 total workouts',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '🎯',
        points: 1000
      }
    ];

    res.status(200).json({
      success: true,
      activities
    });
  } catch (error) {
    logger.error('Error fetching recent activity:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activity'
    });
  }
});

export default router;
