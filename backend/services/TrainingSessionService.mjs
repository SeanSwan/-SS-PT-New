/**
 * Training Session Service
 * =======================
 * Enhanced with coordinated model imports and simplified logic
 * Handles creation of training sessions when users purchase training packages
 */

// 🚀 ENHANCED: Coordinated model imports for consistent associations
import {
  getSession,
  getUser,
  getOrder,
  getOrderItem,
  getStorefrontItem
} from '../models/index.mjs';
import logger from '../utils/logger.mjs';

// Get models with coordinated associations
const Session = getSession();
const User = getUser();
const Order = getOrder();
const OrderItem = getOrderItem();
const StorefrontItem = getStorefrontItem();

class TrainingSessionService {
  /**
   * 🚀 ENHANCED: Create training sessions with simplified logic
   * @param {number} orderId - The order ID
   * @param {number} userId - The user ID who made the purchase
   */
  static async createSessionsForOrder(orderId, userId) {
    logger.info(`Creating training sessions for order ${orderId}, user ${userId}`);

    // Get the order with all items - simplified query
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [{ model: StorefrontItem, as: 'storefrontItem' }]
        }
      ]
    });

    if (!order?.orderItems?.length || order.status !== 'completed') {
      logger.info(`Order ${orderId} not suitable for session creation (status: ${order?.status})`);
      return { created: 0, sessions: [] };
    }

    const createdSessions = [];

    // 🚀 ENHANCED: Process items efficiently with better logic
    for (const orderItem of order.orderItems) {
      const { storefrontItem } = orderItem;
      
      if (!storefrontItem || !['fixed', 'monthly'].includes(storefrontItem.packageType)) {
        continue;
      }

      const sessionsToCreate = this.calculateSessionsToCreate(storefrontItem, orderItem.quantity);
      logger.info(`Creating ${sessionsToCreate} sessions for package: ${storefrontItem.name}`);
      
      // Create sessions in batch for efficiency
      const sessionData = Array.from({ length: sessionsToCreate }, (_, i) => ({
        userId,
        status: 'available',
        duration: 60,
        notes: `Session ${i + 1} from package: ${storefrontItem.name}`,
        sessionDate: new Date(),
        location: 'TBD',
        trainerId: null,
        confirmed: false,
        sessionDeducted: false
      }));

      const sessions = await Session.bulkCreate(sessionData, { returning: true });
      
      // Map created sessions
      sessions.forEach(session => {
        createdSessions.push({
          sessionId: session.id,
          packageName: storefrontItem.name,
          packageType: storefrontItem.packageType,
          orderItemId: orderItem.id
        });
      });
    }

    logger.info(`Successfully created ${createdSessions.length} training sessions for order ${orderId}`);

    return {
      orderId,
      userId,
      created: createdSessions.length,
      sessions: createdSessions
    };
  }

  /**
   * 🚀 ENHANCED: Simplified session calculation with better logic
   * @param {Object} storefrontItem - The storefront package item
   * @param {number} quantity - Quantity purchased
   * @returns {number} Number of sessions to create
   */
  static calculateSessionsToCreate(storefrontItem, quantity = 1) {
    const { packageType, sessions, totalSessions, months, sessionsPerWeek } = storefrontItem;
    
    const sessionsPerPackage = packageType === 'fixed' 
      ? sessions || 0
      : totalSessions || (months * 4 * sessionsPerWeek) || 0;

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
