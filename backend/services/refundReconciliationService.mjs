/**
 * Refund Reconciliation Service (E-04, hostile review fixing pass)
 * =================================================================
 * Before this service existed, ZERO Stripe refund events were handled:
 * a refund issued from the Stripe dashboard (or by the app itself, e.g.
 * adminChargeCardRoutes' capture-first refund-on-failure) left session
 * balances, cart payment status, order status and refund analytics
 * untouched — customers kept sessions they had been refunded for, and the
 * revenue dashboard kept counting refunded money.
 *
 * POLICY (deliberately conservative — chosen because the ledger's open
 * business question "what happens to already-consumed sessions on a
 * refund?" has no owner answer yet; change these defaults only with an
 * explicit product decision):
 *
 *   FULL refund  -> revoke ONLY the unconsumed remainder of the sessions
 *                   this cart granted (floor 0; consumed sessions are NEVER
 *                   clawed back), mark cart paymentStatus 'refunded', flip
 *                   the linked Order (when one exists) to 'refunded', and
 *                   write a FinancialTransaction audit row.
 *   PARTIAL refund
 *                -> NO automatic session changes. Write a
 *                   'partially_refunded' audit row with
 *                   needsAdminReview: true and log loudly. A human decides
 *                   what a partial refund means for a session package.
 *   No cart found (e.g. admin charge-card flow, which refunds only when
 *   its grant FAILED — i.e. nothing was ever granted)
 *                -> audit row only, never a decrement.
 *
 * Idempotent: Stripe retries webhook delivery; the cart.paymentStatus
 * 'refunded' flag (full) and the existing audit row (partial) make
 * replays no-ops. All money/state changes happen in ONE transaction with
 * row locks — the same posture SessionGrantService was commended for.
 */

import sequelize from '../database.mjs';
import { getShoppingCart, getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

function parseStripeSessionData(cart) {
  try {
    if (!cart?.stripeSessionData) return {};
    const parsed = JSON.parse(cart.stripeSessionData);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function toDollars(cents) {
  const n = Number(cents);
  return Number.isFinite(n) ? Math.round(n) / 100 : 0;
}

async function writeAuditRow({
  FinancialTransaction, userId, cartId, charge, status, sessionsRevoked,
  sessionsGranted, needsAdminReview, note, transaction,
}) {
  if (!FinancialTransaction) return null;
  return FinancialTransaction.create({
    userId,
    cartId: cartId ?? null,
    stripePaymentIntentId: typeof charge.payment_intent === 'string' ? charge.payment_intent : null,
    stripeChargeId: charge.id ?? null,
    amount: toDollars(charge.amount),
    currency: (charge.currency || 'usd').toUpperCase(),
    status,
    refundAmount: toDollars(charge.amount_refunded),
    description: note,
    metadata: JSON.stringify({
      source: 'refundReconciliationService',
      needsAdminReview,
      sessionsGranted,
      sessionsRevoked,
      chargeAmountCents: charge.amount,
      amountRefundedCents: charge.amount_refunded,
    }),
    processedAt: new Date(),
  }, transaction ? { transaction } : undefined);
}

/**
 * Reconcile a Stripe charge.refunded event.
 *
 * @param {object} charge - Stripe charge object (event.data.object)
 * @returns {Promise<{processed: boolean, alreadyProcessed?: boolean, needsReview?: boolean,
 *                    sessionsRevoked?: number, cartId?: number, reason?: string}>}
 */
export async function reconcileRefundedCharge(charge) {
  const paymentIntentId = typeof charge?.payment_intent === 'string' ? charge.payment_intent : null;
  if (!paymentIntentId) {
    logger.warn('[Refund] charge.refunded without payment_intent — nothing to reconcile', {
      chargeId: charge?.id,
    });
    return { processed: false, reason: 'no_payment_intent' };
  }

  const ShoppingCart = getShoppingCart();
  const User = getUser();
  const FinancialTransaction = sequelize.models.FinancialTransaction ?? null;
  const Order = sequelize.models.Order ?? null;

  const amountRefunded = Number(charge.amount_refunded ?? 0);
  const isFullRefund = amountRefunded >= Number(charge.amount ?? 0) && Number(charge.amount) > 0;

  const cart = await ShoppingCart.findOne({ where: { paymentIntentId } });

  if (!cart) {
    // Not a storefront cart payment (e.g. admin charge-card flow refunds
    // only after its grant FAILED — nothing was granted, so nothing to
    // revoke). Audit only.
    await writeAuditRow({
      FinancialTransaction,
      userId: null,
      cartId: null,
      charge,
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      sessionsRevoked: 0,
      sessionsGranted: 0,
      needsAdminReview: false,
      note: 'Refund for payment with no storefront cart — recorded for audit, no session changes',
    });
    logger.info('[Refund] No storefront cart for refunded charge — audit row only', {
      paymentIntentId, chargeId: charge.id,
    });
    return { processed: true, sessionsRevoked: 0, reason: 'no_cart' };
  }

  const transaction = await sequelize.transaction();
  try {
    const lockedCart = await ShoppingCart.findByPk(cart.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    // Idempotency: a replayed full-refund webhook is a no-op.
    if (lockedCart.paymentStatus === 'refunded') {
      await transaction.commit();
      logger.info('[Refund] Cart already marked refunded — replay ignored', { cartId: cart.id });
      return { processed: true, alreadyProcessed: true, sessionsRevoked: 0, cartId: cart.id };
    }

    const grantData = parseStripeSessionData(lockedCart);
    const sessionsGranted = Number.isInteger(grantData.sessionsAdded) ? grantData.sessionsAdded : 0;

    if (!isFullRefund) {
      // PARTIAL refund: no automatic session movement (policy above), but
      // flag it durably for an admin. Replays are deduped on the audit row.
      const existing = FinancialTransaction
        ? await FinancialTransaction.findOne({
            where: { stripeChargeId: charge.id, status: 'partially_refunded' },
            transaction,
          })
        : null;
      if (!existing) {
        await writeAuditRow({
          FinancialTransaction, userId: lockedCart.userId, cartId: lockedCart.id, charge,
          status: 'partially_refunded',
          sessionsRevoked: 0, sessionsGranted,
          needsAdminReview: true,
          note: 'PARTIAL refund — sessions untouched, admin review required',
          transaction,
        });
      }
      await transaction.commit();
      logger.warn('[Refund] PARTIAL refund on session cart — flagged for admin review, no sessions revoked', {
        cartId: lockedCart.id, userId: lockedCart.userId, sessionsGranted,
        amountRefundedCents: amountRefunded, chargeAmountCents: charge.amount,
      });
      return { processed: true, needsReview: true, sessionsRevoked: 0, cartId: lockedCart.id };
    }

    // FULL refund: revoke only the UNCONSUMED remainder (never below zero,
    // never claw back sessions the client already used).
    let sessionsRevoked = 0;
    if (sessionsGranted > 0) {
      const user = await User.findByPk(lockedCart.userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (user) {
        const current = Math.max(0, Number(user.availableSessions ?? 0));
        sessionsRevoked = Math.min(sessionsGranted, current);
        if (sessionsRevoked > 0) {
          await user.decrement('availableSessions', { by: sessionsRevoked, transaction });
        }
      }
    }

    await lockedCart.update({ paymentStatus: 'refunded' }, { transaction });

    const orderId = Number.isInteger(grantData.orderId) ? grantData.orderId : null;
    if (orderId && Order) {
      await Order.update({ status: 'refunded' }, { where: { id: orderId }, transaction });
    }

    await writeAuditRow({
      FinancialTransaction, userId: lockedCart.userId, cartId: lockedCart.id, charge,
      status: 'refunded',
      sessionsRevoked, sessionsGranted,
      needsAdminReview: sessionsGranted > sessionsRevoked, // some sessions were consumed before refund
      note: `Full refund — revoked ${sessionsRevoked} unconsumed session(s) of ${sessionsGranted} granted`,
      transaction,
    });

    await transaction.commit();

    logger.info('[Refund] FULL refund reconciled', {
      cartId: lockedCart.id, userId: lockedCart.userId,
      sessionsGranted, sessionsRevoked, orderId,
    });

    return { processed: true, sessionsRevoked, cartId: lockedCart.id };
  } catch (error) {
    try { await transaction.rollback(); } catch { /* rollback best-effort */ }
    logger.error('[Refund] Reconciliation failed — Stripe will retry', {
      paymentIntentId, chargeId: charge.id, error: error.message,
    });
    throw error; // 500 -> Stripe retries (same posture as the grant path)
  }
}

export default { reconcileRefundedCharge };
