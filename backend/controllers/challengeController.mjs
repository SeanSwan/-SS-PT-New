/**
 * CHALLENGE CONTROLLER - COMPREHENSIVE CHALLENGE MANAGEMENT SYSTEM
 * ===================================================================
 * Production-ready controller for complete challenge functionality that matches
 * frontend gamification components expectations
 */

import { Op } from 'sequelize';
import db from '../database.mjs';

// Import models through associations for proper relationships
import getModels from '../models/associations.mjs';
import GamificationPointsService from '../services/gamification/GamificationPointsService.mjs';
import { checkBadgesForGamificationEvent } from '../services/badgeGamificationBridge.mjs';
import {
  ChallengeCreationValidationError,
  buildChallengeCreatePayload,
} from '../services/gamification/challengeCreationService.mjs';
import { getChallengeList } from '../services/gamification/challengeListService.mjs';
import {
  ChallengeStatusTransitionError,
  transitionManagedChallengeStatus,
} from '../services/gamification/challengeStatusService.mjs';
import {
  ChallengeAudienceValidationError,
  replaceManagedChallengeAudience,
} from '../services/gamification/challengeAudienceService.mjs';
import {
  ChallengeProgressEventValidationError,
  applyWorkoutChallengeProgressEvent,
} from '../services/gamification/challengeProgressEventService.mjs';
import {
  getChallengeGovernancePolicy,
  getChallengeTemplateCatalog,
  listChallengeArchetypes,
} from '../services/gamification/challengeTemplateCatalog.mjs';
import { toChallengeDashboardParticipation } from '../services/gamification/challengeDashboardReadModel.mjs';
import { recordChallengeView } from '../services/gamification/challengeEngagementService.mjs';
import {
  awardWorkoutChallengeCompletionXp,
  getChallengeCompletionTitle,
} from '../services/gamification/challengeCompletionRewardService.mjs';

const INTERNAL_ERROR = 'Internal server error';

const sendChallengeError = (res, status, message, error = INTERNAL_ERROR) =>
  res.status(status).json({
    success: false,
    message,
    error
  });

const parsePositiveInteger = (value, fallback = null) => {
  const stringValue = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(stringValue)) return fallback;

  return Number(stringValue);
};

const parseBoundedPositiveInteger = (value, fallback, max) =>
  Math.min(parsePositiveInteger(value, fallback), max);

const parseOptionalBoundedPositiveInteger = (value, min, max) => {
  if (value === undefined || value === null || value === '' || value === 'all') return null;

  const parsed = parsePositiveInteger(value);
  if (parsed === null || parsed < min || parsed > max) return null;

  return parsed;
};

const parseManualProgressValue = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (trimmedValue === '') return null;

    const numberValue = Number(trimmedValue);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
  }

  return null;
};

const statusMessageForAction = (action) => {
  switch (String(action ?? 'publish').trim().toLowerCase()) {
    case 'complete':
      return 'Challenge marked completed successfully';
    case 'cancel':
      return 'Challenge cancelled successfully';
    case 'archive':
      return 'Challenge archived successfully';
    case 'publish':
    default:
      return 'Challenge published successfully';
  }
};

const collectWorkoutChallengeBadges = async ({ userId, completions }) => {
  const badgesEarned = [];

  for (const completion of completions) {
    const earned = await checkBadgesForGamificationEvent({
      userId,
      type: 'challenge_completion',
      activityData: {
        challengeId: completion.challengeId,
        challengeName: getChallengeCompletionTitle(completion),
        completed: true,
        status: 'completed',
        count: 1,
        sourceType: 'workout_completed'
      }
    });

    badgesEarned.push(...earned);
  }

  return badgesEarned;
};
const challengeController = {
  /**
   * GET CHALLENGE TEMPLATES
   * =======================
   * GET /api/v1/gamification/challenge-templates
   */
  getChallengeTemplates: async (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        templates: getChallengeTemplateCatalog(),
        archetypes: listChallengeArchetypes(),
        governance: getChallengeGovernancePolicy()
      });
    } catch (error) {
      console.error('Error fetching challenge templates:', error);
      return sendChallengeError(res, 500, 'Failed to fetch challenge templates');
    }
  },
  /**
   * GET ALL CHALLENGES - WITH FILTERS & PAGINATION
   * ===============================================
   * GET /api/v1/gamification/challenges
   */
  getAllChallenges: async (req, res) => {
    try {
      const models = await getModels();
      const result = await getChallengeList({ models, query: req.query, defaultStatus: 'active', publicOnly: true });

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching challenges:', error);
      return sendChallengeError(res, 500, 'Failed to fetch challenges');
    }
  },

  getManagedChallenges: async (req, res) => {
    try {
      const models = await getModels();
      const result = await getChallengeList({
        models,
        query: req.query,
        defaultStatus: 'all',
        viewer: req.user
      });

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching managed challenges:', error);
      return sendChallengeError(res, 500, 'Failed to fetch managed challenges');
    }
  },

  /**
   * GET SINGLE CHALLENGE - WITH FULL DETAILS
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
            as: 'participants',
            attributes: ['id', 'userId', 'currentProgress', 'progressPercentage', 'status', 'joinedAt', 'completedAt'],
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
            }],
            order: [['progressPercentage', 'DESC'], ['joinedAt', 'ASC']]
          }
        ]
      });

      if (!challenge || challenge.status === 'draft' || challenge.isPublic !== true) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      const viewTracking = await recordChallengeView({
        Challenge,
        challenge,
      });

      // Calculate additional metrics
      const totalParticipants = challenge.participants.length;
      const completedParticipants = challenge.participants.filter(p => p.status === 'completed').length;
      const averageProgress = totalParticipants > 0
        ? challenge.participants.reduce((sum, p) => sum + (parseFloat(p.progressPercentage) || 0), 0) / totalParticipants
        : 0;

      const challengeWithMetrics = {
        ...challenge.toJSON(),
        viewCount: viewTracking.viewCount,
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
      console.error('Error fetching challenge:', error);
      return sendChallengeError(res, 500, 'Failed to fetch challenge');
    }
  },

  /**
   * CREATE NEW CHALLENGE
   * =====================
   * POST /api/v1/gamification/challenges
   */
  createChallenge: async (req, res) => {
    const transaction = await db.transaction();

    try {
      const models = await getModels();
      const { Challenge } = models;
      const challengePayload = buildChallengeCreatePayload({
        body: req.body,
        userId: req.user.id,
        now: new Date(),
      });

      const challenge = await Challenge.create(challengePayload, { transaction });

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Challenge created successfully',
        challenge
      });
    } catch (error) {
      await transaction.rollback();

      if (error instanceof ChallengeCreationValidationError) {
        return sendChallengeError(res, error.statusCode, error.publicMessage, error.publicMessage);
      }

      console.error('Error creating challenge:', error);
      return sendChallengeError(res, 500, 'Failed to create challenge');
    }
  },

  updateManagedChallengeStatus: async (req, res) => {
    try {
      const models = await getModels();
      const { action = 'publish', visibility = 'public' } = req.body ?? {};

      const challenge = await transitionManagedChallengeStatus({
        models,
        challengeId: req.params.id,
        viewer: req.user,
        action,
        visibility,
      });

      return res.status(200).json({
        success: true,
        message: statusMessageForAction(action),
        challenge,
      });
    } catch (error) {
      if (error instanceof ChallengeStatusTransitionError) {
        return sendChallengeError(res, error.statusCode, error.publicMessage, error.publicMessage);
      }

      console.error('Error updating managed challenge status:', error);
      return sendChallengeError(res, 500, 'Failed to update challenge status');
    }
  },
  updateManagedChallengeAudience: async (req, res) => {
    const transaction = await db.transaction();

    try {
      const models = await getModels();
      const result = await replaceManagedChallengeAudience({
        models,
        challengeId: req.params.id,
        viewer: req.user,
        userIds: req.body?.userIds,
        transaction,
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Challenge audience saved successfully',
        challenge: result.challenge,
        audienceCount: result.audienceCount,
      });
    } catch (error) {
      await transaction.rollback();

      if (error instanceof ChallengeAudienceValidationError) {
        return sendChallengeError(res, error.statusCode, error.publicMessage, error.publicMessage);
      }

      console.error('Error updating managed challenge audience:', error);
      return sendChallengeError(res, 500, 'Failed to update challenge audience');
    }
  },
  /**
   * JOIN CHALLENGE
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
          as: 'participants'
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

      // Check if user is already participating
      const existingParticipation = await ChallengeParticipant.findOne({
        where: {
          challengeId: id,
          userId
        },
        transaction
      });

      const reactivatingParticipation = existingParticipation?.status === 'quit';

      if (existingParticipation && !reactivatingParticipation) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'You are already participating in this challenge'
        });
      }

      if (challenge.isPublic !== true || challenge.status === 'draft') {
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

      // Check if challenge is inside its active window
      const now = new Date();
      if (now < challenge.startDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge has not started'
        });
      }

      if (now > challenge.endDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge has ended'
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

      // Create or reactivate participation record
      const participation = reactivatingParticipation
        ? await existingParticipation.update({
          status: 'joined',
          joinedAt: now,
          lastProgressUpdate: now,
          updatedAt: now
        }, { transaction })
        : await ChallengeParticipant.create({
          challengeId: id,
          userId,
          currentProgress: 0,
          progressPercentage: 0,
          status: 'joined',
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
      console.error('Error joining challenge:', error);
      return sendChallengeError(res, 500, 'Failed to join challenge');
    }
  },

  /**
   * UPDATE CHALLENGE PROGRESS
   * ===========================
   * PUT /api/v1/gamification/challenges/:id/progress
   */
  updateChallengeProgress: async (req, res) => {
    const transaction = await db.transaction();
    let transactionCommitted = false;

    try {
      const models = await getModels();
      const { Challenge, ChallengeParticipant } = models;

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

      const progressValue = parseManualProgressValue(progress);
      if (progressValue === null) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Progress value must be a non-negative number'
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

      if (challenge.status === 'draft' || (challenge.isPublic !== true && !participation)) {
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

      if (participation.status === 'completed') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge already completed'
        });
      }

      if (challenge.status !== 'active') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge is not active'
        });
      }

      const now = new Date();
      if (now < challenge.startDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge has not started'
        });
      }

      if (now > challenge.endDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Challenge has ended'
        });
      }

      // Calculate progress percentage
      const rawMaxProgress = Number(challenge.maxProgress);
      const maxProgress = Number.isFinite(rawMaxProgress) && rawMaxProgress > 0 ? rawMaxProgress : 1;
      const newProgressPercentage = Math.min(100, Math.max(0, (progressValue / maxProgress) * 100));
      const wasCompleted = newProgressPercentage >= 100 && participation.status !== 'completed';

      // Update participation
      const updatedFields = {
        currentProgress: Math.min(maxProgress, progressValue),
        progressPercentage: newProgressPercentage,
        updatedAt: new Date()
      };

      if (wasCompleted) {
        updatedFields.status = 'completed';
        updatedFields.completedAt = new Date();
      }

      await participation.update(updatedFields, { transaction });

      // Award XP if completed
      if (wasCompleted) {
        const totalXpReward = challenge.xpReward + (challenge.bonusXpReward || 0);

        if (totalXpReward > 0) {
          await GamificationPointsService.recordLedgerEntry({
            userId,
            points: totalXpReward,
            transactionType: 'earn',
            source: 'challenge_completion',
            sourceId: challenge.id,
            description: `Challenge Completed: ${challenge.title}`,
            metadata: { challengeId: challenge.id },
            idempotencyKey: `challenge:${userId}:${id}`,
            maxPoints: Math.max(totalXpReward, 500)
          }, transaction);
        }

        // Update challenge completion stats
        const completedCount = await ChallengeParticipant.count({
          where: { challengeId: id, status: 'completed' },
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
      transactionCommitted = true;

      const badgesEarned = wasCompleted
        ? await checkBadgesForGamificationEvent({
          userId,
          type: 'challenge_completion',
          activityData: {
            challengeId: challenge.id,
            challengeName: challenge.title || challenge.name,
            completed: true,
            status: 'completed',
            count: 1
          }
        })
        : [];

      return res.status(200).json({
        success: true,
        message: wasCompleted ? 'Challenge completed!' : 'Progress updated successfully',
        participation: {
          ...participation.toJSON(),
          ...updatedFields
        },
        completed: wasCompleted,
        badgesEarned,
        xpAwarded: wasCompleted ? challenge.xpReward + (challenge.bonusXpReward || 0) : 0
      });
    } catch (error) {
      if (!transactionCommitted) await transaction.rollback();
      console.error('Error updating challenge progress:', error);
      return sendChallengeError(res, 500, 'Failed to update challenge progress');
    }
  },

  /**
   * RECORD WORKOUT CHALLENGE PROGRESS
   * =================================
   * POST /api/v1/gamification/users/:userId/challenges/progress-events/workout-completed
   */
  recordWorkoutChallengeProgress: async (req, res) => {
    const transaction = await db.transaction();
    let transactionCommitted = false;

    try {
      const models = await getModels();
      const userId = parsePositiveInteger(req.params.userId);
      const result = await applyWorkoutChallengeProgressEvent({
        models,
        userId,
        event: req.body,
        transaction,
        now: new Date(),
      });
      const completedUpdates = result.updated.filter((update) => update.completed);
      const xpAwarded = await awardWorkoutChallengeCompletionXp({
        userId,
        completions: completedUpdates,
        transaction,
      });

      await transaction.commit();
      transactionCommitted = true;

      let badgesEarned = [];
      try {
        badgesEarned = await collectWorkoutChallengeBadges({ userId, completions: completedUpdates });
      } catch (badgeError) {
        console.error('Error checking workout challenge badges:', badgeError);
      }

      return res.status(200).json({
        success: true,
        message: 'Workout challenge progress processed',
        ...result,
        badgesEarned,
        xpAwarded,
      });
    } catch (error) {
      if (!transactionCommitted) await transaction.rollback();

      if (error instanceof ChallengeProgressEventValidationError) {
        const statusCode = error.statusCode ?? 400;
        const publicMessage = statusCode >= 500
          ? 'Failed to process workout challenge progress'
          : error.publicMessage;

        return sendChallengeError(res, statusCode, publicMessage, publicMessage);
      }

      console.error('Error recording workout challenge progress:', error);
      return sendChallengeError(res, 500, 'Failed to process workout challenge progress');
    }
  },
  /**
   * GET CHALLENGE LEADERBOARD
   * ============================
   * GET /api/v1/gamification/challenges/:id/leaderboard
   */
  getChallengeLeaderboard: async (req, res) => {
    try {
      const models = await getModels();
      const { Challenge, ChallengeParticipant, User } = models;

      const { id } = req.params;
      const { limit = 20 } = req.query;
      const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);

      const challenge = await Challenge.findByPk(id);

      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      let leaderboardParticipation = null;
      if (challenge.isPublic !== true && challenge.status !== 'draft') {
        leaderboardParticipation = await ChallengeParticipant.findOne({
          where: { challengeId: id, userId: req.user.id }
        });
      }

      if (challenge.status === 'draft' || (challenge.isPublic !== true && !leaderboardParticipation)) {
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
          orderBy = [['completedAt', 'ASC'], ['progressPercentage', 'DESC']];
          break;
        case 'total_score':
          orderBy = [['score', 'DESC'], ['progressPercentage', 'DESC']];
          break;
        case 'progress':
        default:
          orderBy = [['progressPercentage', 'DESC'], ['joinedAt', 'ASC']];
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
        limit: normalizedLimit
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
      console.error('Error fetching challenge leaderboard:', error);
      return sendChallengeError(res, 500, 'Failed to fetch challenge leaderboard');
    }
  },

  /**
   * LEAVE CHALLENGE
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

      const challenge = await Challenge.findByPk(id, { transaction });
      if (!challenge || challenge.status === 'draft') {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      if (participation.status === 'completed') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot leave a completed challenge'
        });
      }

      if (participation.status === 'quit') {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'You are not participating in this challenge'
        });
      }

      const leftAt = new Date();
      const progressHistory = Array.isArray(participation.progressHistory) ? participation.progressHistory : [];

      // Preserve participation for lifecycle analytics instead of hard-deleting the row.
      await participation.update({
        status: 'quit',
        lastProgressUpdate: leftAt,
        updatedAt: leftAt,
        progressHistory: [
          ...progressHistory,
          {
            sourceType: 'challenge_left',
            sourceId: id,
            occurredAt: leftAt.toISOString(),
            previousStatus: String(participation.status || 'joined')
          }
        ]
      }, { transaction });

      // Update challenge participant count
      await challenge.update({
        currentParticipants: Math.max(0, challenge.currentParticipants - 1)
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Successfully left the challenge'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error leaving challenge:', error);
      return sendChallengeError(res, 500, 'Failed to leave challenge');
    }
  },

  /**
   * GET USER CHALLENGES
   * =====================
   * GET /api/v1/gamification/users/:userId/challenges
   */
  getUserChallenges: async (req, res) => {
    try {
      const models = await getModels();
      const { Challenge, ChallengeParticipant, User } = models;

      const { userId } = req.params;
      const { status = 'active', page = 1, limit = 20 } = req.query;

      const normalizedPage = parsePositiveInteger(page, 1);
      const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);
      const offset = (normalizedPage - 1) * normalizedLimit;

      const whereClause = { userId };

      if (status === 'active') {
        whereClause.status = { [Op.in]: ['joined', 'active'] };
      } else if (status === 'completed') {
        whereClause.status = 'completed';
      }

      const userChallenges = await ChallengeParticipant.findAndCountAll({
        where: whereClause,
        include: [{
          model: Challenge,
          as: 'challenge',
          where: { status: { [Op.ne]: 'draft' } },
          required: true,
          include: [{
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username']
          }]
        }],
        order: [['joinedAt', 'DESC']],
        limit: normalizedLimit,
        offset,
        distinct: true
      });

      return res.status(200).json({
        success: true,
        challenges: userChallenges.rows.map((row) => toChallengeDashboardParticipation(row)),
        pagination: {
          total: userChallenges.count,
          page: normalizedPage,
          limit: normalizedLimit,
          pages: Math.ceil(userChallenges.count / normalizedLimit)
        }
      });
    } catch (error) {
      console.error('Error fetching user challenges:', error);
      return sendChallengeError(res, 500, 'Failed to fetch user challenges');
    }
  }
};

export default challengeController;

