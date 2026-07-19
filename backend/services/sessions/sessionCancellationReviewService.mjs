/**
 * Cancellation billing review service.
 *
 * Records admin finance decisions for cancelled sessions and restores at most
 * one paid credit when a deducted cancellation is waived.
 */
import sequelize from '../../database.mjs';
import Session from '../../models/Session.mjs';
import User from '../../models/User.mjs';
import { getOrder, getOrderItem, getSessionType, getStorefrontItem } from '../../models/index.mjs';
import { computeCancellationCharge, getClientPackagePricing } from '../../utils/cancellationPricing.mjs';
import logger from '../../utils/logger.mjs';
import { isNonDeductingClient } from '../sessionBillingPolicy.mjs';
import { getSessionCreditsToRestore } from './sessionCreditReceiptService.mjs';

const ALLOWED_DECISIONS = new Set(['charged', 'waived']);
const ALLOWED_CHARGE_TYPES = new Set(['none', 'late_fee', 'full', 'partial', 'custom']);

function reviewError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw reviewError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseMoneyAmount(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

function requireFinanceReviewer(reviewer) {
  if (reviewer?.role !== 'admin') {
    throw reviewError('Admin privileges required to record cancellation billing decisions', 403);
  }
  return parsePositiveInteger(reviewer.id, 'reviewer id');
}

function cancellationPricingModels() {
  return {
    Order: getOrder(),
    OrderItem: getOrderItem(),
    StorefrontItem: getStorefrontItem()
  };
}

async function getSessionPackagePricing(session) {
  const fallbackPrice = Number(session.duration || 60) >= 60 ? 175 : 110;

  if (!session.userId) {
    return {
      pricePerSession: null,
      packageName: null,
      fallbackPrice,
      defaultChargeAmount: fallbackPrice,
      lateFeeAmount: Math.round(fallbackPrice * 0.5),
      isFallback: true
    };
  }

  const packageInfo = await getClientPackagePricing(session.userId, cancellationPricingModels());
  const pricePerSession = parseMoneyAmount(packageInfo.pricePerSession);
  const defaultChargeAmount = pricePerSession ?? fallbackPrice;

  return {
    ...packageInfo,
    pricePerSession,
    packageName: packageInfo.packageName || null,
    fallbackPrice,
    defaultChargeAmount,
    lateFeeAmount: Math.round(defaultChargeAmount * 0.5),
    isFallback: Boolean(packageInfo.isFallback)
  };
}

function normalizeReviewInput({ sessionId, reviewer, decision, reason, chargeType = 'late_fee', chargeAmount }) {
  const normalizedSessionId = parsePositiveInteger(sessionId, 'session id');
  const reviewerId = requireFinanceReviewer(reviewer);
  const normalizedReason = typeof reason === 'string' ? reason.trim() : '';

  if (!ALLOWED_DECISIONS.has(decision)) {
    throw reviewError("Decision is required and must be 'charged' or 'waived'");
  }

  if (!ALLOWED_CHARGE_TYPES.has(chargeType)) {
    throw reviewError('chargeType must be one of: none, late_fee, full, partial, custom');
  }

  if (decision === 'waived' && normalizedReason.length === 0) {
    throw reviewError('Reason is required when waiving a cancellation charge');
  }

  return {
    sessionId: normalizedSessionId,
    reviewerId,
    decision,
    reason: normalizedReason,
    chargeType,
    chargeAmount
  };
}

function computeReviewCharge({ session, packageInfo, decision, chargeType, chargeAmount }) {
  if (decision === 'waived') {
    return { actualChargeAmount: 0, actualChargeType: 'none' };
  }

  const customAmount = chargeType === 'custom' || chargeType === 'partial'
    ? parseMoneyAmount(chargeAmount)
    : null;

  if ((chargeType === 'custom' || chargeType === 'partial') && customAmount === null) {
    throw reviewError('A non-negative chargeAmount is required for custom or partial cancellation decisions');
  }

  const chargeCalc = computeCancellationCharge(session, packageInfo, {
    chargeType,
    customAmount
  });

  if (chargeCalc.chargeAmount <= 0) {
    throw reviewError('A charged cancellation decision requires an amount greater than zero');
  }

  return {
    actualChargeAmount: chargeCalc.chargeAmount,
    actualChargeType: chargeCalc.chargeType
  };
}

async function restoreWaivedCreditIfNeeded(session, transaction) {
  if (!session.sessionDeducted || session.sessionCreditRestored || !session.userId) {
    return false;
  }

  const client = await User.findByPk(session.userId, {
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!client) return false;

  if (isNonDeductingClient(client)) {
    logger.info('Skipped cancellation waiver credit restore for non-deducting client account', {
      sessionId: session.id,
      userId: client.id,
      clientSource: client.clientSource,
      sessionBillingMode: client.sessionBillingMode
    });
    return false;
  }

  const creditsToRestore = await getSessionCreditsToRestore(session, {
    SessionType: getSessionType(),
    transaction
  });
  if (creditsToRestore > 0) {
    await client.increment('availableSessions', { by: creditsToRestore, transaction });
    client.availableSessions = Number(client.availableSessions || 0) + creditsToRestore;
  }
  session.sessionCreditRestored = true;
  return creditsToRestore > 0;
}

function buildReviewResponse({ session, decision, actualChargeAmount, packageInfo, creditRestored }) {
  return {
    success: true,
    message: decision === 'waived'
      ? 'Cancellation waived and recorded for billing review'
      : `Cancellation charge of $${actualChargeAmount} recorded for billing review`,
    data: {
      sessionId: session.id,
      decision: session.cancellationDecision,
      chargeType: session.cancellationChargeType,
      chargeAmount: Number.parseFloat(session.cancellationChargeAmount) || 0,
      chargedAt: session.cancellationChargedAt,
      reviewedBy: session.cancellationReviewedBy,
      reviewedAt: session.cancellationReviewedAt,
      reason: session.cancellationReviewReason,
      creditRestored,
      sessionCreditRestored: Boolean(session.sessionCreditRestored),
      packageInfo: {
        pricePerSession: packageInfo.pricePerSession,
        packageName: packageInfo.packageName,
        isFallback: packageInfo.isFallback
      }
    }
  };
}

export async function recordCancellationBillingDecision(input) {
  const normalized = normalizeReviewInput(input);
  const transaction = await sequelize.transaction();

  try {
    const session = await Session.findByPk(normalized.sessionId, {
      include: [{
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions', 'clientSource', 'sessionBillingMode']
      }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!session) {
      throw reviewError('Session not found', 404);
    }

    if (session.status !== 'cancelled') {
      throw reviewError('Only cancelled sessions can be reviewed for cancellation billing');
    }

    const packageInfo = await getSessionPackagePricing(session);
    const { actualChargeAmount, actualChargeType } = computeReviewCharge({
      session,
      packageInfo,
      decision: normalized.decision,
      chargeType: normalized.chargeType,
      chargeAmount: normalized.chargeAmount
    });

    const now = new Date();
    session.cancellationChargeType = actualChargeType;
    session.cancellationChargeAmount = actualChargeAmount;
    session.cancellationChargedAt = actualChargeAmount > 0 ? now : null;
    session.cancellationDecision = normalized.decision;
    session.cancellationReviewedBy = normalized.reviewerId;
    session.cancellationReviewedAt = now;
    session.cancellationReviewReason = normalized.reason || null;

    const creditRestored = normalized.decision === 'waived'
      ? await restoreWaivedCreditIfNeeded(session, transaction)
      : false;

    await session.save({ transaction });
    await transaction.commit();

    logger.info('Cancellation billing decision recorded', {
      sessionId: normalized.sessionId,
      decision: normalized.decision,
      chargeType: actualChargeType,
      chargeAmount: actualChargeAmount,
      reviewedBy: normalized.reviewerId,
      creditRestored
    });

    return buildReviewResponse({
      session,
      decision: normalized.decision,
      actualChargeAmount,
      packageInfo,
      creditRestored
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logger.warn('Cancellation billing review rollback failed', {
        sessionId: normalized.sessionId,
        error: rollbackError.message
      });
    }
    throw error;
  }
}

export default {
  recordCancellationBillingDecision
};
