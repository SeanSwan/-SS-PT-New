// backend/controllers/sessionSyncController.mjs
import logger from '../utils/logger.mjs';
import Session from '../models/Session.mjs';
import User from '../models/User.mjs';
import Order from '../models/Order.mjs';
import OrderItem from '../models/OrderItem.mjs';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';
import { Op } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Admin controller for synchronizing session data across dashboards
 * and fixing potential issues with purchased sessions not showing up properly
 * in client, admin, and trainer views.
 */

/**
 * Synchronize session data across all dashboards
 * This admin-only endpoint ensures that:
 * 1. All ordered sessions are correctly credited to client accounts
 * 2. Session data is consistent across admin, client, and trainer views
 * 3. Any missing notifications about sessions are regenerated
 */
export const syncSessions = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Admin-only endpoint
    if (req.user.role !== 'admin') {
      return errorResponse(res, 'Admin access required', 403);
    }
    
    logger.info('Starting session synchronization process', { userId: req.user.id });
    
    // 1. Ensure all purchased sessions are credited to user accounts
    const sessionOrders = await Order.findAll({
      where: {
        status: 'completed'
      },
      include: [{
        model: OrderItem,
        where: {
          itemType: 'training'
        },
        required: false
      }],
      transaction
    });
    
    logger.info(`Found ${sessionOrders.length} orders with session packages`);
    
    let fixedSessionCredits = 0;
    
    // Process each order with session packages
    for (const order of sessionOrders) {
      // Skip orders without session items
      if (!order.OrderItems || order.OrderItems.length === 0) continue;
      
      // Get the client
      const client = await User.findByPk(order.userId, { transaction });
      if (!client) {
        logger.warn(`Client not found for order ${order.id}`);
        continue;
      }
      
      // Calculate total sessions in this order
      const totalOrderedSessions = order.OrderItems.reduce((total, item) => {
        return total + (item.sessionCount || 0);
      }, 0);
      
      // If order has sessions but client doesn't have any credited, fix it
      if (totalOrderedSessions > 0 && (!client.availableSessions || client.availableSessions < totalOrderedSessions)) {
        logger.info(`Fixing session credits for client ${client.id} from order ${order.id}`);
        
        // Credit missing sessions
        const newSessionCount = (client.availableSessions || 0) + totalOrderedSessions;
        await client.update({ availableSessions: newSessionCount }, { transaction });
        
        fixedSessionCredits += totalOrderedSessions;
        
        logger.info(`Credited ${totalOrderedSessions} sessions to client ${client.id}`);
      }
    }
    
    // 2. Ensure session visibility across dashboards
    // Fix any sessions with incorrect visibility settings
    const fixedSessions = await Session.update(
      { 
        // Additional fields that might need fixing
        sessionDeducted: true 
      },
      {
        where: {
          status: 'completed',
          sessionDeducted: false
        },
        transaction
      }
    );
    
    // 3. Fixing sessions with null trainerId (if applicable)
    const fixedTrainerSessions = await Session.update(
      { 
        trainerId: req.user.id 
      },
      {
        where: {
          status: {
            [Op.in]: ['confirmed', 'completed']
          },
          trainerId: null
        },
        transaction
      }
    );
    
    // 4. Apply any needed fixes to cancelled sessions
    const fixedCancelledSessions = await Session.update(
      { 
        sessionDeducted: false 
      },
      {
        where: {
          status: 'cancelled',
          sessionDeducted: true
        },
        transaction
      }
    );
    
    // Commit all changes
    await transaction.commit();
    
    // Return summary of fixes
    return successResponse(res, {
      fixedSessionCredits,
      fixedSessions: fixedSessions[0],
      fixedTrainerSessions: fixedTrainerSessions[0],
      fixedCancelledSessions: fixedCancelledSessions[0]
    }, 'Session synchronization completed successfully');
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error in session synchronization:', error.message, { stack: error.stack });
    return errorResponse(res, 'Error synchronizing sessions', 500);
  }
};

/**
 * Dashboard data consistency check
 * This endpoint performs a read-only consistency check across dashboards
 * and reports any issues without making changes
 */
export const checkDashboardConsistency = async (req, res) => {
  try {
    // Admin-only endpoint
    if (req.user.role !== 'admin') {
      return errorResponse(res, 'Admin access required', 403);
    }
    
    logger.info('Starting dashboard consistency check', { userId: req.user.id });
    
    const issues = [];
    
    // 1. Check for inconsistencies in session data
    const incompleteSessionCount = await Session.count({
      where: {
        status: 'completed',
        sessionDeducted: false
      }
    });
    
    if (incompleteSessionCount > 0) {
      issues.push(`${incompleteSessionCount} completed sessions not marked as deducted`);
    }
    
    // 2. Check for sessions assigned to non-existent users
    const orphanedSessions = await Session.count({
      where: {
        userId: {
          [Op.not]: null
        }
      },
      include: [{
        model: User,
        as: 'client',
        required: false,
        where: {
          id: null
        }
      }]
    });
    
    if (orphanedSessions > 0) {
      issues.push(`${orphanedSessions} sessions assigned to non-existent users`);
    }
    
    // 3. Check for sessions with trainer assigned but not visible to trainer
    const invisibleTrainerSessions = await Session.count({
      where: {
        trainerId: {
          [Op.not]: null
        },
        status: {
          [Op.notIn]: ['cancelled', 'available']
        }
      }
    });
    
    if (invisibleTrainerSessions > 0) {
      issues.push(`${invisibleTrainerSessions} sessions may not be visible to assigned trainers`);
    }
    
    // 4. Check for completed orders with session packages not credited to users
    const ordersWithSessions = await Order.findAll({
      where: {
        status: 'completed'
      },
      include: [{
        model: OrderItem,
        where: {
          itemType: 'training'
        },
        required: true
      }]
    });
    
    let uncreditedSessionsCount = 0;
    
    for (const order of ordersWithSessions) {
      // Get total sessions in this order
      const totalOrderedSessions = order.OrderItems.reduce((total, item) => {
        return total + (item.sessionCount || 0);
      }, 0);
      
      // Check if client has these sessions
      const client = await User.findByPk(order.userId);
      if (client && (!client.availableSessions || client.availableSessions < totalOrderedSessions)) {
        uncreditedSessionsCount += 1;
      }
    }
    
    if (uncreditedSessionsCount > 0) {
      issues.push(`${uncreditedSessionsCount} orders with session packages not fully credited to clients`);
    }
    
    // Return the consistency check results
    return successResponse(res, {
      issues,
      incompleteSessionCount,
      orphanedSessions,
      invisibleTrainerSessions,
      uncreditedSessionsCount,
      totalChecked: {
        sessions: await Session.count(),
        orders: await Order.count(),
        users: await User.count()
      }
    }, issues.length > 0 ? 'Dashboard consistency issues found' : 'Dashboard data is consistent');
    
  } catch (error) {
    logger.error('Error in dashboard consistency check:', error.message, { stack: error.stack });
    return errorResponse(res, 'Error checking dashboard consistency', 500);
  }
};

export default {
  syncSessions,
  checkDashboardConsistency
};