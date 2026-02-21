/**
 * Session Deduction Service
 * ==========================
 * Automatically deducts session credits from client packages
 * after sessions are completed or the scheduled time has passed.
 */

import { getSession, getUser, Op } from '../models/index.mjs';
import sequelize from '../database.mjs';

/**
 * Process session deductions for past sessions that haven't been deducted yet
 * This should be called periodically (e.g., via cron job or at regular intervals)
 *
 * @returns {Object} Result with count of processed sessions
 */
export async function processSessionDeductions() {
  const Session = getSession();
  const User = getUser();

  const results = {
    processed: 0,
    deducted: 0,
    errors: [],
    noCredits: []
  };

  const transaction = await sequelize.transaction();

  try {
    // Find sessions that:
    // 1. Are scheduled or confirmed (not cancelled, not completed, not available)
    // 2. Have a session date in the past
    // 3. Haven't been deducted yet
    // 4. Have a client assigned
    const eligibleSessions = await Session.findAll({
      where: {
        status: {
          [Op.in]: ['scheduled', 'confirmed']
        },
        sessionDate: {
          [Op.lt]: new Date()
        },
        sessionDeducted: false,
        userId: {
          [Op.not]: null
        },
        isBlocked: false
      },
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions']
        }
      ],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    // Group sessions by client to avoid Sequelize duplicate-object bug:
    // findAll with include creates separate JS objects per row for the same FK,
    // so read-modify-write on session.client loses deductions for multi-session clients.
    const sessionsByClient = {};
    for (const session of eligibleSessions) {
      results.processed++;
      if (!session.client) {
        results.errors.push({ sessionId: session.id, reason: 'No client found' });
        // Mark orphan session completed
        session.status = 'completed';
        session.notes = (session.notes || '') + '\n[Auto] Session completed - No client found';
        await session.save({ transaction });
        continue;
      }
      const cid = session.client.id;
      if (!sessionsByClient[cid]) {
        sessionsByClient[cid] = {
          clientName: `${session.client.firstName} ${session.client.lastName}`,
          sessions: []
        };
      }
      sessionsByClient[cid].sessions.push(session);
    }

    // Process each client atomically: row-lock, atomic decrement, mark sessions
    for (const [clientIdStr, group] of Object.entries(sessionsByClient)) {
      const clientId = Number(clientIdStr);
      try {
        // Refetch with row lock for accurate availableSessions
        const client = await User.findByPk(clientId, {
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        if (!client) {
          for (const session of group.sessions) {
            results.errors.push({ sessionId: session.id, reason: 'Client not found on refetch' });
          }
          continue;
        }

        const currentCredits = client.availableSessions || 0;
        const totalSessions = group.sessions.length;
        const deductible = Math.min(totalSessions, currentCredits);

        // Mark sessions that CAN be deducted (up to available credits)
        for (let i = 0; i < deductible; i++) {
          const session = group.sessions[i];
          session.status = 'completed';
          session.sessionDeducted = true;
          session.deductionDate = new Date();
          session.notes = (session.notes || '') + '\n[Auto] Session credit deducted automatically';
          await session.save({ transaction });
          results.deducted++;
        }

        // Atomically decrement credits for all deductible sessions at once
        if (deductible > 0) {
          await client.decrement('availableSessions', { by: deductible, transaction });
        }

        // Mark remaining sessions (no credits) as completed without deduction
        for (let i = deductible; i < totalSessions; i++) {
          const session = group.sessions[i];
          results.noCredits.push({
            sessionId: session.id,
            clientId,
            clientName: group.clientName,
            reason: 'No available session credits'
          });
          session.status = 'completed';
          session.notes = (session.notes || '') + '\n[Auto] Session completed - No credits to deduct';
          await session.save({ transaction });
        }
      } catch (error) {
        for (const session of group.sessions) {
          results.errors.push({
            sessionId: session.id,
            reason: process.env.NODE_ENV === 'development' ? error.message : 'Processing error'
          });
        }
      }
    }

    await transaction.commit();

    console.log(`[SessionDeduction] Processed ${results.processed} sessions, deducted ${results.deducted} credits`);
    if (results.noCredits.length > 0) {
      console.log(`[SessionDeduction] ${results.noCredits.length} clients had no credits available`);
    }
    if (results.errors.length > 0) {
      console.error(`[SessionDeduction] ${results.errors.length} errors occurred`);
    }

    return results;

  } catch (error) {
    await transaction.rollback();
    console.error('[SessionDeduction] Error processing deductions:', error);
    throw error;
  }
}

/**
 * Get clients with exhausted session credits who have pending sessions
 * These clients need to apply payment / purchase more sessions
 *
 * @returns {Array} List of clients needing payment
 */
export async function getClientsNeedingPayment() {
  const Session = getSession();
  const User = getUser();

  try {
    // Find clients/users with 0 or less available sessions
    // Includes both 'client' and 'user' roles to match applyPackagePayment eligibility
    const clients = await User.findAll({
      where: {
        role: { [Op.in]: ['client', 'user'] },
        availableSessions: {
          [Op.lte]: 0
        }
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions'],
      include: [
        {
          model: Session,
          as: 'clientSessions',
          where: {
            status: {
              [Op.in]: ['scheduled', 'confirmed']
            },
            sessionDate: {
              [Op.gte]: new Date()
            }
          },
          required: true,
          attributes: ['id', 'sessionDate', 'status']
        }
      ],
      order: [[{ model: Session, as: 'clientSessions' }, 'sessionDate', 'ASC']]
    });

    return clients.map(client => ({
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      phone: client.phone,
      availableSessions: client.availableSessions,
      upcomingSessions: client.clientSessions.length,
      nextSession: client.clientSessions[0]?.sessionDate
    }));

  } catch (error) {
    console.error('[SessionDeduction] Error getting clients needing payment:', error);
    throw error;
  }
}

/**
 * Apply payment to a client's account (add session credits)
 *
 * @param {number} clientId - Client user ID
 * @param {number} sessionsToAdd - Number of sessions to add
 * @param {string} paymentNote - Note about the payment
 * @returns {Object} Updated client info
 */
export async function applyPaymentCredits(clientId, sessionsToAdd, paymentNote = '') {
  const User = getUser();
  const transaction = await sequelize.transaction();

  try {
    const client = await User.findByPk(clientId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!client) {
      throw new Error('Client not found');
    }

    if (!['client', 'user'].includes(client.role)) {
      throw new Error('User is not a client or user');
    }

    const previousCredits = client.availableSessions || 0;
    await client.increment('availableSessions', { by: sessionsToAdd, transaction });

    await transaction.commit();

    const newBalance = previousCredits + sessionsToAdd;
    console.log(`[SessionDeduction] Applied ${sessionsToAdd} credits to client ${clientId}. ${previousCredits} -> ${newBalance}`);

    return {
      clientId: client.id,
      name: `${client.firstName} ${client.lastName}`,
      previousCredits,
      creditsAdded: sessionsToAdd,
      newBalance,
      paymentNote
    };

  } catch (error) {
    await transaction.rollback();
    console.error('[SessionDeduction] Error applying payment credits:', error);
    throw error;
  }
}

/**
 * Get the last package a client successfully purchased.
 * Filters to completed orders only (not failed/refunded/pending).
 *
 * @param {number} clientId - Client user ID
 * @returns {Object|null} Last package info or null
 */
export async function getClientLastPackage(clientId) {
  try {
    const models = sequelize.models;
    const OModel = models.Order;
    const OIModel = models.OrderItem;
    const SIModel = models.StorefrontItem;

    if (!OModel || !OIModel || !SIModel) {
      console.warn('[SessionDeduction] Order/OrderItem/StorefrontItem models not available');
      return null;
    }

    const lastOrder = await OModel.findOne({
      where: {
        userId: clientId,
        status: 'completed'
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: OIModel,
          as: 'orderItems',
          include: [
            {
              model: SIModel,
              as: 'storefrontItem',
              attributes: ['id', 'name', 'sessions', 'totalSessions', 'pricePerSession', 'totalCost', 'price', 'packageType']
            }
          ]
        }
      ]
    });

    if (!lastOrder || !lastOrder.orderItems || lastOrder.orderItems.length === 0) {
      return null;
    }

    const item = lastOrder.orderItems[0];
    const pkg = item.storefrontItem;

    if (!pkg) {
      return null;
    }

    return {
      packageId: pkg.id,
      packageName: pkg.name,
      sessions: pkg.sessions || pkg.totalSessions || 0,
      price: parseFloat(pkg.totalCost || pkg.price || 0),
      pricePerSession: parseFloat(pkg.pricePerSession || 0),
      packageType: pkg.packageType,
      orderId: lastOrder.id
    };
  } catch (error) {
    console.error('[SessionDeduction] Error getting client last package:', error);
    return null;
  }
}

/**
 * Apply a package payment to a client - creates proper Order/Transaction records.
 * Uses a recovery cart to satisfy Order.cartId NOT NULL constraint.
 * Follows the atomic pattern from SessionGrantService.mjs.
 *
 * @param {Object} params
 * @param {number} params.clientId - Client user ID
 * @param {number} params.storefrontItemId - Package to apply
 * @param {string} params.paymentMethod - 'cash' | 'venmo' | 'zelle' | 'check'
 * @param {string} params.paymentReference - External reference (receipt #, etc.)
 * @param {string} [params.adminNotes] - Optional admin notes
 * @param {number} params.adminUserId - Admin user performing the action
 * @returns {Object} Result with orderId, sessionsAdded, newBalance
 */
export async function applyPackagePayment({
  clientId,
  storefrontItemId,
  paymentMethod,
  paymentReference,
  adminNotes,
  adminUserId
}) {
  const User = getUser();
  const models = sequelize.models;
  const ShoppingCart = models.ShoppingCart;
  const Order = models.Order;
  const OrderItem = models.OrderItem;
  const StorefrontItem = models.StorefrontItem;
  const FinancialTransaction = models.FinancialTransaction;

  if (!Order || !StorefrontItem || !ShoppingCart) {
    throw new Error('Required models (Order, StorefrontItem, ShoppingCart) not available');
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Validate client
    const client = await User.findByPk(clientId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!client) {
      throw new Error('Client not found');
    }

    if (!['client', 'user'].includes(client.role)) {
      throw new Error('User is not a client or user');
    }

    // 2. Idempotency guard: reject duplicate within 60 seconds
    const sixtySecondsAgo = new Date(Date.now() - 60000);
    const recentDuplicate = await Order.findOne({
      where: {
        userId: clientId,
        paymentAppliedBy: adminUserId,
        status: 'completed',
        completedAt: { [Op.gte]: sixtySecondsAgo }
      },
      include: OrderItem ? [{
        model: OrderItem,
        as: 'orderItems',
        where: { storefrontItemId },
        required: true
      }] : [],
      transaction
    });

    if (recentDuplicate) {
      throw new Error(
        `Duplicate payment detected: Order #${recentDuplicate.orderNumber} was created ${Math.round((Date.now() - new Date(recentDuplicate.completedAt).getTime()) / 1000)}s ago for the same client and package. Please wait 60 seconds before retrying.`
      );
    }

    // 3. Fetch the package
    const pkg = await StorefrontItem.findByPk(storefrontItemId, { transaction });
    if (!pkg) {
      throw new Error('Package not found');
    }

    if (pkg.isActive === false) {
      throw new Error('Package is inactive and cannot be applied');
    }

    const sessionsToAdd = pkg.sessions || pkg.totalSessions || 0;
    if (sessionsToAdd <= 0) {
      throw new Error('Package has no sessions to grant');
    }

    const totalAmount = parseFloat(pkg.totalCost || pkg.price || 0);

    // 4. Create recovery cart (satisfies Order.cartId NOT NULL constraint)
    let cartId = null;
    if (ShoppingCart) {
      const recoveryCart = await ShoppingCart.create({
        userId: clientId,
        status: 'completed',
        paymentStatus: 'paid',
        total: totalAmount,
        subtotal: totalAmount,
        tax: 0,
        sessionsGranted: true,
        completedAt: new Date(),
        stripeSessionData: JSON.stringify({
          type: 'admin_recovery',
          adminUserId,
          paymentMethod,
          paymentReference,
          createdAt: new Date().toISOString()
        })
      }, { transaction });
      cartId = recoveryCart.id;
    }

    // 5. Generate unique order number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `REC-${timestamp}-${random}`;

    // 6. Create Order
    const order = await Order.create({
      userId: clientId,
      cartId,
      orderNumber,
      totalAmount,
      status: 'completed',
      paymentMethod,
      paymentId: paymentReference || null,
      billingName: `${client.firstName} ${client.lastName}`,
      billingEmail: client.email,
      notes: adminNotes || `Admin recovery payment via ${paymentMethod}`,
      completedAt: new Date(),
      paymentAppliedAt: new Date(),
      paymentAppliedBy: adminUserId,
      paymentReference: paymentReference || null
    }, { transaction });

    // 7. Create OrderItem
    if (OrderItem) {
      await OrderItem.create({
        orderId: order.id,
        storefrontItemId: pkg.id,
        name: pkg.name,
        description: pkg.description || '',
        quantity: 1,
        price: totalAmount,
        subtotal: totalAmount,
        itemType: pkg.packageType,
        metadata: {
          sessionsGranted: sessionsToAdd,
          pricePerSession: parseFloat(pkg.pricePerSession || 0),
          adminRecovery: true
        }
      }, { transaction });
    }

    // 8. Create FinancialTransaction (audit trail)
    if (FinancialTransaction) {
      await FinancialTransaction.create({
        userId: clientId,
        orderId: order.id,
        cartId,
        amount: totalAmount,
        currency: 'USD',
        status: 'succeeded',
        paymentMethod,
        description: `Admin recovery: ${pkg.name} (${sessionsToAdd} sessions) via ${paymentMethod}`,
        metadata: JSON.stringify({
          adminUserId,
          paymentReference,
          packageId: pkg.id,
          packageName: pkg.name,
          sessionsAdded: sessionsToAdd,
          type: 'admin_recovery'
        }),
        processedAt: new Date(),
        netAmount: totalAmount,
        feeAmount: 0
      }, { transaction });
    }

    // 9. Atomically increment sessions (row-locked above)
    const previousCredits = client.availableSessions || 0;
    await client.increment('availableSessions', { by: sessionsToAdd, transaction });

    // 10. Upgrade role if needed (user → client on purchase)
    if (client.role === 'user') {
      client.role = 'client';
      await client.save({ transaction });
    }

    await transaction.commit();

    console.log(`[SessionDeduction] Admin recovery: ${sessionsToAdd} sessions from ${pkg.name} applied to client ${clientId} by admin ${adminUserId}`);

    return {
      orderId: order.id,
      orderNumber,
      sessionsAdded: sessionsToAdd,
      previousBalance: previousCredits,
      newBalance: previousCredits + sessionsToAdd,
      packageName: pkg.name,
      totalAmount
    };

  } catch (error) {
    await transaction.rollback();
    console.error('[SessionDeduction] Error applying package payment:', error);
    throw error;
  }
}

export default {
  processSessionDeductions,
  getClientsNeedingPayment,
  applyPaymentCredits,
  getClientLastPackage,
  applyPackagePayment
};
