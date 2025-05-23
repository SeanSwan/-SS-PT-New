// backend/controllers/progressSyncController.mjs
import fetch from 'node-fetch';
import db from '../models/index.mjs';
import logger from '../utils/logger.mjs';

// Get environment variables for MCP servers
const WORKOUT_MCP_URL = process.env.WORKOUT_MCP_URL || 'http://localhost:5000';
const GAMIFICATION_MCP_URL = process.env.GAMIFICATION_MCP_URL || 'http://localhost:5001';

/**
 * Progress Synchronization Controller
 * 
 * Handles synchronization of client progress data between the admin dashboard,
 * client dashboard, workout MCP server, and gamification MCP server.
 */
const progressSyncController = {
  /**
   * Synchronize client progress data between dashboards and MCP servers
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  syncClientProgress: async (req, res) => {
    try {
      logger.info('Starting client progress synchronization');
      
      // Get all clients
      const clients = await db.User.findAll({
        where: { role: 'client' },
        attributes: ['id', 'firstName', 'lastName', 'email']
      });
      
      logger.info(`Found ${clients.length} clients to synchronize`);
      
      // For each client, synchronize their progress data
      const syncResults = await Promise.all(clients.map(async (client) => {
        try {
          // Get client progress data from workout MCP
          const workoutResponse = await fetch(`${WORKOUT_MCP_URL}/api/client-progress/${client.id}`);
          
          if (!workoutResponse.ok) {
            throw new Error(`Workout MCP returned status: ${workoutResponse.status}`);
          }
          
          const workoutData = await workoutResponse.json();
          
          // Get client gamification data from gamification MCP
          const gamificationResponse = await fetch(`${GAMIFICATION_MCP_URL}/api/profile/${client.id}`);
          
          if (!gamificationResponse.ok) {
            throw new Error(`Gamification MCP returned status: ${gamificationResponse.status}`);
          }
          
          const gamificationData = await gamificationResponse.json();
          
          // Update database records with synchronized data
          const clientProgress = await db.ClientProgress.findOne({
            where: { userId: client.id }
          });
          
          if (clientProgress) {
            // Update existing progress record
            await clientProgress.update({
              workoutData: JSON.stringify(workoutData),
              gamificationData: JSON.stringify(gamificationData),
              lastSynced: new Date()
            });
          } else {
            // Create new progress record
            await db.ClientProgress.create({
              userId: client.id,
              workoutData: JSON.stringify(workoutData),
              gamificationData: JSON.stringify(gamificationData),
              lastSynced: new Date()
            });
          }
          
          return {
            clientId: client.id,
            name: `${client.firstName} ${client.lastName}`,
            success: true
          };
        } catch (error) {
          logger.error(`Error synchronizing client ${client.id}: ${error.message}`);
          return {
            clientId: client.id,
            name: `${client.firstName} ${client.lastName}`,
            success: false,
            error: error.message
          };
        }
      }));
      
      // Count successes and failures
      const successes = syncResults.filter(result => result.success).length;
      const failures = syncResults.filter(result => !result.success).length;
      
      logger.info(`Completed progress synchronization. Successes: ${successes}, Failures: ${failures}`);
      
      res.status(200).json({
        success: true,
        message: `Synchronized progress data for ${successes} clients with ${failures} failures`,
        results: syncResults
      });
    } catch (error) {
      logger.error(`Error in syncClientProgress: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to synchronize client progress data',
        error: error.message
      });
    }
  },
  
  /**
   * Verify integration between workout and gamification data
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  verifyProgressIntegration: async (req, res) => {
    try {
      logger.info('Verifying progress data integration');
      
      // Get all clients with progress data
      const clientsWithProgress = await db.ClientProgress.findAll({
        include: [{
          model: db.User,
          attributes: ['id', 'firstName', 'lastName', 'email'],
          where: { role: 'client' }
        }]
      });
      
      logger.info(`Found ${clientsWithProgress.length} clients with progress data`);
      
      // For each client, verify integration between workout and gamification data
      const verificationResults = clientsWithProgress.map(clientProgress => {
        try {
          const workoutData = JSON.parse(clientProgress.workoutData || '{}');
          const gamificationData = JSON.parse(clientProgress.gamificationData || '{}');
          
          // Check if required data is present
          const hasWorkoutData = workoutData && 
                                workoutData.progress && 
                                workoutData.progress.overallLevel;
                                
          const hasGamificationData = gamificationData && 
                                     gamificationData.profile && 
                                     gamificationData.profile.level;
          
          // Basic verification that data exists
          if (!hasWorkoutData || !hasGamificationData) {
            return {
              clientId: clientProgress.userId,
              name: `${clientProgress.User.firstName} ${clientProgress.User.lastName}`,
              verified: false,
              error: 'Missing required progress data'
            };
          }
          
          // Check if achievement counts match
          const workoutAchievements = workoutData.progress.achievements || [];
          const gamificationAchievements = gamificationData.achievements || [];
          
          // Simple verification that achievement counts are consistent
          const achievementsMatch = Math.abs(workoutAchievements.length - gamificationAchievements.length) <= 2;
          
          return {
            clientId: clientProgress.userId,
            name: `${clientProgress.User.firstName} ${clientProgress.User.lastName}`,
            verified: achievementsMatch,
            workoutLevel: workoutData.progress.overallLevel,
            gamificationLevel: gamificationData.profile.level,
            lastSynced: clientProgress.lastSynced
          };
        } catch (error) {
          logger.error(`Error verifying client ${clientProgress.userId}: ${error.message}`);
          return {
            clientId: clientProgress.userId,
            name: clientProgress.User ? `${clientProgress.User.firstName} ${clientProgress.User.lastName}` : 'Unknown',
            verified: false,
            error: error.message
          };
        }
      });
      
      // Count successes and failures
      const verified = verificationResults.filter(result => result.verified).length;
      const failed = verificationResults.filter(result => !result.verified).length;
      
      logger.info(`Completed verification. Verified: ${verified}, Failed: ${failed}`);
      
      res.status(200).json({
        success: true,
        message: `Verified ${verified} clients with ${failed} verification failures`,
        results: verificationResults
      });
    } catch (error) {
      logger.error(`Error in verifyProgressIntegration: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to verify progress data integration',
        error: error.message
      });
    }
  },
  
  /**
   * Update achievements based on workout progress
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  updateAchievements: async (req, res) => {
    try {
      logger.info('Starting achievement update based on workout progress');
      
      // Get all clients with progress data
      const clientsWithProgress = await db.ClientProgress.findAll({
        include: [{
          model: db.User,
          attributes: ['id', 'firstName', 'lastName', 'email'],
          where: { role: 'client' }
        }]
      });
      
      logger.info(`Found ${clientsWithProgress.length} clients for achievement updating`);
      
      // For each client, update achievements based on workout progress
      const updateResults = await Promise.all(clientsWithProgress.map(async (clientProgress) => {
        try {
          const workoutData = JSON.parse(clientProgress.workoutData || '{}');
          
          if (!workoutData || !workoutData.progress) {
            return {
              clientId: clientProgress.userId,
              name: `${clientProgress.User.firstName} ${clientProgress.User.lastName}`,
              success: false,
              error: 'No workout progress data found'
            };
          }
          
          // Call gamification MCP to update achievements based on workout progress
          const response = await fetch(`${GAMIFICATION_MCP_URL}/api/update-achievements/${clientProgress.userId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              workoutProgress: workoutData.progress
            })
          });
          
          if (!response.ok) {
            throw new Error(`Gamification MCP returned status: ${response.status}`);
          }
          
          const result = await response.json();
          
          // Update last synced timestamp
          await clientProgress.update({
            lastSynced: new Date()
          });
          
          return {
            clientId: clientProgress.userId,
            name: `${clientProgress.User.firstName} ${clientProgress.User.lastName}`,
            success: true,
            achievementsAdded: result.achievementsAdded || 0,
            achievementsUpdated: result.achievementsUpdated || 0
          };
        } catch (error) {
          logger.error(`Error updating achievements for client ${clientProgress.userId}: ${error.message}`);
          return {
            clientId: clientProgress.userId,
            name: clientProgress.User ? `${clientProgress.User.firstName} ${clientProgress.User.lastName}` : 'Unknown',
            success: false,
            error: error.message
          };
        }
      }));
      
      // Count successes and failures
      const successes = updateResults.filter(result => result.success).length;
      const failures = updateResults.filter(result => !result.success).length;
      
      logger.info(`Completed achievement update. Successes: ${successes}, Failures: ${failures}`);
      
      res.status(200).json({
        success: true,
        message: `Updated achievements for ${successes} clients with ${failures} failures`,
        results: updateResults
      });
    } catch (error) {
      logger.error(`Error in updateAchievements: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to update achievements based on workout progress',
        error: error.message
      });
    }
  },
  
  /**
   * Manually trigger a progress refresh for a specific client
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  refreshClientProgress: async (req, res) => {
    try {
      const { clientId } = req.params;
      
      if (!clientId) {
        return res.status(400).json({
          success: false,
          message: 'Client ID is required'
        });
      }
      
      logger.info(`Manually refreshing progress for client ${clientId}`);
      
      // Check if client exists
      const client = await db.User.findOne({
        where: { id: clientId, role: 'client' },
        attributes: ['id', 'firstName', 'lastName', 'email']
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      // Get workout progress
      const workoutResponse = await fetch(`${WORKOUT_MCP_URL}/api/client-progress/${clientId}`);
      
      if (!workoutResponse.ok) {
        throw new Error(`Workout MCP returned status: ${workoutResponse.status}`);
      }
      
      const workoutData = await workoutResponse.json();
      
      // Get gamification data
      const gamificationResponse = await fetch(`${GAMIFICATION_MCP_URL}/api/profile/${clientId}`);
      
      if (!gamificationResponse.ok) {
        throw new Error(`Gamification MCP returned status: ${gamificationResponse.status}`);
      }
      
      const gamificationData = await gamificationResponse.json();
      
      // Update or create progress record
      const [clientProgress, created] = await db.ClientProgress.findOrCreate({
        where: { userId: clientId },
        defaults: {
          userId: clientId,
          workoutData: JSON.stringify(workoutData),
          gamificationData: JSON.stringify(gamificationData),
          lastSynced: new Date()
        }
      });
      
      // If record already existed, update it
      if (!created) {
        await clientProgress.update({
          workoutData: JSON.stringify(workoutData),
          gamificationData: JSON.stringify(gamificationData),
          lastSynced: new Date()
        });
      }
      
      logger.info(`Successfully refreshed progress for client ${clientId}`);
      
      res.status(200).json({
        success: true,
        message: `Progress refreshed for ${client.firstName} ${client.lastName}`,
        clientId: client.id,
        lastSynced: new Date()
      });
    } catch (error) {
      logger.error(`Error in refreshClientProgress: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh client progress',
        error: error.message
      });
    }
  }
};

export default progressSyncController;