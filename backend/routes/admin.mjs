// backend/routes/admin.mjs
import express from 'express';
import { protect, adminOnly as isAdmin } from '../middleware/authMiddleware.mjs';
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
router.use(protect);

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

    // An EMPTY exclusion list is not "exclude nothing" — Sequelize drops the whole WHERE clause,
    // so `notIn: []` matches EVERY row. Every cleanup below is destructive (sessions nulled,
    // notifications destroyed), so an empty user set would wipe the table rather than clean it.
    //
    // An empty Users table means a failed query, a migration mid-flight, or a soft-delete sweep —
    // never "every record in the system is garbage". Bail out instead of acting on that reading.
    if (userIds.length === 0) {
      await transaction.rollback();
      logger.warn('Admin data sync aborted: no users found. Refusing to treat every record as orphaned.');
      return errorResponse(
        res,
        'Data sync aborted: no users found. Every session and notification would have been treated as orphaned.',
        409
      );
    }

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
    
    // Find sessions whose trainer no longer EXISTS.
    //
    // This previously excluded against `users.filter(role === 'trainer')`, which is a different
    // question: it treats a session assigned to a real user holding any other role as orphaned.
    // Verified against production — 9 sessions carried a trainerId, every one pointing at a user
    // that exists (ids 5 and 2, both role='admin', i.e. admins who coach). Genuinely orphaned: 0.
    // Combined with the empty-array behaviour above (prod has zero role='trainer' users, so the
    // filtered list was empty and the clause vanished entirely), this endpoint would have cleared
    // the trainer from all 9 live sessions.
    //
    // Orphaned means the referenced row is gone. Role is a separate concern and must not be
    // repaired by silently deleting assignments.
    const orphanedTrainerSessions = await Session.findAll({
      where: {
        trainerId: { [Op.not]: null },
        [Op.and]: [
          {
            trainerId: {
              [Op.notIn]: userIds
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

// Legacy MCP restart endpoint
router.post('/restart-mcp-connections', isAdmin, async (req, res) => {
  try {
    logger.info('Blocked retired MCP server restart request');

    return res.status(410).json({
      success: false,
      retired: true,
      message: 'MCP servers are retired. Use first-party SwanStudios API health and deployment controls.'
    });
    
  } catch (error) {
    logger.error('Error blocking retired MCP restart:', error.message, { stack: error.stack });
    return errorResponse(res, 'Error handling retired MCP restart request', 500);
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
