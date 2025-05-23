/**
 * Dashboard Routes
 * ===============
 * 
 * Handles dashboard statistics and overview data for the SwanStudios platform.
 * Provides endpoints for client dashboard, trainer overview, and admin metrics.
 * 
 * Master Prompt v28 Alignment:
 * - Real-time dashboard data
 * - Cross-role statistics
 * - Performance metrics
 * - Gamification integration
 */

import express from 'express';
import { protect, adminOnly, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// Middleware for authentication
const authenticate = protect;
const authorizeTrainerOrAdmin = trainerOrAdminOnly;
const authorizeAdmin = adminOnly;

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics for current user
 * @access  Private (Client, Trainer, Admin)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Mock dashboard stats - in production, this would query actual data
    const stats = {
      totalWorkouts: Math.floor(Math.random() * 200) + 50,
      weeklyWorkouts: Math.floor(Math.random() * 7) + 1,
      monthlyWorkouts: Math.floor(Math.random() * 30) + 10,
      currentStreak: Math.floor(Math.random() * 20) + 1,
      longestStreak: Math.floor(Math.random() * 50) + 10,
      averageWorkoutDuration: Math.floor(Math.random() * 60) + 30,
      caloriesBurned: Math.floor(Math.random() * 5000) + 1000,
      goalsCompleted: Math.floor(Math.random() * 20) + 5,
      // Role-specific stats
      ...(userRole === 'trainer' && {
        activeClients: Math.floor(Math.random() * 50) + 10,
        sessionsThisWeek: Math.floor(Math.random() * 20) + 5,
        clientSatisfaction: (Math.random() * 2 + 8).toFixed(1), // 8.0-10.0
      }),
      ...(userRole === 'admin' && {
        totalUsers: Math.floor(Math.random() * 1000) + 500,
        activeTrainers: Math.floor(Math.random() * 100) + 20,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        systemUptime: '99.9%',
      }),
    };

    res.status(200).json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/dashboard/overview
 * @desc    Get comprehensive dashboard overview
 * @access  Private (Client, Trainer, Admin)
 */
router.get('/overview', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Mock overview data
    const overview = {
      recentActivity: [
        {
          id: 1,
          type: 'workout_completed',
          message: 'Completed Upper Body Strength',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          icon: '💪',
        },
        {
          id: 2,
          type: 'achievement_earned',
          message: 'Earned "Consistency Champion" badge',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          icon: '🏆',
        },
        {
          id: 3,
          type: 'goal_reached',
          message: 'Reached weekly workout goal',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          icon: '🎯',
        },
      ],
      upcomingSessions: userRole === 'client' ? [
        {
          id: 1,
          title: 'Personal Training Session',
          trainer: 'Sarah Wilson',
          datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          type: 'personal',
        },
        {
          id: 2,
          title: 'Nutrition Consultation',
          trainer: 'Mike Johnson',
          datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          duration: 45,
          type: 'consultation',
        },
      ] : [],
      notifications: [
        {
          id: 1,
          type: 'reminder',
          title: 'Workout Reminder',
          message: "Don't forget your scheduled workout in 2 hours!",
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: 'normal',
        },
        {
          id: 2,
          type: 'achievement',
          title: 'New Achievement Available',
          message: "You're close to earning the 'Iron Warrior' badge!",
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          isRead: false,
          priority: 'low',
        },
      ],
    };

    res.status(200).json({
      success: true,
      overview,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/dashboard/metrics
 * @desc    Get performance metrics for trainers and admins
 * @access  Private (Trainer, Admin)
 */
router.get('/metrics', authenticate, authorizeTrainerOrAdmin, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const timeframe = req.query.timeframe || '30d'; // 7d, 30d, 90d, 1y

    // Mock metrics data
    const metrics = {
      performance: {
        clientRetention: userRole === 'trainer' ? (Math.random() * 20 + 80).toFixed(1) : null,
        sessionCompletion: (Math.random() * 10 + 90).toFixed(1),
        clientSatisfaction: (Math.random() * 2 + 8).toFixed(1),
        growthRate: (Math.random() * 20 + 5).toFixed(1),
      },
      trends: {
        newClients: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 10) + 1,
        })),
        workoutCompletions: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 50) + 20,
        })),
      },
      ...(userRole === 'admin' && {
        systemHealth: {
          serverUptime: '99.9%',
          responseTime: '120ms',
          errorRate: '0.1%',
          activeUsers: Math.floor(Math.random() * 500) + 200,
        },
        revenue: {
          total: Math.floor(Math.random() * 100000) + 50000,
          monthly: Math.floor(Math.random() * 20000) + 10000,
          growth: (Math.random() * 30 + 10).toFixed(1),
        },
      }),
    };

    res.status(200).json({
      success: true,
      metrics,
      timeframe,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/dashboard/health
 * @desc    Get system health status for admin dashboard
 * @access  Private (Admin only)
 */
router.get('/health', authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Mock system health data
    const health = {
      status: 'healthy',
      services: {
        database: {
          status: 'healthy',
          responseTime: '15ms',
          connections: 45,
          maxConnections: 100,
        },
        mcpServers: {
          gamification: {
            status: 'healthy',
            url: 'http://localhost:8002',
            responseTime: '25ms',
          },
          workout: {
            status: 'healthy',
            url: 'http://localhost:8000',
            responseTime: '20ms',
          },
          yolo: {
            status: 'degraded',
            url: 'http://localhost:8003',
            responseTime: 'timeout',
            error: 'Connection timeout',
          },
        },
        redis: {
          status: 'healthy',
          responseTime: '5ms',
          memoryUsage: '45%',
        },
        webSocket: {
          status: 'healthy',
          activeConnections: 127,
          messageQueue: 0,
        },
      },
      performance: {
        cpuUsage: '23%',
        memoryUsage: '67%',
        diskUsage: '45%',
        requestsPerMinute: 250,
      },
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;