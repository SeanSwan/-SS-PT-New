/**
 * sessionPackageCheckoutFulfillmentService.mjs
 * ============================================
 * Shared fulfillment for direct session-package Stripe Checkout sessions.
 *
 * The session-package route has two legitimate completion callers:
 * - Stripe webhook: server-to-server fulfillment when Stripe confirms payment.
 * - verify-session: browser return-path recovery when the success page loads.
 *
 * Both callers must use the same idempotency key, row lock, and user update
 * logic so refreshes, webhook races, and delayed webhooks cannot double-grant
 * sessions or leave a paid user outside client-ready state.
 */
import sequelize from '../database.mjs';
import Order from '../models/Order.mjs';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';
import { claimIdempotentRecord } from '../utils/paymentIdempotency.mjs';
import { isNonDeductingClient } from './sessionBillingPolicy.mjs';

export const SESSION_PACKAGE_CHECKOUT_SOURCE = 'session_package_checkout';

export class SessionPackageFulfillmentError extends Error {
  constructor(message, { statusCode = 400, code = 'SESSION_PACKAGE_FULFILLMENT_FAILED' } = {}) {
    super(message);
    this.name = 'SessionPackageFulfillmentError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isSessionPackageCheckoutSession(session) {
  const metadata = session?.metadata || {};
  if (!metadata.packageId || !metadata.sessions) return false;
  if (metadata.source === SESSION_PACKAGE_CHECKOUT_SOURCE) return true;

  const cartCheckoutMarkers = [
    metadata.source,
    metadata.cartId,
    metadata.userId,
    metadata.totalSessions,
    metadata.totalAmount,
    metadata.itemCount,
  ];
  if (cartCheckoutMarkers.some((marker) => marker !== undefined && marker !== null && marker !== '')) {
    return false;
  }

  return /^[1-9]\d*$/.test(String(session?.client_reference_id || '').trim());
}

export function getSessionPackageFulfillmentKey(sessionId) {
  return `session-package-webhook:${sessionId}`;
}

function parsePositiveInteger(value, label, code) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new SessionPackageFulfillmentError(`Invalid ${label}`, {
      statusCode: 400,
      code,
    });
  }
  return parsed;
}

function normalizeCheckoutSessionId(session) {
  const sessionId = typeof session?.id === 'string' ? session.id.trim() : '';
  if (!sessionId) {
    throw new SessionPackageFulfillmentError('Missing checkout session id', {
      statusCode: 400,
      code: 'SESSION_PACKAGE_SESSION_ID_REQUIRED',
    });
  }
  return sessionId;
}

export async function fulfillSessionPackageCheckoutSession(session) {
  const sessionId = normalizeCheckoutSessionId(session);
  const userId = parsePositiveInteger(
    session?.client_reference_id,
    'session package user reference',
    'INVALID_SESSION_PACKAGE_USER',
  );
  const sessionsToAdd = parsePositiveInteger(
    session?.metadata?.sessions,
    'session package session count',
    'INVALID_SESSION_PACKAGE_COUNT',
  );
  const packageId = session?.metadata?.packageId;
  const fulfillmentKey = getSessionPackageFulfillmentKey(sessionId);
  const paymentIntentId = session.payment_intent || sessionId;

  const result = {
    alreadyProcessed: false,
    sessionsAdded: sessionsToAdd,
    userId,
    orderId: null,
  };

  await sequelize.transaction(async (transaction) => {
    const existingOrder = await Order.findOne({
      where: { idempotencyKey: fulfillmentKey },
      transaction,
    });

    if (existingOrder) {
      result.alreadyProcessed = true;
      result.sessionsAdded = 0;
      result.orderId = existingOrder.id ?? null;
      logger.info(`Session package checkout already fulfilled for ${sessionId}`);
      return;
    }

    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!user) {
      throw new SessionPackageFulfillmentError(`User not found for session package purchase: ${userId}`, {
        statusCode: 404,
        code: 'SESSION_PACKAGE_USER_NOT_FOUND',
      });
    }

    const fulfilledAt = new Date();
    const { record: order, created } = await claimIdempotentRecord({
      model: Order,
      lookupWhere: { idempotencyKey: fulfillmentKey },
      transaction,
      createValues: {
        userId,
        cartId: null,
        orderNumber: `SS-SP-${sessionId}`,
        totalAmount: Number(session.amount_total || 0) / 100,
        status: 'completed',
        paymentMethod: 'stripe',
        paymentId: paymentIntentId,
        paymentReference: sessionId,
        idempotencyKey: fulfillmentKey,
        completedAt: fulfilledAt,
        paymentAppliedAt: fulfilledAt,
        notes: JSON.stringify({
          type: 'session_package_purchase',
          packageId,
          sessionsToAdd,
          stripeCheckoutSessionId: sessionId,
          stripePaymentIntentId: paymentIntentId,
        }),
      },
    });

    if (!created) {
      result.alreadyProcessed = true;
      result.sessionsAdded = 0;
      result.orderId = order?.id ?? null;
      logger.info(`Session package checkout already fulfilled for ${sessionId}`);
      return;
    }

    await user.increment('availableSessions', {
      by: sessionsToAdd,
      transaction,
    });

    const userPackageUpdate = {
      hasPurchasedBefore: true,
      lastPurchaseDate: fulfilledAt,
    };
    if (user.role === 'user') {
      userPackageUpdate.role = 'client';
    }
    if (isNonDeductingClient(user)) {
      userPackageUpdate.clientSource = 'swanstudios';
      userPackageUpdate.sessionBillingMode = 'paid_sessions';
    }
    await user.update(userPackageUpdate, { transaction });

    result.orderId = order?.id ?? null;
    logger.info(`Added ${sessionsToAdd} session package sessions to user ${userId}`);
  });

  return result;
}
