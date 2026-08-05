import express from 'express';
import { Challenge, ChallengeParticipant, ChallengeTeam } from '../../models/social/index.mjs';
// Canonical lane (SWA-115, 2026-08-04): /active now reads the REAL `challenges` table
// (18 live rows) instead of the empty PascalCase "Challenges" twin the social models
// map to — the bug that made both client dashboards render zero challenges forever.
// Only /active is repointed: it is the sole endpoint here with live frontend callers
// (useDashboardQueries.useSocialChallenges → ClientObservatoryHome + ClientCommunityPage).
// The remaining endpoints keep the legacy social models pending the SWA-115 product
// decision on the PascalCase challenge family.
import { getChallenge, getChallengeParticipant } from '../../models/index.mjs';
import { mapChallengeToSocialPreview } from './challengePreviewMapper.mjs';
import { isMissingTableError } from '../featureAvailability.mjs';
import User from '../../models/User.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';
import { Op } from 'sequelize';
import sequelize from '../../database.mjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { uploadPhoto, deletePhoto } from '../../services/photoStorageService.mjs';
import logger from '../../utils/logger.mjs';
import GamificationPointsService from '../../services/gamification/GamificationPointsService.mjs';
import { calculateChallengeProgressAward } from '../../services/gamification/challengeProgressAwardService.mjs';
import { directoryAttributes } from '../../utils/memberDirectoryAccess.mjs';

const ALLOWED_SOCIAL_CHALLENGE_TYPES = new Set(['individual', 'team']);

// Challenge categories whose progress must come from VERIFIED workout events
// (the canonical workout-completed evidence path), never client-typed numbers.
// The biometric/habit categories have no workout-event evidence source and
// stay self-reportable. (Sean policy 2026-07-15.)
const EVIDENCE_REQUIRED_CATEGORIES = new Set(['workout']);

const parseBoundedInteger = (value, fallback, { min, max }) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed)
    ? Math.min(Math.max(parsed, min), max)
    : fallback;
};

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Memory-based multer for R2 uploads (no local disk staging)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for challenge images
  },
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

/**
 * Get active challenges
 */
router.get('/active', async (req, res) => {
  const limit = parseBoundedInteger(req.query.limit, 10, { min: 1, max: 50 });
  const offset = parseBoundedInteger(req.query.offset, 0, { min: 0, max: 10000 });

  try {
    const now = new Date();

    // CANONICAL lane (see import note above): real challenges, public only —
    // this is a community surface; private/draft challenges must not leak here.
    // Window is "not yet ended" rather than "currently running": upcoming public
    // challenges are joinable content the dashboards should surface (live-DB truth
    // 2026-08-04: most historical challenges have ended; hiding upcoming ones would
    // keep the community page empty for no reason).
    const CanonicalChallenge = getChallenge();
    const CanonicalParticipant = getChallengeParticipant();

    const activeWhere = {
      status: 'active',
      isPublic: true,
      endDate: { [Op.gte]: now },
    };

    const [challenges, total] = await Promise.all([
      CanonicalChallenge.findAll({
        where: activeWhere,
        limit,
        offset,
        order: [['startDate', 'DESC']],
      }),
      CanonicalChallenge.count({ where: activeWhere }),
    ]);

    // The requesting user's canonical participation rows for these challenges.
    const challengeIds = challenges.map(c => c.id);
    const participations = challengeIds.length > 0
      ? await CanonicalParticipant.findAll({
          where: { challengeId: { [Op.in]: challengeIds }, userId: req.user.id },
        })
      : [];
    const participationMap = {};
    for (const part of participations) participationMap[part.challengeId] = part.toJSON();

    const formattedChallenges = challenges.map(c =>
      mapChallengeToSocialPreview(c.toJSON(), participationMap[c.id] || null, now),
    );

    return res.status(200).json({
      success: true,
      challenges: formattedChallenges,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    // A genuinely absent relation can degrade in a fresh environment. Missing
    // columns and every other database failure stay visible as real 500s.
    if (isMissingTableError(error)) {
      return res.status(200).json({ success: true, challenges: [], pagination: { limit, offset, total: 0 } });
    }
    logger.error('Error fetching active challenges:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active challenges'
    });
  }
});

/**
 * Get user's challenges
 */
router.get('/my-challenges', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || 'active';
    
    // Get user's challenges
    const participations = await ChallengeParticipant.findAll({
      where: {
        userId: req.user.id,
        status
      },
      limit,
      offset,
      include: [
        {
          model: Challenge,
          as: 'challenge',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: directoryAttributes(req.user)
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      challenges: participations,
      pagination: {
        limit,
        offset,
        total: await ChallengeParticipant.count({
          where: {
            userId: req.user.id,
            status
          }
        })
      }
    });
  } catch (error) {
    logger.error('Error fetching user challenges:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user challenges'
    });
  }
});

/**
 * Get a specific challenge with details
 */
router.get('/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    
    // Get the challenge
    const challenge = await Challenge.findByPk(challengeId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: directoryAttributes(req.user, ['role'])
        }
      ]
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Check if user is participating
    const participation = await ChallengeParticipant.findOne({
      where: {
        challengeId,
        userId: req.user.id
      }
    });
    
    // Get leaderboard
    let leaderboard = [];
    if (challenge.type !== 'global') {
      leaderboard = await ChallengeParticipant.findAll({
        where: {
          challengeId,
          status: { [Op.in]: ['active', 'completed'] }
        },
        limit: 10,
        order: [['progress', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: directoryAttributes(req.user)
          }
        ]
      });
    }
    
    // For team challenges, get teams
    let teams = [];
    let userTeam = null;
    
    if (challenge.type === 'team') {
      teams = await ChallengeTeam.findAll({
        where: { challengeId },
        include: [
          {
            model: User,
            as: 'captain',
            attributes: directoryAttributes(req.user)
          }
        ],
        order: [['totalProgress', 'DESC']]
      });
      
      // If participating, find user's team
      if (participation && participation.teamId) {
        userTeam = teams.find(team => team.id === participation.teamId);
      }
    }
    
    return res.status(200).json({
      success: true,
      challenge,
      participation: participation || null,
      isParticipating: !!participation,
      leaderboard,
      teams: challenge.type === 'team' ? teams : null,
      userTeam: userTeam || null
    });
  } catch (error) {
    logger.error('Error fetching challenge details:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge details'
    });
  }
});

/**
 * Create a new challenge
 * Only trainers and admins can create challenges.
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    // SECURITY: Only trainers/admins can create challenges
    if (!['trainer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only trainers and admins can create challenges',
      });
    }

    const {
      name,
      description,
      type,
      category = 'workout',
      goal,
      unit,
      startDate,
      endDate,
      visibility = 'public',
      pointsPerUnit = 10,
      bonusPoints = 100,
      badgeId
    } = req.body;

    // Validate required fields
    if (!name || !description || !goal || !unit || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const challengeType = type === undefined || type === null || type === '' ? 'individual' : String(type).trim();
    if (!ALLOWED_SOCIAL_CHALLENGE_TYPES.has(challengeType)) {
      return res.status(400).json({
        success: false,
        message: 'Global challenge leaderboards are disabled for new challenges; choose individual or team.'
      });
    }

    // SECURITY: Bounds validation on numeric inputs
    const parsedGoal = Math.min(Math.max(parseInt(goal) || 1, 1), 100000);
    const parsedPPU = Math.min(Math.max(parseInt(pointsPerUnit) || 10, 1), 10000);
    const parsedBonus = Math.min(Math.max(parseInt(bonusPoints) || 100, 0), 50000);

    // Create challenge data
    const challengeData = {
      creatorId: req.user.id,
      name: String(name).slice(0, 200),
      description: String(description).slice(0, 2000),
      type: challengeType,
      category,
      goal: parsedGoal,
      unit,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      visibility,
      pointsPerUnit: parsedPPU,
      bonusPoints: parsedBonus,
      badgeId: badgeId || null
    };

    // Upload image to R2 if provided
    if (req.file) {
      try {
        const result = await uploadPhoto(req.file.buffer, {
          userId: req.user.id,
          category: 'challenges',
          originalFilename: req.file.originalname,
          contentType: req.file.mimetype,
        });
        challengeData.imageUrl = result.url;
      } catch (uploadErr) {
        logger.warn('R2 upload failed for challenge image:', { error: uploadErr.message });
      }
    }

    // Determine status based on dates
    const now = new Date();
    if (challengeData.startDate <= now && challengeData.endDate >= now) {
      challengeData.status = 'active';
    } else if (challengeData.startDate > now) {
      challengeData.status = 'upcoming';
    } else {
      challengeData.status = 'completed';
    }

    // Create the challenge
    const challenge = await Challenge.create(challengeData);

    return res.status(201).json({
      success: true,
      message: 'Challenge created successfully',
      challenge
    });
  } catch (error) {
    logger.error('Error creating challenge:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to create challenge'
    });
  }
});

/**
 * Join a challenge
 */
router.post('/:challengeId/join', async (req, res) => {
  try {
    const { challengeId } = req.params;
    
    // Find the challenge
    const challenge = await Challenge.findByPk(challengeId);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Check if challenge is active or upcoming
    if (challenge.status === 'completed' || challenge.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This challenge is no longer available to join'
      });
    }
    
    // Check visibility permissions
    if (challenge.visibility === 'private' && challenge.creatorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'This is a private challenge'
      });
    }
    
    // Check if already participating
    const existingParticipation = await ChallengeParticipant.findOne({
      where: {
        challengeId,
        userId: req.user.id
      }
    });
    
    if (existingParticipation) {
      return res.status(400).json({
        success: false,
        message: 'You are already participating in this challenge'
      });
    }
    
    // Join the challenge
    const participation = await ChallengeParticipant.create({
      challengeId,
      userId: req.user.id,
      status: 'active',
      progress: 0,
      pointsEarned: 0
    });
    
    return res.status(200).json({
      success: true,
      message: 'Successfully joined the challenge',
      participation
    });
  } catch (error) {
    logger.error('Error joining challenge:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to join challenge'
    });
  }
});

/**
 * Leave a challenge
 */
router.post('/:challengeId/leave', async (req, res) => {
  try {
    const { challengeId } = req.params;
    
    // Find the challenge
    const challenge = await Challenge.findByPk(challengeId);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Find and remove participation
    const participation = await ChallengeParticipant.findOne({
      where: {
        challengeId,
        userId: req.user.id
      }
    });
    
    if (!participation) {
      return res.status(400).json({
        success: false,
        message: 'You are not participating in this challenge'
      });
    }
    
    // Soft-delete: mark as withdrawn instead of hard delete (audit trail)
    participation.status = 'inactive';
    participation.withdrawnAt = new Date();
    await participation.save();

    return res.status(200).json({
      success: true,
      message: 'Successfully left the challenge'
    });
  } catch (error) {
    logger.error('Error leaving challenge:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to leave challenge'
    });
  }
});

/**
 * Update challenge progress
 */
router.post('/:challengeId/progress', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { progress, overwrite = false } = req.body;

    if (progress === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Progress value is required'
      });
    }

    // Wrap in transaction with pessimistic lock to prevent race conditions
    const result = await sequelize.transaction(async (t) => {
      // Lock the participation row to prevent concurrent updates
      const participation = await ChallengeParticipant.findOne({
        where: {
          challengeId,
          userId: req.user.id,
          status: 'active'
        },
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!participation) {
        return { error: true, status: 404, message: 'You are not an active participant in this challenge' };
      }

      const challenge = await Challenge.findByPk(challengeId, { transaction: t });
      if (!challenge) {
        return { error: true, status: 404, message: 'Challenge not found' };
      }

      // Fitness challenges must earn progress from VERIFIED workout events, not
      // client-typed numbers — otherwise a joiner posts the goal and collects
      // the full reward without training. Biometric/habit categories (steps/
      // weight/nutrition/water/sleep/custom) have no workout-event evidence
      // source and stay self-reportable. (Sean policy 2026-07-15.)
      if (EVIDENCE_REQUIRED_CATEGORIES.has(challenge.category)) {
        return {
          error: true,
          status: 409,
          message: 'Workout-challenge progress is credited automatically from your logged workouts.',
          code: 'CHALLENGE_REQUIRES_WORKOUT_EVIDENCE',
        };
      }

      const {
        newProgress,
        cumulativePoints,
        pointsToAward,
        justCompleted,
      } = calculateChallengeProgressAward({
        currentProgress: participation.progress,
        priorPointsEarned: participation.pointsEarned,
        requestedProgress: progress,
        overwrite,
        challenge,
      });

      participation.progress = newProgress;
      participation.pointsEarned = cumulativePoints;
      if (justCompleted) {
        participation.status = 'completed';
        participation.isCompleted = true;
        participation.completedAt = new Date();
      }

      if (pointsToAward > 0) {
        await GamificationPointsService.recordLedgerEntry({
          userId: req.user.id,
          points: pointsToAward,
          transactionType: 'earn',
          source: 'challenge_completion',
          sourceId: Number(challengeId),
          description: 'Challenge progress: ' + challenge.name,
          metadata: {
            challengeId: Number(challengeId),
            participantId: participation.id,
            cumulativePoints,
            progress: newProgress,
          },
          idempotencyKey: 'challenge-progress:' + participation.id + ':' + cumulativePoints,
          maxPoints: 500,
        }, t);
      }

      await participation.save({ transaction: t });

      return {
        error: false,
        participation,
        isCompleted: participation.status === 'completed',
        pointsEarned: participation.pointsEarned,
        progress: participation.progress,
        goal: challenge.goal,
        progressPercentage: Math.min(100, Math.round((participation.progress / challenge.goal) * 100))
      };
    });

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
        ...(result.code ? { code: result.code } : {}),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      ...result
    });
  } catch (error) {
    if (error.message === 'Progress must be a finite non-negative number') {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error('Error updating challenge progress:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to update progress'
    });
  }
});

/**
 * Get challenge leaderboard
 */
router.get('/:challengeId/leaderboard', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // Find the challenge
    const challenge = await Challenge.findByPk(challengeId);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    if (challenge.type === 'global') {
      return res.status(404).json({
        success: false,
        message: 'Global challenge leaderboards are disabled for this legacy challenge'
      });
    }
    
    // Get leaderboard based on challenge type
    if (challenge.type === 'team') {
      // Get team leaderboard
      const teamLeaderboard = await ChallengeTeam.findAll({
        where: { challengeId },
        limit,
        offset,
        order: [['totalProgress', 'DESC']],
        include: [
          {
            model: User,
            as: 'captain',
            attributes: directoryAttributes(req.user)
          }
        ]
      });
      
      return res.status(200).json({
        success: true,
        leaderboard: teamLeaderboard,
        type: 'team',
        challengeName: challenge.name,
        pagination: {
          limit,
          offset,
          total: await ChallengeTeam.count({ where: { challengeId } })
        }
      });
    } else {
      // Get individual leaderboard
      const individualLeaderboard = await ChallengeParticipant.findAll({
        where: {
          challengeId,
          status: { [Op.in]: ['active', 'completed'] }
        },
        limit,
        offset,
        order: [['progress', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: directoryAttributes(req.user)
          }
        ]
      });
      
      return res.status(200).json({
        success: true,
        leaderboard: individualLeaderboard,
        type: 'individual',
        challengeName: challenge.name,
        pagination: {
          limit,
          offset,
          total: await ChallengeParticipant.count({ 
            where: {
              challengeId,
              status: { [Op.in]: ['active', 'completed'] }
            }
          })
        }
      });
    }
  } catch (error) {
    logger.error('Error fetching challenge leaderboard:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge leaderboard'
    });
  }
});

/**
 * Create a team for a challenge
 */
router.post('/:challengeId/teams', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }
    
    // Find the challenge
    const challenge = await Challenge.findByPk(challengeId);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.type !== 'team') {
      return res.status(400).json({
        success: false,
        message: 'This challenge does not support teams'
      });
    }
    
    // Create the team
    const team = await ChallengeTeam.create({
      challengeId,
      captainId: req.user.id,
      name,
      description,
      logoUrl: null
    });
    
    return res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    logger.error('Error creating team:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to create team'
    });
  }
});

export default router;
