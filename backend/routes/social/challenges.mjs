import express from 'express';
import { Challenge, ChallengeParticipant, ChallengeTeam } from '../../models/social/index.mjs';
import User from '../../models/User.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';
import { Op } from 'sequelize';
import sequelize from '../../database.mjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Set up multer for challenge image uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(process.cwd(), 'uploads', 'challenges');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + uuidv4();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
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
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get active challenges
    const challenges = await Challenge.findAll({
      where: {
        status: 'active',
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      },
      limit,
      offset,
      order: [['startDate', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
        }
      ]
    });
    
    // Get challenge IDs
    const challengeIds = challenges.map(challenge => challenge.id);
    
    // Get user participation for these challenges
    const participations = await ChallengeParticipant.findAll({
      where: {
        challengeId: { [Op.in]: challengeIds },
        userId: req.user.id
      }
    });
    
    // Create a map for quick lookup
    const participationMap = {};
    participations.forEach(part => {
      participationMap[part.challengeId] = part;
    });
    
    // Format challenges with participation data
    const formattedChallenges = challenges.map(challenge => {
      const challengeObj = challenge.toJSON();
      
      // Add participation data if available
      if (participationMap[challenge.id]) {
        challengeObj.participation = participationMap[challenge.id];
        challengeObj.isParticipating = true;
      } else {
        challengeObj.isParticipating = false;
      }
      
      return challengeObj;
    });
    
    return res.status(200).json({
      success: true,
      challenges: formattedChallenges,
      pagination: {
        limit,
        offset,
        total: await Challenge.count({
          where: {
            status: 'active',
            startDate: { [Op.lte]: new Date() },
            endDate: { [Op.gte]: new Date() }
          }
        })
      }
    });
  } catch (error) {
    console.error('Error fetching active challenges:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active challenges',
      error: error.message
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
              attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
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
    console.error('Error fetching user challenges:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user challenges',
      error: error.message
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
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
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
    const leaderboard = await ChallengeParticipant.findAll({
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
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
        }
      ]
    });
    
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
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
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
    console.error('Error fetching challenge details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge details',
      error: error.message
    });
  }
});

/**
 * Create a new challenge
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'individual',
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
    
    // Create challenge data
    const challengeData = {
      creatorId: req.user.id,
      name,
      description,
      type,
      category,
      goal: parseInt(goal),
      unit,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      visibility,
      pointsPerUnit: parseInt(pointsPerUnit),
      bonusPoints: parseInt(bonusPoints),
      badgeId: badgeId || null
    };
    
    // Add image URL if file was uploaded
    if (req.file) {
      challengeData.imageUrl = `/uploads/challenges/${req.file.filename}`;
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
    console.error('Error creating challenge:', error);
    
    // If there was an uploaded file, delete it
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create challenge',
      error: error.message
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
    console.error('Error joining challenge:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to join challenge',
      error: error.message
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
    
    // Remove participation
    await participation.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Successfully left the challenge'
    });
  } catch (error) {
    console.error('Error leaving challenge:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to leave challenge',
      error: error.message
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
    
    // Find the user's participation in this challenge
    const participation = await ChallengeParticipant.findOne({
      where: {
        challengeId,
        userId: req.user.id,
        status: 'active'
      }
    });
    
    if (!participation) {
      return res.status(404).json({
        success: false,
        message: 'You are not an active participant in this challenge'
      });
    }
    
    // Get the challenge
    const challenge = await Challenge.findByPk(challengeId);
    
    // Update progress
    const newProgress = overwrite ? parseFloat(progress) : participation.progress + parseFloat(progress);
    participation.progress = Math.min(newProgress, challenge.goal);
    
    // Check if completed
    if (participation.progress >= challenge.goal && participation.status === 'active') {
      participation.status = 'completed';
      participation.pointsEarned += challenge.bonusPoints;
    }
    
    // Calculate points earned
    const pointsFromProgress = Math.floor(participation.progress * challenge.pointsPerUnit);
    participation.pointsEarned = pointsFromProgress + (participation.status === 'completed' ? challenge.bonusPoints : 0);
    
    await participation.save();
    
    return res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      participation,
      isCompleted: participation.status === 'completed',
      pointsEarned: participation.pointsEarned,
      progress: participation.progress,
      goal: challenge.goal,
      progressPercentage: Math.min(100, Math.round((participation.progress / challenge.goal) * 100))
    });
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: error.message
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
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
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
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
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
    console.error('Error fetching challenge leaderboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge leaderboard',
      error: error.message
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
    console.error('Error creating team:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: error.message
    });
  }
});

export default router;
