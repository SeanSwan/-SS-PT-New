/**
 * 🎯 CHALLENGE CONTROLLER - COMPREHENSIVE CHALLENGE MANAGEMENT SYSTEM
 * ===================================================================
 * Production-ready controller for complete challenge functionality that matches
 * frontend gamification components expectations
 */

import { Op } from 'sequelize';
import db from '../database.mjs';

// Import models through associations for proper relationships
import getModels from '../models/associations.mjs';

const challengeController = {
  /**
   * 🎮 GET ALL CHALLENGES - WITH FILTERS & PAGINATION
   * ===============================================
   * GET /api/v1/gamification/challenges
   */
  getAllChallenges: async (req, res) => {
    try {
      const models = await getModels();
      const { Challenge, User, ChallengeParticipant } = models;
      
      const {
        page = 1,
        limit = 20,
        type,
        category,
        difficulty,
        status = 'active',
        featured,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build filter conditions
      const whereClause = {};
      
      if (type && type !== 'all') whereClause.challengeType = type;
      if (category && category !== 'all') whereClause.category = category;
      if (difficulty) whereClause.difficulty = parseInt(difficulty);
      if (status && status !== 'all') whereClause.status = status;
      if (featured === 'true') whereClause.isFeatured = true;
      
      // Search functionality
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { tags: { [Op.contains]: [search.toLowerCase()] } }
        ];
      }
      
      // Sorting options
      const validSortFields = ['createdAt', 'startDate', 'endDate', 'title', 'difficulty', 'completionRate', 'currentParticipants'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const challenges = await Challenge.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
          },
          {
            model: ChallengeParticipant,
            as: 'challengeParticipants',
            attributes: ['id', 'userId', 'progress', 'isCompleted', 'joinedAt'],
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
            }],
            limit: 5 // Show only first 5 participants in list view
          }
        ],
        order: [[sortField, order]],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      return res.status(200).json({
        success: true,
        challenges: challenges.rows,
        pagination: {
          total: challenges.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(challenges.count / parseInt(limit))
        },
        filters: {
          types: ['daily', 'weekly', 'monthly', 'community', 'custom'],
          categories: ['fitness', 'nutrition', 'mindfulness', 'social', 'streak'],
          difficulties: [1, 2, 3, 4, 5]
        }
      });
    } catch (error) {
      console.error('❌ Error fetching challenges:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch challenges',
        error: error.message
      });
    }
  },

  /**
   * 🎯 GET SINGLE CHALLENGE - WITH FULL DETAILS
   * ==========================================
   * GET /api/v1/gamification/challenges/:id
   */
  getChallengeById: async (req, res) => {
    try {
      const models = await getModels();
      const { Challenge, User, ChallengeParticipant } = models;
      const { id } = req.params;

      const challenge = await Challenge.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
          },
          {
            model: ChallengeParticipant,
            as: 'challengeParticipants',
            attributes: ['id', 'userId', 'progress', 'isCompleted', 'joinedAt', 'completedAt'],
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
            }],
            order: [['progress', 'DESC'], ['joinedAt', 'ASC']]
          }
        ]
      });

      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      // Calculate additional metrics
      const totalParticipants = challenge.challengeParticipants.length;
      const completedParticipants = challenge.challengeParticipants.filter(p => p.isCompleted).length;
      const averageProgress = totalParticipants > 0 
        ? challenge.challengeParticipants.reduce((sum, p) => sum + p.progress, 0) / totalParticipants
        : 0;

      const challengeWithMetrics = {
        ...challenge.toJSON(),
        metrics: {
          totalParticipants,
          completedParticipants,
          averageProgress: Math.round(averageProgress * 100) / 100,
          completionRate: totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0,
          daysRemaining: Math.ceil((new Date(challenge.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
          isActive: challenge.status === 'active' && new Date() >= challenge.startDate && new Date() <= challenge.endDate
        }
      };

      return res.status(200).json({
        success: true,
        challenge: challengeWithMetrics
      });
    } catch (error) {
      console.error('❌ Error fetching challenge:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch challenge',
        error: error.message
      });
    }
  },

  /**
   * ⭐ CREATE NEW CHALLENGE
   * =====================
   * POST /api/v1/gamification/challenges
   */
  createChallenge: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { Challenge } = models;
      
      const {
        title,
        description,
        challengeType = 'daily',
        difficulty = 3,
        category = 'fitness',
        xpReward = 100,
        bonusXpReward = 0,
        maxParticipants,
        maxProgress = 1,
        progressUnit = 'completion',
        startDate,
        endDate,
        requirements = [],
        tags = [],
        isPublic = true,
        isFeatured = false,
        isPremium = false,
        hasLeaderboard = true,
        leaderboardType = 'progress'
      } = req.body;

      const userId = req.user.id;

      // Validation
      if (!title || !description || !startDate || !endDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Title, description, start date, and end date are required'
        });
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();

      if (start <= now) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Start date must be in the future'
        });
      }

      if (end <= start) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }

      // Create challenge
      const challenge = await Challenge.create({
        title,
        description,
        challengeType,
        difficulty,
        category,
        xpReward,
        bonusXpReward,
        maxParticipants,
        maxProgress,
        progressUnit,
        startDate: start,
        endDate: end,
        createdBy: userId,
        requirements,
        tags: Array.isArray(tags) ? tags : [],
        status: 'active',
        isPublic,
        isFeatured,
        isPremium,
        hasLeaderboard,
        leaderboardType
      }, { transaction });

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Challenge created successfully',
        challenge
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating challenge:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create challenge',
        error: error.message
      });
    }
  },

  /**
   * 🚀 JOIN CHALLENGE
   * ================
   * POST /api/v1/gamification/challenges/:id/join
   */
  joinChallenge: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { Challenge, ChallengeParticipant, User } = models;
      
      const { id } = req.params;
      const userId = req.user.id;

      // Get challenge
      const challenge = await Challenge.findByPk(id, {
        include: [{
          model: ChallengeParticipant,
          as: 'challengeParticipants'
        }],
        transaction
      });

      if (!challenge) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      // Validate challenge status
      if (challenge.status !== 'active') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge is not active'
        });
      }

      // Check if challenge has started
      const now = new Date();
      if (now > challenge.endDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge has ended'
        });
      }

      // Check if user is already participating
      const existingParticipation = await ChallengeParticipant.findOne({
        where: {
          challengeId: id,
          userId
        },
        transaction
      });

      if (existingParticipation) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'You are already participating in this challenge'
        });
      }

      // Check if challenge is full
      if (challenge.maxParticipants && challenge.currentParticipants >= challenge.maxParticipants) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge is full'
        });
      }

      // Create participation record
      const participation = await ChallengeParticipant.create({
        challengeId: id,
        userId,
        progress: 0,
        isCompleted: false,
        joinedAt: now
      }, { transaction });

      // Update challenge participant count
      await challenge.update({
        currentParticipants: challenge.currentParticipants + 1
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Successfully joined challenge',
        participation
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error joining challenge:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to join challenge',
        error: error.message
      });
    }
  },

  /**
   * 📈 UPDATE CHALLENGE PROGRESS
   * ===========================
   * PUT /api/v1/gamification/challenges/:id/progress
   */
  updateChallengeProgress: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { Challenge, ChallengeParticipant, User, PointTransaction } = models;
      
      const { id } = req.params;
      const { progress, notes } = req.body;
      const userId = req.user.id;

      if (progress === undefined) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Progress value is required'
        });
      }

      // Get challenge and participation
      const challenge = await Challenge.findByPk(id, { transaction });
      const participation = await ChallengeParticipant.findOne({
        where: { challengeId: id, userId },
        transaction
      });

      if (!challenge) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      if (!participation) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'You are not participating in this challenge'
        });
      }

      if (participation.isCompleted) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge already completed'
        });
      }

      // Calculate progress percentage
      const progressPercentage = Math.min(100, Math.max(0, (progress / challenge.maxProgress) * 100));
      const wasCompleted = progressPercentage >= 100 && !participation.isCompleted;

      // Update participation
      const updatedFields = {
        progress: Math.min(challenge.maxProgress, Math.max(0, progress)),
        progressPercentage,
        updatedAt: new Date()
      };

      if (notes) {
        updatedFields.notes = notes;
      }

      if (wasCompleted) {
        updatedFields.isCompleted = true;
        updatedFields.completedAt = new Date();
      }

      await participation.update(updatedFields, { transaction });

      // Award XP if completed
      if (wasCompleted) {
        const user = await User.findByPk(userId, { transaction });
        const totalXpReward = challenge.xpReward + (challenge.bonusXpReward || 0);
        
        if (user && totalXpReward > 0) {
          const newBalance = user.points + totalXpReward;
          
          // Create point transaction
          await PointTransaction.create({
            userId,
            points: totalXpReward,
            balance: newBalance,
            transactionType: 'earn',
            source: 'challenge_completion',
            sourceId: challenge.id,
            description: `Challenge Completed: ${challenge.title}`,
            metadata: { challengeId: challenge.id }
          }, { transaction });
          
          // Update user points
          await user.update({ points: newBalance }, { transaction });
        }

        // Update challenge completion stats
        const completedCount = await ChallengeParticipant.count({
          where: { challengeId: id, isCompleted: true },
          transaction
        });

        const newCompletionRate = challenge.currentParticipants > 0 
          ? (completedCount / challenge.currentParticipants) * 100 
          : 0;

        await challenge.update({
          completionRate: Math.round(newCompletionRate * 100) / 100
        }, { transaction });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: wasCompleted ? 'Challenge completed!' : 'Progress updated successfully',
        participation: {
          ...participation.toJSON(),
          ...updatedFields
        },
        completed: wasCompleted,
        xpAwarded: wasCompleted ? challenge.xpReward + (challenge.bonusXpReward || 0) : 0
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error updating challenge progress:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update challenge progress',
        error: error.message
      });
    }
  },

  /**
   * 🏆 GET CHALLENGE LEADERBOARD
   * ============================
   * GET /api/v1/gamification/challenges/:id/leaderboard
   */
  getChallengeLeaderboard: async (req, res) => {
    try {
      const models = await getModels();
      const { Challenge, ChallengeParticipant, User } = models;
      
      const { id } = req.params;
      const { limit = 20 } = req.query;

      const challenge = await Challenge.findByPk(id);
      
      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      if (!challenge.hasLeaderboard) {
        return res.status(400).json({
          success: false,
          message: 'This challenge does not have a leaderboard'
        });
      }

      // Get leaderboard based on leaderboard type
      let orderBy;
      switch (challenge.leaderboardType) {
        case 'completion_time':
          orderBy = [['completedAt', 'ASC'], ['progress', 'DESC']];
          break;
        case 'total_score':
          orderBy = [['totalScore', 'DESC'], ['progress', 'DESC']];
          break;
        case 'progress':
        default:
          orderBy = [['progress', 'DESC'], ['joinedAt', 'ASC']];
          break;
      }

      const leaderboard = await ChallengeParticipant.findAll({
        where: { challengeId: id },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'level', 'points']
        }],
        order: orderBy,
        limit: parseInt(limit)
      });

      return res.status(200).json({
        success: true,
        leaderboard: leaderboard.map((participant, index) => ({
          rank: index + 1,
          ...participant.toJSON()
        })),
        challenge: {
          id: challenge.id,
          title: challenge.title,
          leaderboardType: challenge.leaderboardType
        }
      });
    } catch (error) {
      console.error('❌ Error fetching challenge leaderboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch challenge leaderboard',
        error: error.message
      });
    }
  },

  /**
   * 🚪 LEAVE CHALLENGE
   * =================
   * DELETE /api/v1/gamification/challenges/:id/leave
   */
  leaveChallenge: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { Challenge, ChallengeParticipant } = models;
      
      const { id } = req.params;
      const userId = req.user.id;

      // Get participation
      const participation = await ChallengeParticipant.findOne({
        where: { challengeId: id, userId },
        transaction
      });

      if (!participation) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'You are not participating in this challenge'
        });
      }

      if (participation.isCompleted) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot leave a completed challenge'
        });
      }

      // Remove participation
      await participation.destroy({ transaction });

      // Update challenge participant count
      const challenge = await Challenge.findByPk(id, { transaction });
      if (challenge) {
        await challenge.update({
          currentParticipants: Math.max(0, challenge.currentParticipants - 1)
        }, { transaction });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Successfully left the challenge'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error leaving challenge:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to leave challenge',
        error: error.message
      });
    }
  },

  /**
   * 👤 GET USER CHALLENGES
   * =====================
   * GET /api/v1/gamification/users/:userId/challenges
   */
  getUserChallenges: async (req, res) => {
    try {
      const models = await getModels();
      const { Challenge, ChallengeParticipant, User } = models;
      
      const { userId } = req.params;
      const { status = 'active', page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const whereClause = { userId };
      
      if (status === 'active') {
        whereClause.isCompleted = false;
      } else if (status === 'completed') {
        whereClause.isCompleted = true;
      }

      const userChallenges = await ChallengeParticipant.findAndCountAll({
        where: whereClause,
        include: [{
          model: Challenge,
          as: 'challenge',
          include: [{
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username']
          }]
        }],
        order: [['joinedAt', 'DESC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      return res.status(200).json({
        success: true,
        challenges: userChallenges.rows,
        pagination: {
          total: userChallenges.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(userChallenges.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('❌ Error fetching user challenges:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user challenges',
        error: error.message
      });
    }
  }
};

export default challengeController;
