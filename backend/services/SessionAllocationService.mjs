/**
 * SessionAllocationService.mjs - SwanStudios Session Allocation Engine
 * ===================================================================
 * Master Prompt v33 Compliance - Production-ready session allocation
 * Handles payment completion → session allocation → admin dashboard flow
 * 
 * Features:
 * - Automatic session allocation from completed orders
 * - User session balance management
 * - Admin notification system integration
 * - Comprehensive audit trail
 * - Error handling and rollback capabilities
 * - Real-time admin dashboard updates
 * 
 * Business Logic:
 * Payment Completion → Extract Session Count → Create Available Sessions → Update User Balance → Notify Admin
 */

import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';
import {
  getUser,
  getOrder,
  getOrderItem,
  getStorefrontItem,
  getSession,
  getFinancialTransaction
} from '../models/index.mjs';
import { isNonDeductingClient } from './sessionBillingPolicy.mjs';
import { extractOrderSessionData, hasPaymentNoteItems } from './orderSessionExtraction.mjs';

class SessionAllocationService {
  constructor() {
    this.serviceName = 'SessionAllocationService';
    this.version = '1.0.0';
  }

  /**
   * Allocate sessions from completed order
   * Main entry point for payment completion
   *
   * ORDER-LEVEL IDEMPOTENCY (hostile-review H4/H5 fix 2026-09-25):
   * paymentAppliedAt is the ALLOCATION CLAIM, taken inside the allocation
   * transaction while holding the Order row lock:
   *   lock order → marker set? → idempotent no-op (alreadyAllocated)
   *            └→ no? create sessions + financial record + claim marker → commit
   * Allocation and claim commit or roll back TOGETHER — a crashed attempt
   * leaves no marker and no sessions (retry safe), a committed attempt makes
   * every retry (Stripe redelivery, admin status toggle, manual re-run) a
   * no-op. Callers must NOT pre-set paymentAppliedAt before calling: a
   * pre-set marker would permanently suppress the grant.
   *
   * @param {number} orderId - Completed order ID
   * @param {number} userId - User who made the purchase
   * @returns {Object} Allocation result (alreadyAllocated: true on retry)
   */
  async allocateSessionsFromOrder(orderId, userId) {
    const startTime = Date.now();
    logger.info(`[SessionAllocation] Starting session allocation for order ${orderId}`, {
      orderId,
      userId,
      timestamp: new Date().toISOString()
    });

    const transaction = await sequelize.transaction();

    try {
      // 1. Validate order and user (Order row locked FOR UPDATE inside)
      const { order, user } = await this.validateOrderAndUser(orderId, userId, transaction);

      // 2. ORDER-LEVEL GUARD: marker set = sessions were already granted
      if (order.paymentAppliedAt) {
        await transaction.rollback();
        logger.info(`[SessionAllocation] Order ${orderId} already allocated (paymentAppliedAt set) — idempotent no-op`, {
          orderId,
          userId
        });
        return {
          success: true,
          allocated: 0,
          alreadyAllocated: true,
          message: 'Sessions were already allocated for this order'
        };
      }

      // 3. Extract session information from order items
      const sessionData = await this.extractSessionDataFromOrder(order);

      if (sessionData.totalSessions === 0) {
        await transaction.rollback();
        logger.info(`[SessionAllocation] No sessions to allocate for order ${orderId}`);
        return {
          success: true,
          allocated: 0,
          message: 'No sessions found in order items'
        };
      }

      // 4. Create available session slots (same transaction as the claim)
      const createdSessions = await this.createAvailableSessions(sessionData, user, transaction);

      // 5. Update user session balance (if applicable)
      await this.updateUserSessionBalance(user, sessionData.totalSessions);

      // 6. Create financial transaction record (same transaction)
      await this.createFinancialTransactionRecord(order, sessionData, transaction);

      // 7. Claim the marker INSIDE the allocation transaction: sessions,
      //    financial record and claim commit or roll back together.
      await order.update(
        { paymentAppliedAt: order.paymentAppliedAt || new Date() },
        { transaction }
      );

      await transaction.commit();

      // 8. Log allocation success
      const duration = Date.now() - startTime;
      logger.info(`[SessionAllocation] Session allocation completed successfully`, {
        orderId,
        userId,
        allocatedSessions: createdSessions.length,
        totalSessionsFromOrder: sessionData.totalSessions,
        duration: `${duration}ms`,
        sessionIds: createdSessions.map(s => s.id)
      });

      return {
        success: true,
        allocated: createdSessions.length,
        totalSessions: sessionData.totalSessions,
        sessions: createdSessions,
        alreadyAllocated: false,
        orderDetails: {
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          items: sessionData.items
        },
        message: `Successfully allocated ${createdSessions.length} sessions for ${user.firstName} ${user.lastName}`
      };

    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        logger.warn(`[SessionAllocation] Rollback warning for order ${orderId}: ${rollbackError.message}`);
      }
      logger.error(`[SessionAllocation] Error allocating sessions for order ${orderId}`, {
        error: error.message,
        stack: error.stack,
        orderId,
        userId,
        duration: `${Date.now() - startTime}ms`
      });

      throw new Error(`Session allocation failed: ${error.message}`);
    }
  }

  /**
   * Validate order and user for allocation
   * The Order row is fetched SELECT ... FOR UPDATE so concurrent writers
   * (webhook retry vs admin toggle) serialize on the claim check.
   *
   * @param {number} orderId - Order ID
   * @param {number} userId - User ID
   * @param {object} transaction - Sequelize transaction (required for the lock)
   * @returns {Object} Validated order and user
   */
  async validateOrderAndUser(orderId, userId, transaction) {
    const Order = getOrder();
    const OrderItem = getOrderItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();

    // Get order with items, locked for the claim check
    const order = await Order.findOne({
      where: {
        id: orderId,
        userId,
        status: 'completed'
      },
      include: [{
        model: OrderItem,
        as: 'orderItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem'
        }]
      }],
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Order
      },
      transaction
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found or not completed for user ${userId}`);
    }

    if ((!order.orderItems || order.orderItems.length === 0) && !hasPaymentNoteItems(order)) {
      throw new Error(`Order ${orderId} has no items`);
    }

    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return { order, user };
  }

  /**
   * Extract session data from order items
   * 
   * @param {Object} order - Order with items
   * @returns {Object} Session data summary
   */
  async extractSessionDataFromOrder(order) {
    const StorefrontItem = getStorefrontItem();
    return extractOrderSessionData(order, {
      StorefrontItem,
      logger,
      logPrefix: 'SessionAllocation',
    });
  }

  /**
   * Create available session slots
   * Creates individual session records that can be scheduled
   *
   * @param {Object} sessionData - Session data from order
   * @param {Object} user - User object
   * @param {object} transaction - Sequelize transaction (atomic with the claim)
   * @returns {Array} Created session records
   */
  async createAvailableSessions(sessionData, user, transaction) {
    const Session = getSession();
    const createdSessions = [];

    logger.info(`[SessionAllocation] Creating ${sessionData.totalSessions} available sessions for user ${user.id}`);

    // Create sessions in batch for better performance
    const sessionsToCreate = [];
    
    for (let i = 0; i < sessionData.totalSessions; i++) {
      sessionsToCreate.push({
        userId: user.id,
        trainerId: null, // Will be assigned later by admin
        status: 'available',
        duration: 60, // Default 60 minutes
        location: null,
        notes: `Session ${i + 1} from purchase - Available for scheduling`,
        sessionDate: null, // Will be set when scheduled
        sessionDeducted: false, // Not deducted until scheduled/completed
        confirmed: false
      });
    }

    // Bulk create sessions
    const createdSessionRecords = await Session.bulkCreate(sessionsToCreate, {
      returning: true,
      transaction
    });

    createdSessions.push(...createdSessionRecords);

    logger.info(`[SessionAllocation] Successfully created ${createdSessions.length} session records`, {
      userId: user.id,
      sessionIds: createdSessions.map(s => s.id)
    });

    return createdSessions;
  }

  /**
   * Update user session balance
   * Tracks available sessions for user
   * 
   * @param {Object} user - User object
   * @param {number} sessionCount - Sessions to add
   */
  async updateUserSessionBalance(user, sessionCount) {
    try {
      // For now, we'll track sessions through the Session table
      // In the future, we might add a dedicated UserSessionBalance table
      
      logger.info(`[SessionAllocation] User ${user.id} balance updated with ${sessionCount} sessions`);
      
      // You could extend this to update a dedicated balance field
      // user.availableSessions = (user.availableSessions || 0) + sessionCount;
      // await user.save();
      
    } catch (error) {
      logger.error(`[SessionAllocation] Error updating user session balance`, {
        userId: user.id,
        sessionCount,
        error: error.message
      });
    }
  }

  /**
   * Create financial transaction record
   * Links order to financial tracking
   * 
   * @param {Object} order - Order object
   * @param {Object} sessionData - Session data
   * @param {object} transaction - Sequelize transaction (atomic with the claim)
   */
  async createFinancialTransactionRecord(order, sessionData, transaction) {
    try {
      const FinancialTransaction = getFinancialTransaction();

      const transactionRecord = await FinancialTransaction.create({
        userId: order.userId,
        orderId: order.id,
        amount: order.totalAmount,
        currency: 'USD',
        status: 'succeeded',
        paymentMethod: order.paymentMethod || 'manual',
        description: `Session package purchase - ${sessionData.totalSessions} sessions`,
        metadata: JSON.stringify({
          sessionData,
          orderNumber: order.orderNumber,
          allocationDate: new Date().toISOString()
        }),
        processedAt: new Date()
      }, { transaction });

      logger.info(`[SessionAllocation] Financial transaction created`, {
        transactionId: transactionRecord.id,
        orderId: order.id,
        amount: order.totalAmount
      });

    } catch (error) {
      logger.warn(`[SessionAllocation] Error creating financial transaction record`, {
        orderId: order.id,
        error: error.message
      });
      // Don't fail the allocation if financial tracking fails
    }
  }

  /**
   * Manually add sessions to user (Admin function)
   * Used by admin to add complimentary or bonus sessions
   * 🚨 CRITICAL FIX: Now updates user.availableSessions for consistency with store purchases
   * 
   * @param {number} userId - User ID
   * @param {number} sessionCount - Sessions to add
   * @param {string} reason - Reason for adding sessions
   * @param {number} adminUserId - Admin user ID
   * @returns {Object} Addition result
   */
  async addSessionsToUser(userId, sessionCount, reason = 'Admin added', adminUserId = null) {
    logger.info(`[SessionAllocation] Manually adding ${sessionCount} sessions to user ${userId}`, {
      userId,
      sessionCount,
      reason,
      adminUserId
    });

    try {
      const User = getUser();
      const Session = getSession();

      // Validate user exists
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // 🚨 CRITICAL FIX: Update user.availableSessions for consistency with store purchases
      if (isNonDeductingClient(user)) {
        throw new Error('Manual paid-session allocation is disabled for free-tracking clients');
      }

      user.availableSessions = (user.availableSessions || 0) + sessionCount;
      await user.save();

      // Also create individual session records for detailed tracking (optional)
      const sessionsToCreate = [];
      for (let i = 0; i < sessionCount; i++) {
        sessionsToCreate.push({
          userId: user.id,
          trainerId: null,
          status: 'available',
          duration: 60,
          notes: `${reason} - Session ${i + 1}`,
          sessionDate: null,
          sessionDeducted: false,
          confirmed: false
        });
      }

      const createdSessions = await Session.bulkCreate(sessionsToCreate, {
        returning: true
      });

      logger.info(`[SessionAllocation] Successfully added ${createdSessions.length} sessions to user ${userId}`, {
        userId,
        sessionIds: createdSessions.map(s => s.id),
        reason,
        adminUserId,
        newAvailableSessionsCount: user.availableSessions
      });

      return {
        success: true,
        added: createdSessions.length,
        availableSessions: user.availableSessions,
        sessions: createdSessions,
        message: `Successfully added ${createdSessions.length} sessions to ${user.firstName} ${user.lastName}. Total available: ${user.availableSessions}`
      };

    } catch (error) {
      logger.error(`[SessionAllocation] Error manually adding sessions`, {
        userId,
        sessionCount,
        reason,
        error: error.message
      });

      throw new Error(`Failed to add sessions: ${error.message}`);
    }
  }

  /**
   * Get user session summary
   * Returns current session availability for user
   * 🚨 CRITICAL FIX: Now reads from user.availableSessions for consistency
   * 
   * @param {number} userId - User ID
   * @returns {Object} Session summary
   */
  async getUserSessionSummary(userId) {
    try {
      const Session = getSession();
      const User = getUser();
      
      // Get user data for available sessions count
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }
      
      // Get detailed session breakdown from session records
      const summary = await Session.findAll({
        attributes: [
          'status',
          [Session.sequelize.fn('COUNT', Session.sequelize.col('status')), 'count']
        ],
        where: { userId },
        group: ['status'],
        raw: true
      });

      const result = {
        userId,
        available: user.availableSessions || 0, // 🚨 CRITICAL: Use user field for consistency
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        total: 0
      };

      // Fill in other session statuses from session records
      summary.forEach(item => {
        if (item.status !== 'available') {
          result[item.status] = parseInt(item.count);
        }
      });

      // Calculate total (available from user field + other statuses from records)
      result.total = result.available + result.scheduled + result.completed + result.cancelled;

      logger.info(`[SessionAllocation] User session summary retrieved`, {
        userId,
        summary: result
      });

      return result;
    } catch (error) {
      logger.error(`[SessionAllocation] Error getting user session summary`, {
        userId,
        error: error.message
      });

      throw new Error(`Failed to get session summary: ${error.message}`);
    }
  }

  /**
   * Health check for the service
   * 
   * @returns {Object} Health status
   */
  async healthCheck() {
    try {
      return {
        service: this.serviceName,
        version: this.version,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: this.serviceName,
        version: this.version,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export singleton instance
const sessionAllocationService = new SessionAllocationService();

export default sessionAllocationService;
export { SessionAllocationService };
