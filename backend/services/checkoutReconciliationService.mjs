/**
 * checkoutReconciliationService.mjs
 * =================================
 * Reclaims carts stranded by a crash during Stripe Checkout creation.
 *
 * WHY THIS EXISTS (Kimi K3 CRITICAL-1, three-way money-path review 2026-08-16)
 *
 * `v2PaymentRoutes` claims the cart and deliberately nulls the session id, creates the
 * Stripe session, then finalizes by writing the session id back:
 *
 *     update({ status:'pending_payment', checkoutSessionId: null, lastCheckoutAttempt })
 *     session = await stripe.checkout.sessions.create({...})    // live + payable
 *     update({ checkoutSessionId: session.id, ... })            // finalize
 *
 * A process death between create and finalize — deploy, OOM, container recycle; all
 * routine operational events, not attacker action — leaves the cart in
 * `pending_payment` with `checkoutSessionId: null` and a LIVE PAYABLE session out in
 * the world.
 *
 * The cart is then unrecoverable by the customer: every `POST /cart/add` 409s with
 * CART_CHECKOUT_IN_PROGRESS, and `/cancel-checkout` requires the session id the cart
 * does not have. This sweeper releases it.
 *
 * The companion half lives in SessionGrantService: a cart with NO recorded session id
 * is *unclaimed*, so if that orphan session IS eventually paid, the grant adopts it
 * instead of throwing. Grant is gated only on `sessionsGranted`, never on status, so a
 * released cart still fulfils correctly.
 *
 * SAFETY UNDER MULTIPLE INSTANCES: Render may run more than one web instance, so this
 * can fire concurrently. That is safe because the release is a single conditional
 * UPDATE — a second sweeper simply matches zero rows. Correctness lives in the WHERE
 * clause, not in there being exactly one sweeper. (Same argument as
 * renderLeaseSweeperCron.)
 *
 * DELIBERATELY NARROW: it only touches carts with a NULL session id. A cart holding a
 * real session id has a real Stripe session that can still be paid or will emit
 * `checkout.session.expired`, and that path already releases it. Widening this to
 * session-bearing carts would need a Stripe round-trip and could cancel a checkout a
 * customer is mid-way through paying.
 */

import logger from '../utils/logger.mjs';

/**
 * How long a cart may sit mid-claim before we call it stranded.
 *
 * Stripe session creation is a sub-second API call, so anything still unfinalized
 * after this window did not survive its request. Long enough that a slow call or a
 * brief network stall is never swept; short enough that a customer hitting "add to
 * cart" again is not blocked for an appreciable time.
 */
export const STALE_CHECKOUT_MS = 15 * 60 * 1000;

/**
 * Release carts stranded mid-checkout.
 *
 * Never throws. A sweeper that crashes stops sweeping, and the failure mode it exists
 * to fix then returns silently — so failures are logged and reported, not propagated.
 *
 * @param {object} deps
 * @param {object} deps.ShoppingCart  Sequelize model (injected for testability)
 * @param {object} [deps.Op]          Sequelize operators
 * @param {Date}   [deps.now]         Injectable clock
 * @returns {Promise<{released: number, failed: boolean}>}
 */
export async function reconcileStalePendingCarts({ ShoppingCart, Op, now = new Date() } = {}) {
  try {
    const operators = Op ?? (await import('sequelize')).Op;
    const cutoff = new Date(now.getTime() - STALE_CHECKOUT_MS);

    const [released] = await ShoppingCart.update(
      {
        status: 'active',
        paymentStatus: 'cancelled',
        checkoutSessionId: null,
        paymentIntentId: null,
      },
      {
        where: {
          status: 'pending_payment',
          // The crash-window signature: claimed, but never finalized.
          checkoutSessionId: null,
          // `lt` alone never matches SQL NULL, so any pre-column straggler with a
          // NULL lastCheckoutAttempt would be permanently unsweepable — stuck in
          // pending_payment forever, which is the exact state this exists to clear
          // (GLM-5.3 LOW-1, round 2). A row with no recorded attempt and a null
          // session id cannot be an in-flight checkout, so it is always releasable.
          [operators.or]: [
            { lastCheckoutAttempt: { [operators.lt]: cutoff } },
            { lastCheckoutAttempt: null },
          ],
        },
      }
    );

    const count = Number(released) || 0;
    // Only speak when something happened — a sweeper that logs every tick trains
    // everyone to filter it out, which is how the interesting line gets missed.
    if (count > 0) {
      logger.warn(`[CheckoutReconciliation] released ${count} cart(s) stranded mid-checkout`, {
        cutoff: cutoff.toISOString(),
      });
    }

    return { released: count, failed: false };
  } catch (error) {
    logger.error('[CheckoutReconciliation] sweep failed', {
      errorName: error?.name,
      errorMessage: error?.message,
    });
    return { released: 0, failed: true };
  }
}

export default { reconcileStalePendingCarts, STALE_CHECKOUT_MS };
