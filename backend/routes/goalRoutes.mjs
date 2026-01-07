/**
 * Goal Routes - Client Goals + Trainer Metrics
 * ===========================================
 * Exposes client goal management endpoints and trainer goal metrics.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/PHASE-8-DASHBOARD-API-GAPS-BLUEPRINT.md
 *
 * Architecture Overview:
 * [Client/Trainer UI] -> [goalRoutes] -> [goalController + models] -> [PostgreSQL]
 *
 * Middleware Flow:
 * Client -> protect -> (trainerOrAdminOnly for trainer metrics) -> handler
 *
 * Endpoints:
 * - GET    /api/goals
 * - POST   /api/goals
 * - GET    /api/goals/analytics
 * - GET    /api/goals/categories/stats
 * - GET    /api/goals/trainer/:trainerId/achieved
 * - GET    /api/goals/:id
 * - PUT    /api/goals/:id
 * - PATCH  /api/goals/:id/progress
 * - DELETE /api/goals/:id
 *
 * Mermaid Sequence (Trainer Goals Achieved):
 * sequenceDiagram
 *   participant Trainer
 *   participant Routes
 *   participant DB
 *   Trainer->>Routes: GET /api/goals/trainer/:id/achieved
 *   Routes->>DB: Select active assignments
 *   Routes->>DB: Count completed goals (this week)
 *   DB-->>Routes: count
 *   Routes-->>Trainer: 200 OK
 */

import express from 'express';
import moment from 'moment';
import { Op } from 'sequelize';
import goalController from '../controllers/goalController.mjs';
import { protect, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import getModels from '../models/associations.mjs';
import redis from '../services/cache/redisWrapper.mjs';

const router = express.Router();
const METRICS_CACHE_TTL_SECONDS = 300;

// All goal routes require auth
router.use(protect);

const assertGoalOwnership = async (goalId, user) => {
  const models = await getModels();
  const { Goal } = models;
  const goal = await Goal.findByPk(goalId);

  if (!goal) {
    return { status: 404, message: 'Goal not found' };
  }

  if (user.role !== 'admin' && String(goal.userId) !== String(user.id)) {
    return { status: 403, message: 'Access denied: Goal owner only' };
  }

  return { goal };
};

/**
 * GET /api/goals
 * Get authenticated user's goals
 */
router.get('/', async (req, res) => {
  try {
    req.params.userId = req.user.id;
    return await goalController.getUserGoals(req, res);
  } catch (error) {
    logger.error('Error in GET /api/goals', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ success: false, message: 'Failed to fetch goals' });
  }
});

/**
 * POST /api/goals
 * Create a goal for the authenticated user
 */
router.post('/', async (req, res) => {
  try {
    req.params.userId = req.user.id;
    return await goalController.createGoal(req, res);
  } catch (error) {
    logger.error('Error in POST /api/goals', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ success: false, message: 'Failed to create goal' });
  }
});

/**
 * GET /api/goals/analytics
 * Goal analytics for the authenticated user
 */
router.get('/analytics', async (req, res) => {
  try {
    req.params.userId = req.user.id;
    return await goalController.getGoalAnalytics(req, res);
  } catch (error) {
    logger.error('Error in GET /api/goals/analytics', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ success: false, message: 'Failed to fetch goal analytics' });
  }
});

/**
 * GET /api/goals/categories/stats
 * Category stats for the authenticated user
 */
router.get('/categories/stats', async (req, res) => {
  try {
    req.params.userId = req.user.id;
    return await goalController.getGoalCategoriesStats(req, res);
  } catch (error) {
    logger.error('Error in GET /api/goals/categories/stats', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ success: false, message: 'Failed to fetch goal categories' });
  }
});

/**
 * GET /api/goals/trainer/:trainerId/achieved
 * Trainer's client goals achieved this week
 */
router.get('/trainer/:trainerId/achieved', trainerOrAdminOnly, async (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    if (!Number.isFinite(trainerId)) {
      return res.status(400).json({ success: false, message: 'Invalid trainerId' });
    }

    if (req.user.role === 'trainer' && Number(req.user.id) !== trainerId) {
      return res.status(403).json({ success: false, message: 'Trainers can only view their own goals' });
    }

    const models = await getModels();
    const { ClientTrainerAssignment, Goal } = models;

    const weekKey = moment().startOf('isoWeek').format('YYYY-MM-DD');
    const cacheKey = `trainer:goalsAchieved:${trainerId}:${weekKey}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }
    } catch (cacheError) {
      logger.warn('Goal metrics cache read failed', {
        error: cacheError.message,
        cacheKey
      });
    }

    const assignments = await ClientTrainerAssignment.findAll({
      where: { trainerId, status: 'active' },
      attributes: ['clientId']
    });

    const clientIds = assignments.map((row) => row.clientId);
    const weekStart = moment().startOf('isoWeek').toDate();
    const weekEnd = moment().endOf('isoWeek').toDate();

    if (clientIds.length === 0) {
      const emptyResult = {
        success: true,
        data: {
          trainerId,
          achievedThisWeek: 0,
          weekStart,
          weekEnd,
          clientCount: 0
        }
      };
      try {
        await redis.set(cacheKey, JSON.stringify(emptyResult), METRICS_CACHE_TTL_SECONDS);
      } catch (cacheError) {
        logger.warn('Goal metrics cache write failed', {
          error: cacheError.message,
          cacheKey
        });
      }
      return res.status(200).json(emptyResult);
    }

    const achievedThisWeek = await Goal.count({
      where: {
        userId: { [Op.in]: clientIds },
        status: 'completed',
        completedAt: { [Op.between]: [weekStart, weekEnd] }
      }
    });

    const result = {
      success: true,
      data: {
        trainerId,
        achievedThisWeek,
        weekStart,
        weekEnd,
        clientCount: clientIds.length
      }
    };
    try {
      await redis.set(cacheKey, JSON.stringify(result), METRICS_CACHE_TTL_SECONDS);
    } catch (cacheError) {
      logger.warn('Goal metrics cache write failed', {
        error: cacheError.message,
        cacheKey
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in GET /api/goals/trainer/:trainerId/achieved', {
      error: error.message,
      trainerId: req.params.trainerId,
      userId: req.user?.id
    });
    return res.status(500).json({ success: false, message: 'Failed to fetch achieved goals' });
  }
});

/**
 * GET /api/goals/:id
 * Get a goal by ID (owner or admin)
 */
router.get('/:id', async (req, res) => {
  try {
    const ownership = await assertGoalOwnership(req.params.id, req.user);
    if (ownership.status) {
      return res.status(ownership.status).json({ success: false, message: ownership.message });
    }
    return await goalController.getGoalById(req, res);
  } catch (error) {
    logger.error('Error in GET /api/goals/:id', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ success: false, message: 'Failed to fetch goal' });
  }
});

/**
 * PUT /api/goals/:id
 * Update a goal by ID (owner or admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const ownership = await assertGoalOwnership(req.params.id, req.user);
    if (ownership.status) {
      return res.status(ownership.status).json({ success: false, message: ownership.message });
    }
    return await goalController.updateGoal(req, res);
  } catch (error) {
    logger.error('Error in PUT /api/goals/:id', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ success: false, message: 'Failed to update goal' });
  }
});

/**
 * PATCH /api/goals/:id/progress
 * Update goal progress (owner or admin)
 */
router.patch('/:id/progress', async (req, res) => {
  try {
    const ownership = await assertGoalOwnership(req.params.id, req.user);
    if (ownership.status) {
      return res.status(ownership.status).json({ success: false, message: ownership.message });
    }
    return await goalController.updateGoalProgress(req, res);
  } catch (error) {
    logger.error('Error in PATCH /api/goals/:id/progress', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ success: false, message: 'Failed to update goal progress' });
  }
});

/**
 * DELETE /api/goals/:id
 * Delete a goal (owner or admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const ownership = await assertGoalOwnership(req.params.id, req.user);
    if (ownership.status) {
      return res.status(ownership.status).json({ success: false, message: ownership.message });
    }
    return await goalController.deleteGoal(req, res);
  } catch (error) {
    logger.error('Error in DELETE /api/goals/:id', { error: error.message, userId: req.user?.id });
    return res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
});

export default router;
