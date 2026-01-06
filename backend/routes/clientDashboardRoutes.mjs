/**
 * Client Dashboard Routes
 * =======================
 *
 * Real data endpoints for client dashboard integrations.
 *
 * Blueprint Reference: docs/ai-workflow/reviews/dashboard-architecture-review.md
 */

import express from 'express';
import sequelize from '../database.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import { getAllModels, Op } from '../models/index.mjs';

const router = express.Router();

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/**
 * @route   GET /api/client/progress
 * @desc    Get client progress profile
 * @access  Private
 */
router.get('/progress', protect, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const models = getAllModels();
    const ClientProgress = models.ClientProgress;

    const [progress] = await ClientProgress.findOrCreate({
      where: { userId },
      defaults: { userId }
    });

    return res.status(200).json({
      success: true,
      progress
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch client progress'
    });
  }
});

/**
 * @route   GET /api/client/achievements
 * @desc    Get client achievement list
 * @access  Private
 */
router.get('/achievements', protect, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const models = getAllModels();
    const ClientProgress = models.ClientProgress;

    const progress = await ClientProgress.findOne({ where: { userId } });
    const achievements = progress?.achievements || [];

    return res.status(200).json({
      success: true,
      achievements,
      count: Array.isArray(achievements) ? achievements.length : 0
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements'
    });
  }
});

/**
 * @route   GET /api/client/challenges
 * @desc    Get client challenge participation
 * @access  Private
 */
router.get('/challenges', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const models = getAllModels();
    const ChallengeParticipant = models.ChallengeParticipant;
    const Challenge = models.Challenge;

    if (!ChallengeParticipant || !Challenge || !isUuid(String(userId))) {
      return res.status(200).json({ success: true, challenges: [] });
    }

    const participations = await ChallengeParticipant.findAll({
      where: { userId },
      include: [{ model: Challenge }],
      order: [['updatedAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      challenges: participations
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch challenges'
    });
  }
});

/**
 * @route   GET /api/client/workout-stats
 * @desc    Get client workout statistics
 * @access  Private
 */
router.get('/workout-stats', protect, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const models = getAllModels();
    const WorkoutSession = models.WorkoutSession || models.Session;
    const workoutDateField = models.WorkoutSession ? 'date' : 'sessionDate';

    const [totalWorkouts, totalMinutes, avgDurationRow, lastWorkout] = await Promise.all([
      WorkoutSession.count({ where: { userId, status: 'completed' } }),
      WorkoutSession.sum('duration', { where: { userId, status: 'completed' } }),
      WorkoutSession.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']],
        where: { userId, status: 'completed' },
        raw: true
      }),
      WorkoutSession.findOne({
        where: { userId, status: 'completed', [workoutDateField]: { [Op.not]: null } },
        order: [[workoutDateField, 'DESC']],
        raw: true
      })
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalWorkouts,
        totalMinutes: Number(totalMinutes || 0),
        averageDuration: Number(avgDurationRow?.avgDuration || 0),
        lastWorkoutDate: lastWorkout ? lastWorkout[workoutDateField] : null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch workout stats'
    });
  }
});

export default router;
