/**
 * Shared Dashboard Routes
 * =======================
 *
 * Purpose:
 * - Provide shared dashboard endpoints for client, trainer, and admin roles.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md
 *
 * Architecture Overview (ASCII):
 * Dashboard UI -> /api/dashboard/stats -> user stats -> PostgreSQL
 * Dashboard UI -> /api/dashboard/overview -> overview data -> PostgreSQL
 * Dashboard UI -> /api/dashboard/recent-activity -> activity feed -> PostgreSQL
 *
 * Middleware Flow:
 * Request -> protect -> handler -> response
 *
 * API Endpoints:
 * - GET /api/dashboard/stats
 * - GET /api/dashboard/overview
 * - GET /api/dashboard/recent-activity
 *
 * Security:
 * - JWT auth required
 *
 * Testing:
 * - See ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md (testing checklist)
 */

import express from 'express';
import sequelize from '../../database.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';
import { getAllModels, Op } from '../../models/index.mjs';

const router = express.Router();

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().split('T')[0];
};

const buildStreaks = (dateKeys) => {
  if (!dateKeys || dateKeys.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dateSet = new Set(dateKeys.filter(Boolean));
  if (dateSet.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sortedDates = Array.from(dateSet).sort();
  let longestStreak = 0;
  let currentRun = 0;
  let prevDate = null;

  const toDate = (key) => new Date(`${key}T00:00:00Z`);

  sortedDates.forEach((key) => {
    if (!prevDate) {
      currentRun = 1;
    } else {
      const diffDays = Math.round((toDate(key) - toDate(prevDate)) / (1000 * 60 * 60 * 24));
      currentRun = diffDays === 1 ? currentRun + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, currentRun);
    prevDate = key;
  });

  const today = new Date();
  const todayKey = toDateKey(today);
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  let cursor = null;
  if (todayKey && dateSet.has(todayKey)) {
    cursor = new Date(today);
  } else if (dateSet.has(toDateKey(yesterday))) {
    cursor = new Date(yesterday);
  }

  let currentStreak = 0;
  while (cursor && dateSet.has(toDateKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { currentStreak, longestStreak };
};

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics for current user
 * @access  Private (Client, Trainer, Admin)
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const userRole = req.user.role;
    const models = getAllModels();
    const Session = models.Session;
    const WorkoutSession = models.WorkoutSession || models.Session;
    const User = models.User;
    const ClientProgress = models.ClientProgress;

    const workoutDateField = models.WorkoutSession ? 'date' : 'sessionDate';
    const workoutWhere = { userId, status: 'completed' };

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);
    const streakStart = new Date(now);
    streakStart.setDate(now.getDate() - 90);

    const [
      totalWorkouts,
      weeklyWorkouts,
      monthlyWorkouts,
      avgDurationRow,
      streakRows,
      progressRecord,
    ] = await Promise.all([
      WorkoutSession.count({ where: workoutWhere }),
      WorkoutSession.count({
        where: { ...workoutWhere, [workoutDateField]: { [Op.gte]: weekStart } },
      }),
      WorkoutSession.count({
        where: { ...workoutWhere, [workoutDateField]: { [Op.gte]: monthStart } },
      }),
      WorkoutSession.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']],
        where: workoutWhere,
        raw: true,
      }),
      WorkoutSession.findAll({
        attributes: [[sequelize.fn('DATE', sequelize.col(workoutDateField)), 'dateKey']],
        where: { ...workoutWhere, [workoutDateField]: { [Op.gte]: streakStart } },
        group: [sequelize.fn('DATE', sequelize.col(workoutDateField))],
        order: [[sequelize.fn('DATE', sequelize.col(workoutDateField)), 'ASC']],
        raw: true,
      }),
      ClientProgress ? ClientProgress.findOne({ where: { userId } }) : Promise.resolve(null),
    ]);

    const dateKeys = streakRows.map((row) => toDateKey(row.dateKey || row.date)).filter(Boolean);
    const { currentStreak, longestStreak } = buildStreaks(dateKeys);

    const averageWorkoutDuration = Number(avgDurationRow?.avgDuration || 0);
    const achievements = progressRecord?.achievements || [];
    const goalsCompleted = Array.isArray(achievements) ? achievements.length : 0;

    const stats = {
      totalWorkouts,
      weeklyWorkouts,
      monthlyWorkouts,
      currentStreak,
      longestStreak,
      averageWorkoutDuration,
      caloriesBurned: 0,
      goalsCompleted,
    };

    if (userRole === 'trainer') {
      const [activeClients, sessionsThisWeek, avgRatingRow] = await Promise.all([
        Session.count({
          distinct: true,
          col: 'userId',
          where: {
            trainerId: userId,
            userId: { [Op.not]: null },
            status: ['assigned', 'scheduled', 'confirmed', 'completed'],
          },
        }),
        Session.count({
          where: {
            trainerId: userId,
            sessionDate: { [Op.gte]: weekStart },
          },
        }),
        Session.findOne({
          attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
          where: {
            trainerId: userId,
            rating: { [Op.not]: null },
          },
          raw: true,
        }),
      ]);

      stats.activeClients = activeClients;
      stats.sessionsThisWeek = sessionsThisWeek;
      stats.avgRating = Number(Number(avgRatingRow?.avgRating || 0).toFixed(1));
    }

    if (userRole === 'admin') {
      const [totalUsers, activeUsers] = await Promise.all([
        User.count(),
        User.count({ where: { updatedAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      ]);

      stats.totalUsers = totalUsers;
      stats.activeUsers = activeUsers;
    }

    return res.status(200).json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
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
router.get('/overview', protect, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const userRole = req.user.role;
    const models = getAllModels();
    const Session = models.Session;
    const WorkoutSession = models.WorkoutSession || models.Session;
    const Notification = models.Notification;

    const workoutDateField = models.WorkoutSession ? 'date' : 'sessionDate';
    const workoutWhere = { userId, status: 'completed' };

    const upcomingWhere = {
      sessionDate: { [Op.gte]: new Date() },
      status: { [Op.in]: ['scheduled', 'confirmed'] },
    };

    if (userRole === 'client') {
      upcomingWhere.userId = userId;
    } else if (userRole === 'trainer') {
      upcomingWhere.trainerId = userId;
    }

    const [upcomingSessionsRaw, notificationsRaw, workoutsRaw] = await Promise.all([
      Session.findAll({
        where: upcomingWhere,
        order: [['sessionDate', 'ASC']],
        limit: 5,
        raw: true,
      }),
      Notification
        ? Notification.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 5,
            raw: true,
          })
        : [],
      WorkoutSession.findAll({
        where: workoutWhere,
        order: [[workoutDateField, 'DESC']],
        limit: 5,
        raw: true,
      }),
    ]);

    const recentActivity = workoutsRaw.map((workout) => ({
      id: workout.id,
      type: 'workout_completed',
      message: `Completed ${workout.title || 'Workout Session'}`,
      timestamp: workout[workoutDateField] || workout.completedAt || workout.createdAt,
      icon: 'workout',
    }));

    const upcomingSessions = upcomingSessionsRaw.map((session) => ({
      id: session.id,
      title: session.title || 'Training Session',
      trainerId: session.trainerId,
      clientId: session.userId,
      datetime: session.sessionDate,
      duration: session.duration,
      type: 'personal',
      status: session.status,
    }));

    const notifications = notificationsRaw.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      timestamp: notification.createdAt,
      isRead: notification.read,
      priority: notification.type === 'admin' ? 'high' : 'normal',
    }));

    return res.status(200).json({
      success: true,
      overview: {
        recentActivity,
        upcomingSessions,
        notifications,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const models = getAllModels();
    const WorkoutSession = models.WorkoutSession || models.Session;
    const workoutDateField = models.WorkoutSession ? 'date' : 'sessionDate';

    const workouts = await WorkoutSession.findAll({
      where: {
        userId,
        status: 'completed',
        [workoutDateField]: { [Op.not]: null },
      },
      order: [[workoutDateField, 'DESC']],
      limit: 10,
      raw: true,
    });

    const activities = workouts.map((workout) => ({
      id: workout.id,
      type: 'workout',
      title: workout.title || 'Workout Session',
      description: workout.duration
        ? `Completed ${workout.duration} minute workout`
        : 'Completed workout session',
      timestamp: workout[workoutDateField] || workout.completedAt || workout.createdAt,
      icon: 'workout',
      points: workout.experiencePoints || 0,
    }));

    return res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching recent activity',
    });
  }
});

export default router;
