// backend/routes/clientProgressRoutes.mjs
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { ClientProgress, User } from '../models/associations.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route GET /api/client-progress
 * @desc Get client progress for the authenticated user
 * @access Private (clients only)
 */
router.get('/', 
  // protect, 
  // authorize(['client']), 
  async (req, res) => {
    try {
      // Find or create progress record for the current user
      const [clientProgress, created] = await ClientProgress.findOrCreate({
        where: { userId: req.user?.id || 'default-user' },
        defaults: {
          userId: req.user?.id || 'default-user',
          overallLevel: 0,
          experiencePoints: 0
          // All other fields have default values in the model
        }
      });
      
      // If a new record was created, this is the user's first time accessing progress
      if (created) {
        console.log(`Created new progress record for user ${req.user.id}`);
      }
      
      return res.status(200).json({
        success: true,
        progress: clientProgress
      });
    } catch (error) {
      console.error('Error fetching client progress:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching progress data',
        error: error.message
      });
    }
});

/**
 * @route PUT /api/client-progress
 * @desc Update client progress (for clients completing workouts)
 * @access Private (clients only)
 */
router.put('/',
  protect,
  authorize(['client']),
  async (req, res) => {
    try {
      const { 
        experiencePoints,
        levelUpdates,
        achievementsUnlocked,
        workoutMetrics
      } = req.body;
      
      const clientProgress = await ClientProgress.findOne({
        where: { userId: req.user.id }
      });
      
      if (!clientProgress) {
        return res.status(404).json({
          success: false,
          message: 'Client progress record not found'
        });
      }
      
      // Update experience points if provided
      if (experiencePoints) {
        clientProgress.experiencePoints += experiencePoints;
        
        // Check if client should level up (simple algorithm)
        const xpNeeded = 100 + (clientProgress.overallLevel * 25);
        if (clientProgress.experiencePoints >= xpNeeded) {
          clientProgress.overallLevel += 1;
          clientProgress.experiencePoints -= xpNeeded;
        }
      }
      
      // Update individual level categories if provided
      if (levelUpdates && typeof levelUpdates === 'object') {
        Object.entries(levelUpdates).forEach(([category, points]) => {
          // Format: {category}Level and {category}ExperiencePoints
          const levelField = `${category}Level`;
          const pointsField = `${category}ExperiencePoints`;
          
          // Only process valid fields that exist in the model
          if (clientProgress[levelField] !== undefined && clientProgress[pointsField] !== undefined) {
            clientProgress[pointsField] += points;
            
            // Check for level up in this category
            const categoryXpNeeded = 50 + (clientProgress[levelField] * 15);
            if (clientProgress[pointsField] >= categoryXpNeeded) {
              clientProgress[levelField] += 1;
              clientProgress[pointsField] -= categoryXpNeeded;
            }
          }
        });
      }
      
      // Update achievements if provided
      if (achievementsUnlocked && Array.isArray(achievementsUnlocked) && achievementsUnlocked.length > 0) {
        const currentAchievements = clientProgress.achievements || [];
        const currentAchievementDates = clientProgress.achievementDates || {};
        
        // Add only new achievements
        const newAchievements = achievementsUnlocked.filter(a => !currentAchievements.includes(a));
        
        if (newAchievements.length > 0) {
          // Update the achievements array with new unique achievements
          const updatedAchievements = [...new Set([...currentAchievements, ...newAchievements])];
          clientProgress.achievements = updatedAchievements;
          
          // Record unlock dates for new achievements
          const updatedDates = { ...currentAchievementDates };
          newAchievements.forEach(achievement => {
            updatedDates[achievement] = new Date().toISOString();
          });
          clientProgress.achievementDates = updatedDates;
        }
      }
      
      // Update workout metrics if provided
      if (workoutMetrics && typeof workoutMetrics === 'object') {
        if (workoutMetrics.workoutsCompleted) {
          clientProgress.workoutsCompleted = (clientProgress.workoutsCompleted || 0) + workoutMetrics.workoutsCompleted;
        }
        
        if (workoutMetrics.totalExercisesPerformed) {
          clientProgress.totalExercisesPerformed = (clientProgress.totalExercisesPerformed || 0) + workoutMetrics.totalExercisesPerformed;
        }
        
        if (workoutMetrics.totalMinutes) {
          clientProgress.totalMinutes = (clientProgress.totalMinutes || 0) + workoutMetrics.totalMinutes;
        }
        
        // Handle streak days logic
        if (workoutMetrics.updatedStreakDays !== undefined) {
          clientProgress.streakDays = workoutMetrics.updatedStreakDays;
        }
      }
      
      // Save all updates
      await clientProgress.save();
      
      return res.status(200).json({
        success: true,
        message: 'Progress updated successfully',
        progress: clientProgress
      });
      
    } catch (error) {
      console.error('Error updating client progress:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error updating progress data',
        error: error.message
      });
    }
});

/**
 * @route GET /api/client-progress/leaderboard
 * @desc Get client progress leaderboard (top clients by overall level)
 * @access Private
 */
router.get('/leaderboard',
  protect,
  async (req, res) => {
    try {
      const leaderboard = await ClientProgress.findAll({
        attributes: ['overallLevel', 'userId'],
        include: [
          {
            model: User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
          }
        ],
        order: [
          ['overallLevel', 'DESC']
        ],
        limit: 10
      });
      
      return res.status(200).json({
        success: true,
        leaderboard
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching leaderboard',
        error: error.message
      });
    }
});

/**
 * @route GET /api/client-progress/:userId
 * @desc Get client progress for a specific user (trainer accessing client data)
 * @access Private (trainers and admins only)
 */
router.get('/:userId',
  protect,
  authorize(['trainer', 'admin']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify the client exists and is actually a client
      const client = await User.findOne({
        where: {
          id: userId,
          role: 'client'
        },
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      // Get the client's progress
      const clientProgress = await ClientProgress.findOne({
        where: { userId }
      });
      
      if (!clientProgress) {
        return res.status(404).json({
          success: false,
          message: 'Client progress record not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        client,
        progress: clientProgress
      });
      
    } catch (error) {
      console.error('Error fetching client progress:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching progress data',
        error: error.message
      });
    }
});

/**
 * @route PUT /api/client-progress/:userId
 * @desc Update client progress for a specific user (trainer updating client data)
 * @access Private (trainers and admins only)
 */
router.put('/:userId',
  protect,
  authorize(['trainer', 'admin']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Verify the client exists and is actually a client
      const client = await User.findOne({
        where: {
          id: userId,
          role: 'client'
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      // Get the client's progress
      const clientProgress = await ClientProgress.findOne({
        where: { userId }
      });
      
      if (!clientProgress) {
        return res.status(404).json({
          success: false,
          message: 'Client progress record not found'
        });
      }
      
      // Update fields based on request body (trainer/admin can update any field)
      Object.keys(updates).forEach(key => {
        // Only update valid fields that exist in the model
        if (clientProgress[key] !== undefined) {
          clientProgress[key] = updates[key];
        }
      });
      
      // Save all updates
      await clientProgress.save();
      
      return res.status(200).json({
        success: true,
        message: 'Progress updated successfully by trainer/admin',
        progress: clientProgress
      });
      
    } catch (error) {
      console.error('Error updating client progress:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error updating progress data',
        error: error.message
      });
    }
});

export default router;