/**
 * GOAL CONTROLLER - COMPREHENSIVE PERSONAL GOAL MANAGEMENT SYSTEM
 * ==============================================================
 * Production-ready controller for personal goal setting, tracking,
 * and milestone management with business intelligence
 */

import { Op } from 'sequelize';
import db from '../database.mjs';
import logger from '../utils/logger.mjs';

// Import models through associations for proper relationships
import getModels from '../models/associations.mjs';

const parsePositiveInteger = (value, fallback = null) => {
  const stringValue = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(stringValue)) return fallback;

  return Number(stringValue);
};

const parseBoundedPositiveInteger = (value, fallback, max) =>
  Math.min(parsePositiveInteger(value, fallback), max);

const toNonNegativeNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
};

/**
 * Verify the requesting user has access to a goal.
 * Owner, admin, or trainer assigned to the goal's client may proceed.
 * Public goals are readable by anyone authenticated.
 * @throws {Object} Error with statusCode 403 if unauthorized
 */
async function assertGoalAccess(goal, requestingUser, { allowPublic = false, transaction = null } = {}) {
  if (goal.userId === requestingUser.id) return;
  if (requestingUser.role === 'admin') return;
  if (allowPublic && goal.isPublic === true) return;

  if (requestingUser.role === 'trainer') {
    const models = await getModels();
    if (models.ClientTrainerAssignment) {
      const assignment = await models.ClientTrainerAssignment.findOne({
        where: { trainerId: requestingUser.id, clientId: goal.userId, status: 'active' },
        transaction
      });
      if (assignment) return;
    }
  }

  const err = new Error('Not authorized to access this goal');
  err.statusCode = 403;
  throw err;
}

const goalController = {
  /**
   * GET ALL USER GOALS - WITH FILTERS & PAGINATION
   * =============================================
   * GET /api/v1/gamification/users/:userId/goals
   */
  getUserGoals: async (req, res) => {
    try {
      const models = await getModels();
      const { Goal, User } = models;

      if (!Goal) {
        return res.status(200).json({
          success: true,
          goals: [],
          pagination: { total: 0, page: 1, totalPages: 0 },
          summary: { total: 0, active: 0, completed: 0, paused: 0, avgProgress: 0 },
          message: 'Goals feature not yet initialized'
        });
      }

      const { userId } = req.params;
      const {
        status,
        category,
        priority,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const normalizedPage = parsePositiveInteger(page, 1);
      const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);
      const offset = (normalizedPage - 1) * normalizedLimit;
      
      // Validate user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Build where clause — exclude soft-deleted goals by default
      const whereClause = { userId, status: { [Op.ne]: 'deleted' } };

      if (status && status !== 'all') whereClause.status = status;
      if (category && category !== 'all') whereClause.category = category;
      if (priority && priority !== 'all') whereClause.priority = priority;

      // Sorting configuration
      const validSortFields = ['createdAt', 'deadline', 'priority', 'progressPercentage', 'title'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const goals = await Goal.findAndCountAll({
        where: whereClause,
        order: [[sortField, order]],
        limit: normalizedLimit,
        offset
      });

      // Calculate summary statistics (exclude soft-deleted)
      const summaryStats = await Goal.findAll({
        where: { userId, status: { [Op.ne]: 'deleted' } },
        attributes: [
          'status',
          [db.fn('COUNT', db.col('id')), 'count'],
          [db.fn('AVG', db.col('progressPercentage')), 'avgProgress']
        ],
        group: ['status'],
        raw: true
      });

      const summary = {
        total: goals.count,
        active: summaryStats.find(s => s.status === 'active')?.count || 0,
        completed: summaryStats.find(s => s.status === 'completed')?.count || 0,
        paused: summaryStats.find(s => s.status === 'paused')?.count || 0,
        overdue: 0 // Will be calculated below
      };

      // Calculate overdue goals
      const overdueCount = await Goal.count({
        where: {
          userId,
          status: 'active',
          deadline: { [Op.lt]: new Date() }
        }
      });
      summary.overdue = overdueCount;

      return res.status(200).json({
        success: true,
        goals: goals.rows,
        pagination: {
          total: goals.count,
          page: normalizedPage,
          limit: normalizedLimit,
          pages: Math.ceil(goals.count / normalizedLimit)
        },
        summary
      });
    } catch (error) {
      logger.error('[GoalController] Error fetching user goals:', { error: error.message, stack: error.stack });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user goals',
        /* error detail omitted */
      });
    }
  },

  /**
   * GET SINGLE GOAL - WITH DETAILED ANALYTICS
   * ========================================
   * GET /api/v1/gamification/goals/:id
   */
  getGoalById: async (req, res) => {
    try {
      const models = await getModels();
      const { Goal, User } = models;
      
      const { id } = req.params;

      const goal = await Goal.findByPk(id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }]
      });

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      // Authorization check — owner, trainer (assigned), admin, or public goal
      await assertGoalAccess(goal, req.user, { allowPublic: true });

      // Calculate additional metrics
      const now = new Date();
      const startDate = new Date(goal.startDate);
      const deadline = new Date(goal.deadline);
      
      const totalDays = Math.ceil((deadline - startDate) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      
      const expectedProgress = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;
      const progressDifference = goal.progressPercentage - expectedProgress;

      // Generate insights
      let status = goal.status;
      let statusMessage = '';
      
      if (goal.status === 'active') {
        if (now > deadline) {
          status = 'overdue';
          statusMessage = `Overdue by ${Math.abs(daysRemaining)} days`;
        } else if (daysRemaining <= 3) {
          status = 'urgent';
          statusMessage = `${daysRemaining} days remaining`;
        } else if (daysRemaining <= 7) {
          status = 'approaching';
          statusMessage = `${daysRemaining} days remaining`;
        } else {
          statusMessage = `${daysRemaining} days remaining`;
        }
      }

      const goalWithMetrics = {
        ...goal.toJSON(),
        analytics: {
          totalDays,
          daysElapsed,
          daysRemaining,
          expectedProgress: Math.round(expectedProgress * 100) / 100,
          progressDifference: Math.round(progressDifference * 100) / 100,
          isAheadOfSchedule: progressDifference > 5,
          isBehindSchedule: progressDifference < -5,
          estimatedCompletion: goal.progressPercentage > 0 ? calculateEstimatedCompletion(goal, daysElapsed) : null
        },
        statusInfo: {
          current: status,
          message: statusMessage,
          isOverdue: now > deadline && goal.status === 'active'
        }
      };

      return res.status(200).json({
        success: true,
        goal: goalWithMetrics
      });
    } catch (error) {
      if (error.statusCode === 403) {
        return res.status(403).json({ success: false, message: error.message });
      }
      logger.error('[GoalController] Error fetching goal:', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch goal',
        /* error detail omitted */
      });
    }
  },

  /**
   * CREATE NEW GOAL
   * ==============
   * POST /api/v1/gamification/goals
   */
  createGoal: async (req, res) => {
    const models = await getModels();
    const { Goal } = models;

    if (!Goal) {
      return res.status(503).json({ success: false, message: 'Goals feature is not yet available' });
    }

    let transaction;
    try {
      transaction = await db.transaction();

      const {
        title,
        description,
        targetValue,
        unit,
        category = 'fitness',
        priority = 'medium',
        deadline,
        xpReward = 0,
        completionBonus = 0,
        isPublic = false,
        trackingMethod = 'manual',
        trackingFrequency = 'weekly',
        reminderSettings,
        milestones = []
      } = req.body;

      const goalOwnerId = parsePositiveInteger(req.params.userId ?? req.user?.id);

      if (!goalOwnerId) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Invalid goal owner' });
      }

      // Input validation
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Title is required' });
      }
      if (!unit || typeof unit !== 'string') {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Unit is required' });
      }
      if (!deadline) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Deadline is required' });
      }

      // Validate targetValue is a positive finite number
      const numTarget = Number(targetValue);
      if (!Number.isFinite(numTarget) || numTarget <= 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Target value must be a positive number' });
      }

      // Cap XP rewards to prevent point inflation
      const safeXpReward = Math.min(Math.max(0, Number(xpReward) || 0), 10000);
      const safeCompletionBonus = Math.min(Math.max(0, Number(completionBonus) || 0), 50000);

      // Validate deadline
      const deadlineDate = new Date(deadline);
      const now = new Date();

      if (isNaN(deadlineDate.getTime()) || deadlineDate <= now) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Deadline must be a valid future date' });
      }

      // Validate and process milestones (max 10, percentage 1-99)
      const safeMilestones = Array.isArray(milestones) ? milestones.slice(0, 10) : [];
      const processedMilestones = safeMilestones.map(m => ({
        percentage: Math.min(99, Math.max(1, Number(m.percentage) || 50)),
        description: (typeof m.description === 'string' ? m.description : '').substring(0, 500) || `${m.percentage}% milestone`,
        xpBonus: Math.min(5000, Math.max(0, Number(m.xpBonus) || 0)),
        achieved: false
      }));

      // Validate category and priority
      const validCategories = ['fitness', 'nutrition', 'wellness', 'performance', 'social', 'other'];
      const validPriorities = ['low', 'medium', 'high'];
      const safeCategory = validCategories.includes(category) ? category : 'fitness';
      const safePriority = validPriorities.includes(priority) ? priority : 'medium';

      const goal = await Goal.create({
        userId: goalOwnerId,
        title: title.trim().substring(0, 200),
        description: typeof description === 'string' ? description.trim().substring(0, 2000) : '',
        targetValue: numTarget,
        unit: unit.trim().substring(0, 50),
        category: safeCategory,
        priority: safePriority,
        deadline: deadlineDate,
        xpReward: safeXpReward,
        completionBonus: safeCompletionBonus,
        isPublic: isPublic === true,
        trackingMethod,
        trackingFrequency,
        reminderSettings: reminderSettings || {
          enabled: true,
          frequency: 'weekly',
          time: '09:00',
          days: ['monday', 'wednesday', 'friday']
        },
        milestones: processedMilestones,
        status: 'active',
        startDate: now
      }, { transaction });

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Goal created successfully',
        goal
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error('[GoalController] Error creating goal:', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to create goal',
        /* error detail omitted */
      });
    }
  },

  /**
   * UPDATE GOAL PROGRESS
   * ===================
   * PUT /api/v1/gamification/goals/:id/progress
   */
  updateGoalProgress: async (req, res) => {
    const models = await getModels();
    const { Goal, User, PointTransaction } = models;

    if (!Goal) {
      return res.status(503).json({ success: false, message: 'Goals feature is not yet available' });
    }

    let transaction;
    try {
      transaction = await db.transaction();

      const { id } = req.params;
      const { currentValue, notes } = req.body;

      // Validate currentValue is a finite number
      const numCurrentValue = Number(currentValue);
      if (currentValue === undefined || !Number.isFinite(numCurrentValue) || numCurrentValue < 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Current value must be a non-negative number'
        });
      }

      // Get goal with lock to prevent concurrent updates
      const goal = await Goal.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!goal) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      // Check authorization — owner, admin, or assigned trainer
      await assertGoalAccess(goal, req.user, { transaction });

      if (goal.status !== 'active') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot update progress on inactive goal'
        });
      }

      // Calculate progress (safe against division by zero)
      const oldValue = goal.currentValue;
      const newValue = Math.max(0, numCurrentValue);
      const safeTargetValue = Math.max(0.001, Number(goal.targetValue) || 1);
      const progressPercentage = Math.min(100, (newValue / safeTargetValue) * 100);
      const wasCompleted = progressPercentage >= 100 && goal.status === 'active';

      // Update progress history — cap at 100 entries to prevent unbounded growth
      const MAX_HISTORY = 100;
      const existingHistory = goal.progressHistory || [];
      const progressHistory = [...existingHistory.slice(-(MAX_HISTORY - 1)), {
        date: new Date().toISOString(),
        value: newValue,
        change: newValue - oldValue,
        percentage: progressPercentage,
        notes: typeof notes === 'string' ? notes.substring(0, 500) : undefined
      }];

      // Check milestones
      const milestonesAchieved = [];
      const updatedMilestones = (goal.milestones || []).map(milestone => {
        if (!milestone.achieved && progressPercentage >= milestone.percentage) {
          milestone.achieved = true;
          milestone.achievedAt = new Date().toISOString();
          milestonesAchieved.push(milestone);
        }
        return milestone;
      });

      // Update goal
      const updatedFields = {
        currentValue: newValue,
        progressPercentage,
        progressHistory,
        milestones: updatedMilestones,
        lastProgressUpdate: new Date()
      };

      if (wasCompleted) {
        updatedFields.status = 'completed';
        updatedFields.completedAt = new Date();
      }

      await goal.update(updatedFields, { transaction });

      // Award XP for milestones and completion with correct running balance
      // Use SELECT FOR UPDATE to prevent concurrent XP corruption
      let totalXpAwarded = 0;
      const user = await User.findByPk(goal.userId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (user) {
        let runningBalance = Number(user.points) || 0;

        // Award milestone XP
        for (const milestone of milestonesAchieved) {
          if (milestone.xpBonus > 0) {
            runningBalance += milestone.xpBonus;
            totalXpAwarded += milestone.xpBonus;

            await PointTransaction.create({
              userId: goal.userId,
              points: milestone.xpBonus,
              balance: runningBalance,
              transactionType: 'earn',
              source: 'goal_milestone',
              sourceId: goal.id,
              description: `Goal Milestone: ${goal.title} (${milestone.percentage}%)`,
              metadata: { goalId: goal.id, milestonePercentage: milestone.percentage }
            }, { transaction });
          }
        }

        // Award completion XP
        if (wasCompleted) {
          const completionXp = goal.xpReward + goal.completionBonus;
          if (completionXp > 0) {
            runningBalance += completionXp;
            totalXpAwarded += completionXp;

            await PointTransaction.create({
              userId: goal.userId,
              points: completionXp,
              balance: runningBalance,
              transactionType: 'earn',
              source: 'goal_completed',
              sourceId: goal.id,
              description: `Goal Completed: ${goal.title}`,
              metadata: { goalId: goal.id }
            }, { transaction });
          }
        }

        // Update user points to final running balance
        if (totalXpAwarded > 0) {
          await user.update({ points: runningBalance }, { transaction });
        }
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: wasCompleted ? 'Goal completed!' : 'Progress updated successfully',
        goal: {
          ...goal.toJSON(),
          ...updatedFields
        },
        milestonesAchieved,
        xpAwarded: totalXpAwarded,
        completed: wasCompleted
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      if (error.statusCode === 403) {
        return res.status(403).json({ success: false, message: error.message });
      }
      logger.error('[GoalController] Error updating goal progress:', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to update goal progress',
        /* error detail omitted */
      });
    }
  },

  /**
   * UPDATE GOAL DETAILS
   * ==================
   * PUT /api/v1/gamification/goals/:id
   */
  updateGoal: async (req, res) => {
    const models = await getModels();
    const { Goal } = models;

    if (!Goal) {
      return res.status(503).json({ success: false, message: 'Goals feature is not yet available' });
    }

    let transaction;
    try {
      transaction = await db.transaction();

      const { id } = req.params;
      // Whitelist allowed fields — never allow userId injection
      const allowedGoalFields = [
        'title', 'description', 'goal', 'targetValue', 'currentValue',
        'category', 'deadline', 'status', 'priority', 'notes',
        'unit', 'type', 'milestones'
      ];
      const updates = {};
      for (const field of allowedGoalFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      const goal = await Goal.findByPk(id, { transaction });
      if (!goal) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Goal not found' });
      }

      // Check authorization — owner or admin only (trainers cannot edit goals)
      if (goal.userId !== req.user.id && req.user.role !== 'admin') {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Not authorized to update this goal' });
      }

      // Validate targetValue if being updated
      if (updates.targetValue !== undefined) {
        const numTarget = Number(updates.targetValue);
        if (!Number.isFinite(numTarget) || numTarget <= 0) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Target value must be a positive number' });
        }
        updates.targetValue = numTarget;
      }

      // Validate deadline if being updated
      if (updates.deadline) {
        const newDeadline = new Date(updates.deadline);
        if (isNaN(newDeadline.getTime()) || (newDeadline <= new Date() && goal.status === 'active')) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Deadline must be a valid future date for active goals' });
        }
      }

      // Sanitize string fields
      if (updates.title) updates.title = String(updates.title).trim().substring(0, 200);
      if (updates.description) updates.description = String(updates.description).trim().substring(0, 2000);

      await goal.update(updates, { transaction });
      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Goal updated successfully',
        goal
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error('[GoalController] Error updating goal:', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to update goal',
        /* error detail omitted */
      });
    }
  },

  /**
   * DELETE GOAL
   * ==========
   * DELETE /api/v1/gamification/goals/:id
   */
  deleteGoal: async (req, res) => {
    const models = await getModels();
    const { Goal, PointTransaction } = models;

    if (!Goal) {
      return res.status(503).json({ success: false, message: 'Goals feature is not yet available' });
    }

    let transaction;
    try {
      transaction = await db.transaction();
      const { id } = req.params;

      const goal = await Goal.findByPk(id, { transaction });
      if (!goal) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      // Check authorization
      if (goal.userId !== req.user.id && req.user.role !== 'admin') {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this goal'
        });
      }

      // Void related point transactions (preserve audit trail — never hard-delete)
      const txnsToVoid = await PointTransaction.findAll({
        where: {
          source: ['goal_milestone', 'goal_completed'],
          sourceId: id,
          status: { [Op.ne]: 'voided' }
        },
        transaction
      });

      if (txnsToVoid.length > 0) {
        await Promise.all(txnsToVoid.map(t => t.update({
          status: 'voided',
          voidedAt: new Date(),
          metadata: { ...(t.metadata || {}), voidedByGoalDeletion: true, voidedBy: req.user.id }
        }, { transaction })));
      }

      // Soft-delete goal
      await goal.update({ status: 'deleted', deletedAt: new Date() }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Goal deleted successfully'
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error('[GoalController] Error deleting goal:', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to delete goal',
        /* error detail omitted */
      });
    }
  },

  /**
   * GET GOAL ANALYTICS
   * =================
   * GET /api/v1/gamification/goals/:id/analytics
   */
  getGoalAnalytics: async (req, res) => {
    try {
      const models = await getModels();
      const { Goal } = models;
      
      const { id } = req.params;

      if (!Goal) {
        return res.status(200).json({ success: true, analytics: {}, message: 'Goals feature not yet initialized' });
      }

      const goal = await Goal.findByPk(id);
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      // Authorization check — owner, assigned trainer, or admin
      await assertGoalAccess(goal, req.user);

      // Generate comprehensive analytics
      const analytics = {
        progressHistory: goal.progressHistory || [],
        milestones: goal.milestones || [],
        insights: generateGoalInsights(goal),
        predictions: generateGoalPredictions(goal),
        recommendations: generateGoalRecommendations(goal)
      };

      return res.status(200).json({
        success: true,
        analytics
      });
    } catch (error) {
      if (error.statusCode === 403) {
        return res.status(403).json({ success: false, message: error.message });
      }
      logger.error('[GoalController] Error fetching goal analytics:', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch goal analytics',
        /* error detail omitted */
      });
    }
  },

  /**
   * GET GOAL CATEGORIES STATS
   * ========================
   * GET /api/v1/gamification/users/:userId/goals/categories
   */
  getGoalCategoriesStats: async (req, res) => {
    try {
      const models = await getModels();
      const { Goal } = models;
      
      const { userId } = req.params;

      const categoryStats = await Goal.findAll({
        where: { userId },
        attributes: [
          'category',
          [db.fn('COUNT', db.col('id')), 'total'],
          [db.fn('COUNT', db.literal("CASE WHEN status = 'completed' THEN 1 END")), 'completed'],
          [db.fn('AVG', db.col('progressPercentage')), 'avgProgress']
        ],
        group: ['category'],
        raw: true
      });

      const categories = categoryStats.map((stat) => {
        const total = toNonNegativeNumber(stat.total);
        const completed = toNonNegativeNumber(stat.completed);
        const avgProgress = toNonNegativeNumber(stat.avgProgress);

        return {
          category: stat.category,
          total,
          completed,
          avgProgress,
          completionRate: total > 0 ? (completed / total) * 100 : 0
        };
      });

      return res.status(200).json({
        success: true,
        categories
      });
    } catch (error) {
      logger.error('[GoalController] Error fetching goal categories stats:', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch goal categories statistics',
        /* error detail omitted */
      });
    }
  },

  // Helper methods reference standalone functions below
  calculateEstimatedCompletion: (goal, daysElapsed) => calculateEstimatedCompletion(goal, daysElapsed),
  generateGoalInsights: (goal) => generateGoalInsights(goal),
  generateGoalPredictions: (goal) => generateGoalPredictions(goal),
  generateGoalRecommendations: (goal) => generateGoalRecommendations(goal)
};

// ─────────────────────────────────────────────────────────────
// STANDALONE HELPER FUNCTIONS
// Extracted from object literal to avoid fragile `this` binding in ESM
// ─────────────────────────────────────────────────────────────

function calculateEstimatedCompletion(goal, daysElapsed) {
  if (goal.progressPercentage === 0) return null;

  const progressPerDay = goal.progressPercentage / Math.max(1, daysElapsed);
  if (progressPerDay <= 0) return null;

  const remainingProgress = 100 - goal.progressPercentage;
  const daysToComplete = remainingProgress / progressPerDay;

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + daysToComplete);

  return estimatedDate;
}

function generateGoalInsights(goal) {
  const insights = [];
  const now = new Date();
  const deadline = new Date(goal.deadline);
  const startDate = new Date(goal.startDate);

  const daysElapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
  const totalDays = Math.ceil((deadline - startDate) / (1000 * 60 * 60 * 24));
  const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

  if (goal.progressPercentage > expectedProgress + 10) {
    insights.push({
      type: 'positive',
      message: 'You are ahead of schedule! Keep up the great work!',
      priority: 'high'
    });
  } else if (goal.progressPercentage < expectedProgress - 15) {
    insights.push({
      type: 'warning',
      message: 'Consider adjusting your approach to get back on track.',
      priority: 'high'
    });
  }

  const achievedMilestones = (goal.milestones || []).filter(m => m.achieved).length;
  const totalMilestones = (goal.milestones || []).length;

  if (totalMilestones > 0 && achievedMilestones > totalMilestones / 2) {
    insights.push({
      type: 'achievement',
      message: `Great progress! You've achieved ${achievedMilestones} out of ${totalMilestones} milestones.`,
      priority: 'medium'
    });
  }

  return insights;
}

function generateGoalPredictions(goal) {
  const now = new Date();
  const startDate = new Date(goal.startDate);
  const daysElapsed = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));

  const progressPerDay = goal.progressPercentage / daysElapsed;
  const daysToComplete = progressPerDay > 0 ? (100 - goal.progressPercentage) / progressPerDay : null;

  let estimatedCompletion = null;
  if (daysToComplete) {
    estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + daysToComplete);
  }

  return {
    estimatedCompletion,
    onTrack: goal.progressPercentage >= (daysElapsed / Math.ceil((new Date(goal.deadline) - startDate) / (1000 * 60 * 60 * 24))) * 100,
    progressPerDay: Math.round(progressPerDay * 100) / 100,
    daysToComplete: daysToComplete ? Math.ceil(daysToComplete) : null
  };
}

function generateGoalRecommendations(goal) {
  const recommendations = [];
  const now = new Date();
  const deadline = new Date(goal.deadline);

  const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 7 && goal.progressPercentage < 80) {
    recommendations.push({
      type: 'urgency',
      title: 'Focus on Daily Progress',
      description: 'With less than a week remaining, consider making daily progress to reach your goal.'
    });
  }

  if (goal.progressPercentage === 0 && daysRemaining > 0) {
    recommendations.push({
      type: 'start',
      title: 'Get Started',
      description: 'Take the first step today, even if it\'s small. Starting is often the hardest part.'
    });
  }

  const progressHistory = goal.progressHistory || [];
  if (progressHistory.length >= 3) {
    const recentUpdates = progressHistory.slice(-3);
    const hasRegularUpdates = recentUpdates.every(update =>
      (new Date() - new Date(update.date)) / (1000 * 60 * 60 * 24) <= 7
    );

    if (!hasRegularUpdates) {
      recommendations.push({
        type: 'consistency',
        title: 'Track Progress Regularly',
        description: 'Regular tracking helps maintain momentum and identify issues early.'
      });
    }
  }

  return recommendations;
}

export default goalController;
