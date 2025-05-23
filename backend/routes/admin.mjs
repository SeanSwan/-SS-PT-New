// backend/routes/admin.mjs
import express from 'express';
import { adminOnly as isAdmin } from '../middleware/authMiddleware.mjs';
import User from '../models/User.mjs';
import Session from '../models/Session.mjs';
import Notification from '../models/Notification.mjs';
import { Op } from 'sequelize';
import db from '../database.mjs';
import logger from '../utils/logger.mjs';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';

const router = express.Router();

/**
 * Admin routes for system maintenance and debugging
 * All these routes require admin privileges
 */

// Synchronize data across dashboards
router.post('/sync-data', isAdmin, async (req, res) => {
  const transaction = await db.transaction();
  
  try {
    logger.info('Admin initiated data synchronization');
    
    // 1. Fix orphaned sessions (sessions with non-existent users)
    const users = await User.findAll({
      attributes: ['id'],
      transaction
    });
    
    const userIds = users.map(user => user.id);
    
    // Find sessions with non-existent users
    const orphanedUserSessions = await Session.findAll({
      where: {
        userId: { [Op.not]: null },
        [Op.and]: [
          { 
            userId: { 
              [Op.notIn]: userIds 
            } 
          }
        ]
      },
      transaction
    });
    
    // Mark orphaned sessions as available
    if (orphanedUserSessions.length > 0) {
      logger.info(`Found ${orphanedUserSessions.length} orphaned user sessions`);
      await Session.update(
        { 
          status: 'available',
          userId: null,
          confirmed: false,
          bookingDate: null
        },
        { 
          where: {
            id: orphanedUserSessions.map(s => s.id)
          },
          transaction
        }
      );
    }
    
    // Find sessions with non-existent trainers
    const trainerIds = users
      .filter(user => user.role === 'trainer')
      .map(user => user.id);
    
    const orphanedTrainerSessions = await Session.findAll({
      where: {
        trainerId: { [Op.not]: null },
        [Op.and]: [
          { 
            trainerId: { 
              [Op.notIn]: trainerIds 
            } 
          }
        ]
      },
      transaction
    });
    
    // Clear trainer assignments for orphaned trainer sessions
    if (orphanedTrainerSessions.length > 0) {
      logger.info(`Found ${orphanedTrainerSessions.length} orphaned trainer sessions`);
      await Session.update(
        { 
          trainerId: null
        },
        { 
          where: {
            id: orphanedTrainerSessions.map(s => s.id)
          },
          transaction
        }
      );
    }
    
    // 2. Fix inconsistent session states
    // Find sessions that should be marked as completed (in the past)
    const pastSessions = await Session.findAll({
      where: {
        sessionDate: {
          [Op.lt]: new Date()
        },
        status: {
          [Op.in]: ['scheduled', 'confirmed']
        }
      },
      transaction
    });
    
    if (pastSessions.length > 0) {
      logger.info(`Found ${pastSessions.length} past sessions that need status updates`);
      await Session.update(
        { 
          status: 'completed'
        },
        { 
          where: {
            id: pastSessions.map(s => s.id)
          },
          transaction
        }
      );
    }
    
    // 3. Fix orphaned notifications
    const orphanedNotifications = await Notification.findAll({
      where: {
        userId: {
          [Op.notIn]: userIds
        }
      },
      transaction
    });
    
    if (orphanedNotifications.length > 0) {
      logger.info(`Found ${orphanedNotifications.length} orphaned notifications`);
      await Notification.destroy({
        where: {
          id: orphanedNotifications.map(n => n.id)
        },
        transaction
      });
    }
    
    // Commit all changes
    await transaction.commit();
    
    return successResponse(res, {
      orphanedUserSessions: orphanedUserSessions.length,
      orphanedTrainerSessions: orphanedTrainerSessions.length,
      pastSessions: pastSessions.length,
      orphanedNotifications: orphanedNotifications.length
    }, 'Data synchronization completed successfully');
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error in data synchronization:', error.message, { stack: error.stack });
    return errorResponse(res, 'Error during data synchronization', 500);
  }
});

// Restart MCP connections
router.post('/restart-mcp-connections', isAdmin, async (req, res) => {
  try {
    logger.info('Admin initiated MCP server restart');
    
    // In a real implementation, this would call scripts to restart the MCP servers
    // For now, just log the attempt
    
    return successResponse(res, {
      success: true
    }, 'MCP server restart initiated');
    
  } catch (error) {
    logger.error('Error restarting MCP connections:', error.message, { stack: error.stack });
    return errorResponse(res, 'Error restarting MCP connections', 500);
  }
});

// Test notification system
router.post('/test-notifications', isAdmin, async (req, res) => {
  try {
    const { userId, type = 'system' } = req.body;
    
    logger.info(`Admin initiated test notification for user ${userId || 'all'}`);
    
    if (userId) {
      // Send test notification to specific user
      const user = await User.findByPk(userId);
      
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }
      
      const notification = await Notification.create({
        userId,
        title: 'Test Notification',
        message: 'This is a test notification from the admin panel',
        type,
        read: false
      });
      
      return successResponse(res, { notification }, 'Test notification sent successfully');
    } else {
      // Send test notifications to all users
      const users = await User.findAll();
      const notifications = [];
      
      for (const user of users) {
        const notification = await Notification.create({
          userId: user.id,
          title: 'System-wide Test Notification',
          message: 'This is a system-wide test notification from the admin panel',
          type,
          read: false
        });
        
        notifications.push(notification);
      }
      
      return successResponse(res, { 
        count: notifications.length 
      }, `Test notifications sent to ${notifications.length} users`);
    }
    
  } catch (error) {
    logger.error('Error sending test notifications:', error.message, { stack: error.stack });
    return errorResponse(res, 'Error sending test notifications', 500);
  }
});

export default router;
