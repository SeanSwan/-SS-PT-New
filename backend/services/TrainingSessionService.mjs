/**
 * Training Session Service
 * =======================
 * Handles creation of training sessions when users purchase training packages
 * Ensures proper integration between SwanStudios Store and client/admin/trainer dashboards
 */

import Session from '../models/Session.mjs';
import User from '../models/User.mjs';
import Order from '../models/Order.mjs';
import OrderItem from '../models/OrderItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

class TrainingSessionService {
  /**
   * Create training sessions for a completed order
   * @param {number} orderId - The order ID
   * @param {number} userId - The user ID who made the purchase
   */
  static async createSessionsForOrder(orderId, userId) {
    try {
      logger.info(`Creating training sessions for order ${orderId}, user ${userId}`);

      // Get the order with all items
      const order = await Order.findByPk(orderId, {
        include: [
          {
            model: OrderItem,
            as: 'orderItems',
            include: [
              {
                model: StorefrontItem,
                as: 'storefrontItem'
              }
            ]
          },
          {
            model: User,
            as: 'user'
          }
        ]
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (order.status !== 'completed') {
        logger.info(`Order ${orderId} is not completed (status: ${order.status}), skipping session creation`);
        return { created: 0, sessions: [] };
      }

      const createdSessions = [];
      let totalSessionsCreated = 0;

      // Process each order item
      for (const orderItem of order.orderItems) {
        const storefrontItem = orderItem.storefrontItem;
        
        if (!storefrontItem) {
          logger.warning(`No storefront item found for order item ${orderItem.id}`);
          continue;
        }

        // Only create sessions for training packages
        if (storefrontItem.packageType === 'fixed' || storefrontItem.packageType === 'monthly') {
          const sessionsToCreate = this.calculateSessionsToCreate(storefrontItem, orderItem.quantity);
          
          logger.info(`Creating ${sessionsToCreate} sessions for package: ${storefrontItem.name}`);
          
          // Create available sessions for the user
          for (let i = 0; i < sessionsToCreate; i++) {
            const session = await Session.create({
              userId: userId,
              status: 'available',
              duration: 60, // Default session duration
              notes: `Session ${i + 1} from package: ${storefrontItem.name}`,
              sessionDate: new Date(), // Will be updated when scheduled
              location: 'TBD', // To be determined when scheduled
              trainerId: null, // Will be assigned later
              confirmed: false,
              sessionDeducted: false // Sessions are pre-paid
            });

            createdSessions.push({
              sessionId: session.id,
              packageName: storefrontItem.name,
              packageType: storefrontItem.packageType,
              orderItemId: orderItem.id
            });

            totalSessionsCreated++;
          }
        }
      }

      logger.info(`Successfully created ${totalSessionsCreated} training sessions for order ${orderId}`);

      return {
        orderId,
        userId,
        created: totalSessionsCreated,
        sessions: createdSessions
      };

    } catch (error) {
      logger.error(`Error creating sessions for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate how many sessions to create based on the package
   * @param {Object} storefrontItem - The storefront package item
   * @param {number} quantity - Quantity purchased
   * @returns {number} Number of sessions to create
   */
  static calculateSessionsToCreate(storefrontItem, quantity = 1) {
    let sessionsPerPackage = 0;

    if (storefrontItem.packageType === 'fixed') {
      // Fixed packages: use the sessions field directly
      sessionsPerPackage = storefrontItem.sessions || 0;
    } else if (storefrontItem.packageType === 'monthly') {
      // Monthly packages: use totalSessions or calculate from months and sessions per week
      if (storefrontItem.totalSessions) {
        sessionsPerPackage = storefrontItem.totalSessions;
      } else if (storefrontItem.months && storefrontItem.sessionsPerWeek) {
        // Calculate: months * weeks per month * sessions per week
        sessionsPerPackage = storefrontItem.months * 4 * storefrontItem.sessionsPerWeek;
      }
    }

    return sessionsPerPackage * quantity;
  }

  /**
   * Get available sessions for a user
   * @param {number} userId - The user ID
   * @returns {Array} Array of available sessions
   */
  static async getAvailableSessionsForUser(userId) {
    try {
      const sessions = await Session.findAll({
        where: {
          userId: userId,
          status: 'available'
        },
        order: [['createdAt', 'ASC']],
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      return sessions;
    } catch (error) {
      logger.error(`Error getting available sessions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get session summary for a user (for dashboard display)
   * @param {number} userId - The user ID
   * @returns {Object} Session summary
   */
  static async getSessionSummaryForUser(userId) {
    try {
      const sessionCounts = await Session.findAll({
        where: { userId },
        attributes: [
          'status',
          [Session.sequelize.fn('COUNT', Session.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const summary = {
        available: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        total: 0
      };

      sessionCounts.forEach(row => {
        const status = row.status;
        const count = parseInt(row.count);
        
        if (summary.hasOwnProperty(status)) {
          summary[status] = count;
        }
        summary.total += count;
      });

      return summary;
    } catch (error) {
      logger.error(`Error getting session summary for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Assign a trainer to available sessions
   * @param {number} userId - The client user ID
   * @param {number} trainerId - The trainer user ID
   * @param {number} sessionCount - Number of sessions to assign (optional, assigns all if not specified)
   */
  static async assignTrainerToSessions(userId, trainerId, sessionCount = null) {
    try {
      // Verify trainer exists and has trainer role
      const trainer = await User.findByPk(trainerId);
      if (!trainer || trainer.role !== 'trainer') {
        throw new Error(`User ${trainerId} is not a valid trainer`);
      }

      // Get available sessions for the user
      const whereClause = {
        userId: userId,
        status: 'available',
        trainerId: null
      };

      const options = {
        where: whereClause,
        order: [['createdAt', 'ASC']]
      };

      if (sessionCount && sessionCount > 0) {
        options.limit = sessionCount;
      }

      const sessions = await Session.findAll(options);

      if (sessions.length === 0) {
        throw new Error(`No available sessions found for user ${userId}`);
      }

      // Update sessions to assign the trainer
      const sessionIds = sessions.map(s => s.id);
      
      const [updatedCount] = await Session.update(
        { 
          trainerId: trainerId,
          status: 'available' // Keep as available until actually scheduled
        },
        {
          where: {
            id: sessionIds
          }
        }
      );

      logger.info(`Assigned trainer ${trainerId} to ${updatedCount} sessions for user ${userId}`);

      return {
        assignedCount: updatedCount,
        trainerId: trainerId,
        trainerName: `${trainer.firstName} ${trainer.lastName}`,
        sessionIds: sessionIds
      };

    } catch (error) {
      logger.error(`Error assigning trainer to sessions:`, error);
      throw error;
    }
  }
}

export default TrainingSessionService;
