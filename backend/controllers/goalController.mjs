/**
 * GOAL CONTROLLER - COMPREHENSIVE PERSONAL GOAL MANAGEMENT SYSTEM
 * ==============================================================
 * Production-ready controller for personal goal setting, tracking,
 * and milestone management with business intelligence
 */

import { Op } from 'sequelize';
import db from '../database.mjs';

// Import models through associations for proper relationships
import getModels from '../models/associations.mjs';

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

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Validate user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Build where clause
      const whereClause = { userId };
      
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
        limit: parseInt(limit),
        offset
      });

      // Calculate summary statistics
      const summaryStats = await Goal.findAll({
        where: { userId },
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
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(goals.count / parseInt(limit))
        },
        summary
      });
    } catch (error) {
      console.error('Error fetching user goals:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user goals',
        error: error.message
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
          estimatedCompletion: goal.progressPercentage > 0 ? this.calculateEstimatedCompletion(goal, daysElapsed) : null
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
      console.error('Error fetching goal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch goal',
        error: error.message
      });
    }
  },

  /**
   * CREATE NEW GOAL
   * ==============
   * POST /api/v1/gamification/goals
   */
  createGoal: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { Goal } = models;
      
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

      const userId = req.user.id;

      // Validation
      if (!title || !targetValue || !unit || !deadline) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Title, target value, unit, and deadline are required'
        });
      }

      // Validate deadline
      const deadlineDate = new Date(deadline);
      const now = new Date();
      
      if (deadlineDate <= now) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Deadline must be in the future'
        });
      }

      // Process milestones
      const processedMilestones = milestones.map(m => ({
        percentage: m.percentage || 50,
        description: m.description || `${m.percentage}% milestone`,
        xpBonus: m.xpBonus || 0,
        achieved: false
      }));

      // Create goal
      const goal = await Goal.create({
        userId,
        title,
        description,
        targetValue,
        unit,
        category,
        priority,
        deadline: deadlineDate,
        xpReward,
        completionBonus,
        isPublic,
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
      await transaction.rollback();
      console.error('Error creating goal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create goal',
        error: error.message
      });
    }
  },

  /**
   * UPDATE GOAL PROGRESS
   * ===================
   * PUT /api/v1/gamification/goals/:id/progress
   */
  updateGoalProgress: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { Goal, User, PointTransaction } = models;
      
      const { id } = req.params;
      const { currentValue, notes } = req.body;

      if (currentValue === undefined) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Current value is required'
        });
      }

      // Get goal
      const goal = await Goal.findByPk(id, { transaction });
      if (!goal) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      // Check authorization
      if (goal.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this goal'
        });
      }

      if (goal.status !== 'active') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot update progress on inactive goal'
        });
      }

      // Calculate progress
      const oldValue = goal.currentValue;
      const newValue = Math.max(0, currentValue);
      const progressPercentage = Math.min(100, (newValue / goal.targetValue) * 100);
      const wasCompleted = progressPercentage >= 100 && goal.status === 'active';

      // Update progress history
      const progressHistory = goal.progressHistory || [];
      progressHistory.push({
        date: new Date().toISOString(),
        value: newValue,
        change: newValue - oldValue,
        percentage: progressPercentage,
        notes: notes
      });

      // Check milestones
      let milestonesAchieved = [];
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

      // Award XP for milestones and completion
      let totalXpAwarded = 0;
      const user = await User.findByPk(goal.userId, { transaction });

      if (user) {
        // Award milestone XP
        for (const milestone of milestonesAchieved) {
          if (milestone.xpBonus > 0) {
            totalXpAwarded += milestone.xpBonus;
            
            await PointTransaction.create({
              userId: goal.userId,
              points: milestone.xpBonus,
              balance: user.points + totalXpAwarded,
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
            totalXpAwarded += completionXp;
            
            await PointTransaction.create({
              userId: goal.userId,
              points: completionXp,
              balance: user.points + totalXpAwarded,
              transactionType: 'earn',
              source: 'goal_completed',
              sourceId: goal.id,
              description: `Goal Completed: ${goal.title}`,
              metadata: { goalId: goal.id }
            }, { transaction });
          }
        }

        // Update user points
        if (totalXpAwarded > 0) {
          await user.update({ points: user.points + totalXpAwarded }, { transaction });
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
      await transaction.rollback();
      console.error('Error updating goal progress:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update goal progress',
        error: error.message
      });
    }
  },

  /**
   * UPDATE GOAL DETAILS
   * ==================
   * PUT /api/v1/gamification/goals/:id
   */
  updateGoal: async (req, res) => {
    try {
      const models = await getModels();
      const { Goal } = models;
      
      const { id } = req.params;
      const updates = req.body;

      const goal = await Goal.findByPk(id);
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      // Check authorization
      if (goal.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this goal'
        });
      }

      // Validate deadline if being updated
      if (updates.deadline) {
        const newDeadline = new Date(updates.deadline);
        const now = new Date();
        
        if (newDeadline <= now && goal.status === 'active') {
          return res.status(400).json({
            success: false,
            message: 'Deadline must be in the future for active goals'
          });
        }
      }

      // Update goal
      await goal.update(updates);

      return res.status(200).json({
        success: true,
        message: 'Goal updated successfully',
        goal
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update goal',
        error: error.message
      });
    }
  },

  /**
   * DELETE GOAL
   * ==========
   * DELETE /api/v1/gamification/goals/:id
   */
  deleteGoal: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { Goal, PointTransaction } = models;
      
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

      // Delete related point transactions
      await PointTransaction.destroy({
        where: {
          source: ['goal_milestone', 'goal_completed'],
          sourceId: id
        },
        transaction
      });

      // Delete goal
      await goal.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Goal deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting goal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete goal',
        error: error.message
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

      const goal = await Goal.findByPk(id);
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      // Generate comprehensive analytics
      const analytics = {
        progressHistory: goal.progressHistory || [],
        milestones: goal.milestones || [],
        insights: this.generateGoalInsights(goal),
        predictions: this.generateGoalPredictions(goal),
        recommendations: this.generateGoalRecommendations(goal)
      };

      return res.status(200).json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Error fetching goal analytics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch goal analytics',
        error: error.message
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

      const categories = categoryStats.map(stat => ({
        category: stat.category,
        total: parseInt(stat.total),
        completed: parseInt(stat.completed || 0),
        avgProgress: parseFloat(stat.avgProgress || 0),
        completionRate: stat.total > 0 ? (parseInt(stat.completed || 0) / parseInt(stat.total)) * 100 : 0
      }));

      return res.status(200).json({
        success: true,
        categories
      });
    } catch (error) {
      console.error('Error fetching goal categories stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch goal categories statistics',
        error: error.message
      });
    }
  },

  // Helper methods for analytics and insights

  calculateEstimatedCompletion: (goal, daysElapsed) => {
    if (goal.progressPercentage === 0) return null;
    
    const progressPerDay = goal.progressPercentage / Math.max(1, daysElapsed);
    if (progressPerDay <= 0) return null;
    
    const remainingProgress = 100 - goal.progressPercentage;
    const daysToComplete = remainingProgress / progressPerDay;
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysToComplete);
    
    return estimatedDate;
  },

  generateGoalInsights: (goal) => {
    const insights = [];
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const startDate = new Date(goal.startDate);
    
    const daysElapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((deadline - startDate) / (1000 * 60 * 60 * 24));
    const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
    
    // Progress insights
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
    
    // Milestone insights
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
  },

  generateGoalPredictions: (goal) => {
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
  },

  generateGoalRecommendations: (goal) => {
    const recommendations = [];
    const now = new Date();
    const deadline = new Date(goal.deadline);
    
    // Time-based recommendations
    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 7 && goal.progressPercentage < 80) {
      recommendations.push({
        type: 'urgency',
        title: 'Focus on Daily Progress',
        description: 'With less than a week remaining, consider making daily progress to reach your goal.'
      });
    }
    
    // Progress-based recommendations
    if (goal.progressPercentage === 0 && daysRemaining > 0) {
      recommendations.push({
        type: 'start',
        title: 'Get Started',
        description: 'Take the first step today, even if it\'s small. Starting is often the hardest part.'
      });
    }
    
    // Consistency recommendations
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
};

export default goalController;
