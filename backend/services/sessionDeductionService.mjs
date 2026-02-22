/**
 * Session Deduction Service
 * ==========================
 * Automatically deducts session credits from client packages
 * after sessions are completed or the scheduled time has passed.
 */

import { getSession, getUser, Op } from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import {
  VALID_PAYMENT_METHODS,
  METHODS_REQUIRING_REFERENCE,
  MAX_REFERENCE_LENGTH,
  MAX_NOTES_LENGTH,
  MIN_FORCE_REASON_LENGTH,
  MAX_FORCE_REASON_LENGTH,
  sanitizeString,
  isValidUUID,
  maskReference,
  isIdempotencyViolation
} from '../utils/paymentRecovery.constants.mjs';

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Create an error with a stable .code property for route-layer mapping.
 * Optionally attach a data payload for reconciliation responses.
 */
function serviceError(message, code, data) {
  const err = new Error(message);
  err.code = code;
  if (data) err.data = data;
  return err;
}

/**
 * Safely append a marker note to session.notes, skipping if already present.
 * Caps total notes at 5000 characters (truncates oldest content).
 */
function appendNoteOnce(currentNotes, marker) {
  const notes = currentNotes || '';
  if (notes.includes(marker)) return notes;
  return (notes + '\n' + marker).slice(-5000);
}

/**
 * Sleep helper for reconciliation retry backoff.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main Functions ──────────────────────────────────────────────

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
    const eligibleSessions = await Session.findAll({
      where: {
        status: { [Op.in]: ['scheduled', 'confirmed'] },
        sessionDate: { [Op.lt]: new Date() },
        sessionDeducted: false,
        userId: { [Op.not]: null },
        isBlocked: false
      },
      include: [{
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions']
      }],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    // Group sessions by client to avoid Sequelize duplicate-object bug
    const sessionsByClient = {};
    for (const session of eligibleSessions) {
      results.processed++;
      if (!session.client) {
        results.errors.push({ sessionId: session.id, reason: 'No client found' });
        session.status = 'completed';
        session.notes = appendNoteOnce(session.notes, '[Auto] Session completed - No client found');
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

    // Process each client atomically
    for (const [clientIdStr, group] of Object.entries(sessionsByClient)) {
      const clientId = Number(clientIdStr);
      try {
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

        for (let i = 0; i < deductible; i++) {
          const session = group.sessions[i];
          session.status = 'completed';
          session.sessionDeducted = true;
          session.deductionDate = new Date();
          session.notes = appendNoteOnce(session.notes, '[Auto] Session credit deducted automatically');
          await session.save({ transaction });
          results.deducted++;
        }

        if (deductible > 0) {
          await client.decrement('availableSessions', { by: deductible, transaction });
        }

        for (let i = deductible; i < totalSessions; i++) {
          const session = group.sessions[i];
          results.noCredits.push({
            sessionId: session.id,
            clientId,
            clientName: group.clientName,
            reason: 'No available session credits'
          });
          session.status = 'completed';
          session.notes = appendNoteOnce(session.notes, '[Auto] Session completed - No credits to deduct');
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

    logger.info('Session deductions processed', {
      domain: 'payment_recovery',
      event: 'deduction_batch_processed',
      processed: results.processed,
      deducted: results.deducted,
      noCredits: results.noCredits.length,
      errors: results.errors.length
    });

    if (results.noCredits.length > 0) {
      logger.warn('Clients had no credits for deduction', {
        domain: 'payment_recovery',
        event: 'deduction_no_credits',
        count: results.noCredits.length,
        clientIds: results.noCredits.map(nc => nc.clientId)
      });
    }

    if (results.errors.length > 0) {
      logger.error('Errors during session deduction', {
        domain: 'payment_recovery',
        event: 'deduction_errors',
        count: results.errors.length,
        errors: results.errors
      });
    }

    return results;

  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to process session deductions', {
      domain: 'payment_recovery',
      event: 'deduction_batch_failed',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get clients with exhausted session credits who have pending sessions
 *
 * @returns {Array} List of clients needing payment
 */
export async function getClientsNeedingPayment() {
  const Session = getSession();
  const User = getUser();

  try {
    const clients = await User.findAll({
      where: {
        role: { [Op.in]: ['client', 'user'] },
        availableSessions: { [Op.lte]: 0 }
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions'],
      include: [{
        model: Session,
        as: 'clientSessions',
        where: {
          status: { [Op.in]: ['scheduled', 'confirmed'] },
          sessionDate: { [Op.gte]: new Date() }
        },
        required: true,
        attributes: ['id', 'sessionDate', 'status']
      }],
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
    logger.error('Failed to get clients needing payment', {
      domain: 'payment_recovery',
      error: error.message
    });
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
      throw serviceError('Client not found', 'CLIENT_NOT_FOUND');
    }

    if (!['client', 'user'].includes(client.role)) {
      throw serviceError('User is not a client or user', 'INVALID_ROLE');
    }

    const previousCredits = client.availableSessions || 0;
    await client.increment('availableSessions', { by: sessionsToAdd, transaction });

    await transaction.commit();

    const newBalance = previousCredits + sessionsToAdd;
    logger.info('Payment credits applied', {
      domain: 'payment_recovery',
      event: 'payment_recovery_success',
      clientId: client.id,
      creditsAdded: sessionsToAdd,
      previousBalance: previousCredits,
      newBalance
    });

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
    logger.error('Failed to apply payment credits', {
      domain: 'payment_recovery',
      event: 'payment_recovery_failed',
      clientId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get the last package a client successfully purchased.
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
      logger.warn('Order/OrderItem/StorefrontItem models not available', {
        domain: 'payment_recovery'
      });
      return null;
    }

    const lastOrder = await OModel.findOne({
      where: { userId: clientId, status: 'completed' },
      order: [['createdAt', 'DESC']],
      include: [{
        model: OIModel,
        as: 'orderItems',
        include: [{
          model: SIModel,
          as: 'storefrontItem',
          attributes: ['id', 'name', 'sessions', 'totalSessions', 'pricePerSession', 'totalCost', 'price', 'packageType']
        }]
      }]
    });

    if (!lastOrder || !lastOrder.orderItems || lastOrder.orderItems.length === 0) {
      return null;
    }

    const item = lastOrder.orderItems[0];
    const pkg = item.storefrontItem;

    if (!pkg) return null;

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
    logger.error('Failed to get client last package', {
      domain: 'payment_recovery',
      clientId,
      error: error.message
    });
    return null;
  }
}

/**
 * Apply a package payment to a client — creates Order/Transaction audit trail.
 * Two-layer idempotency: 60-second business guard + DB unique key.
 *
 * @param {Object} params
 * @param {number} params.clientId
 * @param {number} params.storefrontItemId
 * @param {string} params.paymentMethod
 * @param {string} params.paymentReference
 * @param {string} [params.adminNotes]
 * @param {number} params.adminUserId
 * @param {string} params.idempotencyToken - Frontend-generated UUID v4
 * @param {boolean} [params.force] - Skip 60-second guard (requires forceReason)
 * @param {string} [params.forceReason] - Required when force=true
 * @returns {Object} Result with orderId, sessionsAdded, newBalance
 */
export async function applyPackagePayment({
  clientId,
  storefrontItemId,
  paymentMethod,
  paymentReference,
  adminNotes,
  adminUserId,
  idempotencyToken,
  force,
  forceReason
}) {
  const User = getUser();
  const models = sequelize.models;
  const ShoppingCart = models.ShoppingCart;
  const Order = models.Order;
  const OrderItem = models.OrderItem;
  const StorefrontItem = models.StorefrontItem;
  const FinancialTransaction = models.FinancialTransaction;

  if (!Order || !StorefrontItem || !ShoppingCart) {
    throw serviceError('Required models (Order, StorefrontItem, ShoppingCart) not available', 'MODELS_UNAVAILABLE');
  }

  // ── Service-level validation (caller-safe) ────────────────────
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw serviceError('clientId must be a positive integer', 'INVALID_CLIENT_ID');
  }
  if (!Number.isInteger(storefrontItemId) || storefrontItemId <= 0) {
    throw serviceError('storefrontItemId must be a positive integer', 'INVALID_STOREFRONT_ITEM_ID');
  }
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    throw serviceError(`paymentMethod must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`, 'INVALID_PAYMENT_METHOD');
  }

  // Sanitize and validate string fields
  const refResult = sanitizeString(paymentReference, MAX_REFERENCE_LENGTH);
  if (refResult.error) {
    throw serviceError(`paymentReference: ${refResult.error}`, 'PAYMENT_REFERENCE_TOO_LONG');
  }
  const sanitizedReference = refResult.value;

  if (METHODS_REQUIRING_REFERENCE.includes(paymentMethod) && !sanitizedReference) {
    throw serviceError(`paymentReference is required for ${paymentMethod} payments`, 'MISSING_PAYMENT_REFERENCE');
  }

  const notesResult = sanitizeString(adminNotes, MAX_NOTES_LENGTH, true);
  if (notesResult.error) {
    throw serviceError(`adminNotes: ${notesResult.error}`, 'ADMIN_NOTES_TOO_LONG');
  }
  const sanitizedNotes = notesResult.value;

  // Idempotency token validation
  if (!idempotencyToken || typeof idempotencyToken !== 'string') {
    throw serviceError('idempotencyToken is required', 'INVALID_IDEMPOTENCY_TOKEN');
  }
  if (!isValidUUID(idempotencyToken)) {
    throw serviceError('idempotencyToken must be a valid UUID v4', 'INVALID_IDEMPOTENCY_TOKEN');
  }

  // Force validation
  if (force === true) {
    if (!forceReason || typeof forceReason !== 'string') {
      throw serviceError('forceReason is required when force is true', 'MISSING_FORCE_REASON');
    }
    const reasonResult = sanitizeString(forceReason, MAX_FORCE_REASON_LENGTH, true);
    if (reasonResult.error) {
      throw serviceError(`forceReason: ${reasonResult.error}`, 'FORCE_REASON_TOO_LONG');
    }
    if (reasonResult.value.length < MIN_FORCE_REASON_LENGTH) {
      throw serviceError(`forceReason must be at least ${MIN_FORCE_REASON_LENGTH} characters`, 'MISSING_FORCE_REASON');
    }
    forceReason = reasonResult.value;
  }

  logger.info('Payment recovery attempt', {
    domain: 'payment_recovery',
    event: 'payment_recovery_attempt',
    clientId,
    storefrontItemId,
    paymentMethod,
    adminUserId,
    idempotencyKey: idempotencyToken,
    force: !!force,
    paymentReference: maskReference(sanitizedReference)
  });

  const transaction = await sequelize.transaction();

  try {
    // 1. Validate client
    const client = await User.findByPk(clientId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!client) {
      throw serviceError('Client not found', 'CLIENT_NOT_FOUND');
    }

    if (!['client', 'user'].includes(client.role)) {
      throw serviceError('User is not a client or user', 'INVALID_ROLE');
    }

    // 2. Advisory lock — serialize concurrent requests for same client+package
    await sequelize.query(
      'SELECT pg_advisory_xact_lock($1, $2)',
      { bind: [clientId, storefrontItemId], transaction }
    );

    // 3. Business-scoped duplicate guard (60-second window, admin-agnostic)
    if (force !== true) {
      const sixtySecondsAgo = new Date(Date.now() - 60000);
      const recentDuplicate = await Order.findOne({
        where: {
          userId: clientId,
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
        logger.warn('Duplicate payment blocked by time-window check', {
          domain: 'payment_recovery',
          event: 'payment_recovery_duplicate_blocked',
          clientId,
          storefrontItemId,
          adminUserId,
          existingOrderId: recentDuplicate.id,
          existingOrderNumber: recentDuplicate.orderNumber
        });
        throw serviceError(
          `Duplicate payment detected: Order #${recentDuplicate.orderNumber} was created ${Math.round((Date.now() - new Date(recentDuplicate.completedAt).getTime()) / 1000)}s ago for the same client and package. Use force override if this is intentional.`,
          'DUPLICATE_PAYMENT_WINDOW'
        );
      }
    } else {
      // Force override — log the bypass
      logger.warn('60-second duplicate guard bypassed via force override', {
        domain: 'payment_recovery',
        event: 'payment_recovery_force_override',
        clientId,
        storefrontItemId,
        adminUserId,
        forceReason
      });
    }

    // 4. Fetch the package
    const pkg = await StorefrontItem.findByPk(storefrontItemId, { transaction });
    if (!pkg) {
      throw serviceError('Package not found', 'PACKAGE_NOT_FOUND');
    }

    if (pkg.isActive === false) {
      throw serviceError('Package is inactive and cannot be applied', 'PACKAGE_INACTIVE');
    }

    const sessionsToAdd = pkg.sessions || pkg.totalSessions || 0;
    if (sessionsToAdd <= 0) {
      throw serviceError('Package has no sessions to grant', 'NO_SESSIONS_IN_PACKAGE');
    }

    const totalAmount = parseFloat(pkg.totalCost || pkg.price || 0);

    // 5. Create recovery cart
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
          paymentReference: sanitizedReference,
          createdAt: new Date().toISOString()
        })
      }, { transaction });
      cartId = recoveryCart.id;
    }

    // 6. Generate order number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `REC-${timestamp}-${random}`;

    // Build order notes (include force reason if applicable)
    let orderNotes = sanitizedNotes || `Admin recovery payment via ${paymentMethod}`;
    if (force === true && forceReason) {
      orderNotes += `\n[Force Override] Reason: ${forceReason}`;
    }

    // 7. Create Order (with idempotency key — DB unique index catches races)
    const order = await Order.create({
      userId: clientId,
      cartId,
      orderNumber,
      totalAmount,
      status: 'completed',
      paymentMethod,
      paymentId: sanitizedReference || null,
      billingName: `${client.firstName} ${client.lastName}`,
      billingEmail: client.email,
      notes: orderNotes,
      completedAt: new Date(),
      paymentAppliedAt: new Date(),
      paymentAppliedBy: adminUserId,
      paymentReference: sanitizedReference || null,
      idempotencyKey: idempotencyToken
    }, { transaction });

    // 8. Create OrderItem
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
          adminRecovery: true,
          ...(force === true ? { forceOverride: true, forceReason } : {})
        }
      }, { transaction });
    }

    // 9. Create FinancialTransaction (audit trail)
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
          paymentReference: sanitizedReference,
          packageId: pkg.id,
          packageName: pkg.name,
          sessionsAdded: sessionsToAdd,
          type: 'admin_recovery',
          idempotencyKey: idempotencyToken,
          ...(force === true ? { forceOverride: true, forceReason } : {})
        }),
        processedAt: new Date(),
        netAmount: totalAmount,
        feeAmount: 0
      }, { transaction });
    }

    // 10. Atomically increment sessions
    const previousCredits = client.availableSessions || 0;
    await client.increment('availableSessions', { by: sessionsToAdd, transaction });

    // 11. Upgrade role if needed (user → client on purchase)
    if (client.role === 'user') {
      client.role = 'client';
      await client.save({ transaction });
    }

    await transaction.commit();

    logger.info('Admin recovery payment applied', {
      domain: 'payment_recovery',
      event: 'payment_recovery_success',
      clientId,
      adminUserId,
      packageName: pkg.name,
      sessionsAdded: sessionsToAdd,
      orderId: order.id,
      orderNumber,
      totalAmount,
      idempotencyKey: idempotencyToken,
      paymentReference: maskReference(sanitizedReference)
    });

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

    // Check for idempotency key collision — reconcile from committed state
    if (isIdempotencyViolation(error)) {
      return await reconcileIdempotencyCollision(
        idempotencyToken, clientId, storefrontItemId, adminUserId
      );
    }

    // Re-throw coded errors as-is, log unknown errors
    if (!error.code) {
      logger.error('Failed to apply package payment', {
        domain: 'payment_recovery',
        event: 'payment_recovery_failed',
        clientId,
        storefrontItemId,
        adminUserId,
        idempotencyKey: idempotencyToken,
        error: error.message
      });
    }
    throw error;
  }
}

/**
 * Reconcile an idempotency key collision by fetching the existing order.
 * Retries up to 3 times with exponential backoff in case the winning
 * transaction hasn't committed yet.
 */
async function reconcileIdempotencyCollision(idempotencyToken, clientId, storefrontItemId, adminUserId) {
  const models = sequelize.models;
  const Order = models.Order;
  const OrderItem = models.OrderItem;
  const User = getUser();

  const delays = [150, 300, 450];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    await sleep(delays[attempt]);

    try {
      const existingOrder = await Order.findOne({
        where: {
          idempotencyKey: idempotencyToken,
          userId: clientId
        },
        include: OrderItem ? [{
          model: OrderItem,
          as: 'orderItems',
          where: { storefrontItemId },
          required: true
        }] : []
      });

      if (existingOrder && existingOrder.status === 'completed') {
        const client = await User.findByPk(clientId, {
          attributes: ['availableSessions']
        });

        logger.warn('Idempotency key collision reconciled', {
          domain: 'payment_recovery',
          event: 'payment_recovery_duplicate_blocked',
          clientId,
          storefrontItemId,
          adminUserId,
          existingOrderId: existingOrder.id,
          existingOrderNumber: existingOrder.orderNumber,
          idempotencyKey: idempotencyToken
        });

        throw serviceError(
          'Payment already processed.',
          'DUPLICATE_IDEMPOTENCY_KEY',
          {
            orderId: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            newBalance: client?.availableSessions ?? null
          }
        );
      }
    } catch (err) {
      // If it's our serviceError, re-throw it
      if (err.code === 'DUPLICATE_IDEMPOTENCY_KEY') throw err;
      // Otherwise keep retrying
    }
  }

  // All retries failed — the winning transaction didn't commit or something else went wrong
  logger.error('Idempotency collision reconciliation failed after retries', {
    domain: 'payment_recovery',
    event: 'payment_recovery_failed',
    clientId,
    storefrontItemId,
    adminUserId,
    idempotencyKey: idempotencyToken
  });

  throw serviceError('An unexpected error occurred during payment processing', 'INTERNAL_ERROR');
}

export default {
  processSessionDeductions,
  getClientsNeedingPayment,
  applyPaymentCredits,
  getClientLastPackage,
  applyPackagePayment
};
