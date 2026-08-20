// backend/webhooks/stripeWebhook.mjs
import express from 'express';
import Stripe from 'stripe';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import User from '../models/User.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import GalleryVisitor from '../models/GalleryVisitor.mjs';
import GalleryDonation from '../models/GalleryDonation.mjs';
import PrintOrder from '../models/PrintOrder.mjs';
import Lead from '../models/Lead.mjs';
import LeadActivity from '../models/LeadActivity.mjs';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
import { upgradeToClient } from '../services/roleService.mjs';
import { sendNotification } from '../services/notificationService.mjs';
import { createCommissionForPurchase } from '../services/CommissionService.mjs';
import GamificationPointsService from '../services/gamification/GamificationPointsService.mjs';
import { getStorefrontSessionCredits, grantSessionsForCart } from '../services/SessionGrantService.mjs';
import { isPhysicalCartItem } from '../services/cartCheckoutFulfillmentService.mjs';
import unifiedSessionService from '../services/sessions/session.service.mjs';
import { claimIdempotentRecord } from '../utils/paymentIdempotency.mjs';
import { fulfillGalleryVipSession } from '../services/galleryVipFulfillmentService.mjs';
import sequelize from '../database.mjs';

/**
 * Resolve the Order behind an ACH PaymentIntent.
 *
 * Two-step by necessity. `metadata.orderId` can be STALE: the ACH route creates
 * the Order and the PaymentIntent in one DB transaction, so if anything after
 * paymentIntents.create fails, the DB rolls back while the PaymentIntent
 * PERSISTS carrying a dangling orderId. A retry with the same idempotency key
 * makes a NEW Order while Stripe replays the ORIGINAL intent.
 *
 * So: match on the payment instrument first (strong), then fall back to the
 * metadata id alone (weak). The fallback must NOT re-include `paymentId` — a
 * strict superset of the first query can never match when the first missed,
 * which is how the original "fallback" shipped inert.
 *
 * `matchedBy` is returned because the two matches do not deserve equal
 * authority: a caller that moves money must verify a weak match before acting
 * on it (Kimi K3 M2, 2026-08-19).
 *
 * @returns {Promise<{order: object|null, matchedBy: 'paymentId'|'metadata'|null}>}
 */
const findAchOrder = async (pi) => {
  const { default: Order } = await import('../models/Order.mjs');

  const byPaymentId = await Order.findOne({ where: { paymentId: pi.id } });
  if (byPaymentId) return { order: byPaymentId, matchedBy: 'paymentId' };

  const metadataOrderId = Number.parseInt(pi?.metadata?.orderId, 10);
  if (!Number.isSafeInteger(metadataOrderId) || metadataOrderId <= 0) {
    return { order: null, matchedBy: null };
  }

  const byMetadata = await Order.findOne({ where: { id: metadataOrderId } });
  if (!byMetadata) return { order: null, matchedBy: null };

  logger.warn('[ACH Webhook] Order matched by metadata only — paymentId diverges', {
    orderId: byMetadata.id,
    orderPaymentId: byMetadata.paymentId,
    paymentIntentId: pi.id,
  });
  return { order: byMetadata, matchedBy: 'metadata' };
};

/**
 * Cents actually received on an intent. `amount_received` is the truth for a
 * captured payment; `amount` is the intended figure. Returns null when neither
 * is usable, so callers can fail CLOSED on an unverifiable amount instead of
 * treating unknown as zero or as agreement.
 */
const receivedCents = (pi) => {
  for (const candidate of [pi?.amount_received, pi?.amount]) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
};

/**
 * Send an ADMIN_NOTIFICATION without letting a notification failure take down
 * the webhook. A 500 here would make Stripe redeliver a money event we already
 * processed.
 */
const notifyAdminSafely = async (payload, tag) => {
  try {
    await sendNotification({ type: 'ADMIN_NOTIFICATION', ...payload });
  } catch (notifyError) {
    logger.error(tag + ' admin alert failed', { errorMessage: notifyError?.message });
  }
};

const router = express.Router();

// --- Conditionally initialize Stripe ---
let stripeClient = null;
if (isStripeEnabled()) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' // Use a fixed, recent API version
    });
    logger.info('Stripe client initialized successfully in stripeWebhook.');
  } catch (error) {
    logger.error(`Failed to initialize Stripe in stripeWebhook: ${error.message}`);
    // stripeClient remains null
  }
} else {
  logger.warn('Stripe client NOT initialized in stripeWebhook due to missing/invalid API key.');
}
// --- End Conditional Initialization ---

/**
 * Stripe webhook handler
 * Mounted at:
 *   POST /webhook   (legacy: /webhooks/stripe/webhook)
 *   POST /          (alias:  /api/webhook/stripe — matches Stripe dashboard config)
 */
// EXPORTED so the legacy /api/cart/webhook mount can delegate to it rather than
// reimplement the switch. Two implementations of one webhook contract is the
// divergence class that already produced the expired-cart bug and left the legacy
// mount silently 200-acking refunds, disputes and every ACH event (Kimi K3 HIGH-2).
export const stripeWebhookHandler = async (req, res) => {
  // Verify webhook signature
  let event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      // Deliberately does NOT log the body. This branch fires BEFORE signature
      // verification, so the payload is unauthenticated attacker-controlled input
      // on a publicly reachable route — echoing it into the log store lets anyone
      // write arbitrary content (including forged/looted-looking payment data)
      // into operator logs. Byte length is enough to diagnose a misconfiguration.
      logger.error('CRITICAL: Stripe webhook secret not configured. Rejecting request.', {
        ip: req.ip,
        bodyBytes: Buffer.isBuffer(req.body) ? req.body.length : undefined
      });
      return res.status(500).json({ error: 'Webhook configuration error' });
    }

    if (!stripeClient) {
      logger.error('CRITICAL: Stripe client not initialized. Cannot verify webhook signature.');
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const signature = req.headers['stripe-signature'];
    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // A valid Stripe signature authenticates the event, but fulfillment
        // still requires confirmed payment. Never grant sessions, inventory,
        // donations, or VIP access for an unpaid Checkout Session.
        if (session.payment_status !== 'paid') {
          logger.warn('[Webhook] Skipping unpaid checkout completion', {
            paymentStatus: session.payment_status || 'unknown',
          });
          break;
        }

        // ── Gallery Credit / VIP Fulfillment ──────────────────────────
        if (session.metadata?.type === 'gallery_credits') {
          await fulfillGalleryCredits(session);
          break;
        }
        if (session.metadata?.type === 'gallery_donation') {
          await fulfillGalleryDonation(session);
          break;
        }
        if (session.metadata?.type === 'print_order') {
          await fulfillPrintOrder(session);
          break;
        }

        // ── Cart / Store Fulfillment ──────────────────────────────────
        if (session.metadata?.type === 'vip_pt_session') {
          await fulfillGalleryVipSession({
            sessionId: session.id,
            visitorId: session.metadata.galleryVisitorId,
            userId: session.metadata.userId,
            eventId: session.metadata.eventId,
            // Was hardcoded 175, so a price change or a discounted/promo VIP
            // session recorded a false amount forever (Kimi K3 L4,
            // 2026-08-19). What Stripe actually collected is the truth; the
            // constant remains only as a last-resort floor for an event shape
            // that carries no total.
            amount: Number.isFinite(Number(session.amount_total))
              && Number(session.amount_total) > 0
              ? Number(session.amount_total) / 100
              : 175,
          });
          break;
        }

        const cartId = session.metadata?.cartId;

        if (!cartId) {
          // ── Session Package Fulfillment ─────────────────────────────
          //
          // This rail was fulfilled ONLY by verify-session, i.e. only if the
          // browser reached the success page. A buyer who closes the tab, loses
          // the redirect, sits behind an extension that blocks it, or crashes
          // has PAID and is never granted — and nothing server-side reconciled
          // it, because this handler used to 200-ack the event as "no cartId —
          // ignoring". The "legacy mount silently acked" class, surviving
          // inside the unified handler (GLM-5.3 M4 / Kimi K3 M4, 2026-08-19).
          //
          // Safe to run alongside verify-session: the service is idempotent on
          // `Order.idempotencyKey = getSessionPackageFulfillmentKey(sessionId)`,
          // so whichever path arrives second returns alreadyProcessed. That is
          // why the webhook needs no coordination with the redirect.
          //
          // Imported LAZILY on purpose. A static import pulls the whole
          // Sequelize model graph (CustomPackage and friends) into this hot
          // module — the same static-import blast radius that broke four
          // unrelated suites earlier in this workstream when the cart route
          // imported this handler directly. It also keeps the cost off the
          // cart path entirely, since only a cartId-less session reaches here.
          const { isSessionPackageCheckoutSession, fulfillSessionPackageCheckoutSession } =
            await import('../services/sessionPackageCheckoutFulfillmentService.mjs');

          if (isSessionPackageCheckoutSession(session)) {
            try {
              const packageResult = await fulfillSessionPackageCheckoutSession(session);
              logger.info('[Webhook] Session package fulfilled', {
                checkoutSessionId: session.id,
                userId: packageResult.userId,
                sessionsAdded: packageResult.sessionsAdded,
                alreadyProcessed: packageResult.alreadyProcessed,
              });
            } catch (packageError) {
              // Money is captured. Silence here is the defect this branch
              // exists to close, so alert and rethrow. Rethrowing yields a 500,
              // and a 500 is CORRECT for a transient fulfilment failure:
              // Stripe redelivers and the service is idempotent.
              logger.error('[Webhook] Session package fulfilment FAILED on a paid session', {
                checkoutSessionId: session.id,
                errorCode: packageError?.code || packageError?.name || 'UNKNOWN',
                errorMessage: packageError?.message,
              });
              await notifyAdminSafely({
                title: 'Session package paid but NOT fulfilled',
                message: 'Checkout session ' + session.id + ' was paid but session-package '
                  + 'fulfilment failed. Stripe will retry; if it keeps failing, grant manually.',
                data: {
                  type: 'session_package_fulfilment_failed',
                  checkoutSessionId: session.id,
                  errorCode: packageError?.code || null,
                  actionRequired: 'MONITOR_OR_MANUAL_GRANT',
                },
              }, '[Webhook]');
              throw packageError;
            }
            break;
          }

          logger.warn('[Webhook] checkout.session.completed with no cartId or gallery_credits — ignoring');
          break;
        }

        // THE THREE DEAD ENDS BELOW ARE PAID.
        //
        // Each of these used to `break` with a log line and nothing else, so
        // captured money was 200-acked into silence. The alert-the-orphan
        // convention had been applied to the ACH rail, print, session packages
        // and the `unfulfillable` path — but not to the cart rail's own dead
        // ends (GLM-5.3 L1, 2026-08-20). Reachability needs row deletion or
        // metadata corruption, which is why this is LOW and not HIGH; the cost
        // of covering it is one alert each.
        //
        // All three are TERMINAL: a redelivery cannot conjure a missing cart or
        // a missing owner, so `break` (200) is right and a rethrow would only
        // start a retry storm. Alerting is what was missing, not retrying.
        const alertPaidDeadEnd = async (title, detail, extra = {}) => {
          logger.error('[Webhook] ' + title, {
            checkoutSessionId: session.id,
            cartId,
            ...extra,
          });
          await notifyAdminSafely({
            title: 'Payment captured but NOT fulfilled — ' + title,
            message: detail + ' The customer has been charged and has received nothing. '
              + 'This will not retry — fulfil manually or refund.',
            data: {
              type: 'payment_unfulfilled_dead_end',
              checkoutSessionId: session.id,
              cartId: cartId ?? null,
              amountTotalCents: session.amount_total ?? null,
              actionRequired: 'MANUAL_FULFIL_OR_REFUND',
              ...extra,
            },
          }, '[Webhook]');
        };

        const cartIdNumber = Number.parseInt(cartId, 10);
        if (!Number.isInteger(cartIdNumber) || cartIdNumber <= 0) {
          await alertPaidDeadEnd(
            'checkout metadata carried an unusable cart id',
            'A paid checkout session named a cart id that is not a positive integer.',
          );
          break;
        }

        // Get the cart owner, then delegate granting to the shared row-lock service.
        const cart = await ShoppingCart.findByPk(cartIdNumber);

        if (!cart) {
          await alertPaidDeadEnd(
            'the paid cart no longer exists',
            'A paid checkout session named a cart that could not be found.',
            { cartId: cartIdNumber },
          );
          break;
        }

        if (!cart.userId) {
          await alertPaidDeadEnd(
            'the paid cart has no owner',
            'A paid cart carries no userId, so nothing can be granted to anyone.',
            { cartId: cartIdNumber },
          );
          break;
        }

        let grantResult;
        try {
          grantResult = await grantSessionsForCart(cartIdNumber, cart.userId, 'webhook', {
            checkoutSessionId: session.id,
            // Amount Stripe actually captured — the adoption branch refuses to grant
            // when it disagrees with the cart's current total (see SessionGrantService).
            amountTotalCents: session.amount_total ?? null,
          });
        } catch (grantError) {
          logger.error('[Webhook] Session grant failed', {
            cartId: cartIdNumber,
            userId: cart.userId,
            error: grantError.message,
            stack: grantError.stack,
          });

          // TERMINAL vs TRANSIENT. Rethrowing yields a 500, and a 500 is only
          // correct when a redelivery could succeed.
          //
          // CheckoutInventoryError is thrown under a row lock when stock ran out
          // between checkout creation and payment. No redelivery restocks the
          // shelf, so this was a signed, PAID event retried forever against a
          // state that can never change — the endpoint-disabling condition this
          // whole fix family exists to avoid, with no alert anywhere on the path
          // (GLM-5.3 H2, 2026-08-20).
          //
          // The correct classification already existed one file over:
          // v2PaymentRoutes' verify-session catches this same error and returns
          // 409 + requiresSupportReview. Same error, two callers, opposite
          // verdicts — sibling drift, the recurring shape of this whole family.
          //
          // Everything else still rethrows: a DB blip or a lock timeout IS
          // transient, and the grant service is idempotent, so a retry is right.
          if (grantError?.name === 'CheckoutInventoryError') {
            await notifyAdminSafely({
              title: 'Paid order held — inventory ran out before fulfilment',
              message: `Cart ${cartIdNumber} was PAID but stock ran out before fulfilment `
                + `(${grantError.itemName ?? 'unknown item'}). Nothing was granted and this `
                + 'will not retry — fulfil manually, restock, or refund.',
              data: {
                type: 'paid_order_inventory_held',
                cartId: cartIdNumber,
                userId: cart.userId,
                checkoutSessionId: session.id,
                itemName: grantError.itemName ?? null,
                requestedQuantity: grantError.requestedQuantity ?? null,
                availableStock: grantError.availableStock ?? null,
                actionRequired: 'MANUAL_FULFIL_RESTOCK_OR_REFUND',
              },
            }, '[Webhook]');
            break;
          }

          throw grantError; // Transient — let Stripe retry; the grant is idempotent.
        }

        // CAPTURED MONEY THAT WAS NOT FULFILLED MUST NEVER BE SILENT.
        //
        // grantSessionsForCart can now return `unfulfillable: true` instead of throwing
        // — either the adoption amount could not be verified (tax/discount/mutated cart
        // /missing total) or a paid session does not own this cart. Both are TERMINAL:
        // no Stripe redelivery can change the outcome, so returning 200 is correct and
        // throwing would only start an endless retry storm.
        //
        // But 200 alone is exactly the failure this replaced. The first version of the
        // amount guard returned quietly, so a legitimate taxable-or-promo customer paid,
        // received nothing, and NOBODY WAS TOLD (Kimi K3 C1, 2026-08-19). That is worse
        // than the 500 it replaced, because a 500 at least retried and was visible.
        //
        // Terminal + captured money = a human decision (fulfil manually or refund).
        if (grantResult?.unfulfillable) {
          const ctx = grantResult.alertContext ?? {};
          logger.error('[Webhook] PAID but NOT fulfilled — manual action required', {
            cartId: cartIdNumber,
            reason: grantResult.reason ?? 'unknown',
            ...ctx,
          });
          try {
            await sendNotification({
              type: 'ADMIN_NOTIFICATION',
              title: 'Payment captured but NOT fulfilled — action required',
              message: `Cart ${cartIdNumber} was paid but sessions were NOT granted `
                + `(${grantResult.reason ?? 'unknown'}). The customer has been charged and has `
                + 'received nothing. Fulfil manually or refund — this will not retry.',
              data: {
                type: 'payment_unfulfilled',
                reason: grantResult.reason ?? 'unknown',
                checkoutSessionId: session.id,
                amountTotalCents: session.amount_total ?? null,
                actionRequired: 'MANUAL_FULFIL_OR_REFUND',
                ...ctx,
              },
            });
          } catch (notifyError) {
            // Never rethrow: a down transport must not turn this into a retry storm.
            logger.error('[Webhook] Unfulfilled-payment alert failed', {
              cartId: cartIdNumber,
              errorMessage: notifyError?.message,
            });
          }
          break;
        }

        // Persist the PaymentIntent so a later refund/chargeback can find this order.
        // The card rail stores `cart.paymentIntentId || cart.checkoutSessionId` into
        // Order.paymentId, so whenever the PI is not yet known at session-creation
        // time it persists a `cs_` id — and a Stripe `charge` only ever carries a
        // `pi_` id, so refund matching could never succeed on the primary rail
        // (GLM-5.3 MEDIUM-4, round 2). At `checkout.session.completed` the PI is
        // always present, so write it here. Conditional on NULL so a redelivery is a
        // no-op and an existing value is never overwritten.
        if (session.payment_intent) {
          try {
            const { default: Order } = await import('../models/Order.mjs');
            await Order.update(
              { stripePaymentIntentId: session.payment_intent },
              { where: { cartId: cartIdNumber, stripePaymentIntentId: null } },
            );
          } catch (piError) {
            // Never fatal: this is reconciliation metadata, not fulfilment.
            logger.warn('[Webhook] Could not persist payment intent on order', {
              cartId: cartIdNumber,
              errorMessage: piError?.message,
            });
          }
        }

        try {
          await processCompletedOrder(cartIdNumber, { grantResult, stripeSessionId: session.id });
        } catch (followupError) {
          logger.error('[Webhook] Purchase follow-up failed after session grant', {
            cartId: cartIdNumber,
            userId: cart.userId,
            error: followupError.message,
          });
          throw followupError; // Let Stripe retry; the session grant itself is already idempotent.
        }

        // Backfill stripeCustomerId (write-if-empty rule)
        if (session.customer && cart.userId) {
          try {
            const webhookUser = await User.findByPk(cart.userId);
            if (webhookUser && !webhookUser.stripeCustomerId) {
              await webhookUser.update({ stripeCustomerId: session.customer });
              logger.info(`[Webhook] Backfilled stripeCustomerId for user ${cart.userId}`);
            }
          } catch (backfillErr) {
            logger.warn(`[Webhook] stripeCustomerId backfill failed: ${backfillErr.message}`);
          }
        }

        logger.info(`Order completed for cart ID: ${cartIdNumber} (via webhook)`, {
          sessionsAdded: grantResult.sessionsAdded,
          alreadyProcessed: grantResult.alreadyProcessed,
        });
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        const rawCartId = session.metadata?.cartId;
        // Parse rather than trusting the raw metadata string — findByPk('abc')
        // is a 500 waiting to happen on a signed-but-malformed payload.
        const cartId = Number.parseInt(rawCartId, 10);

        if (!Number.isSafeInteger(cartId) || cartId <= 0) {
          if (rawCartId) logger.warn('[Webhook] Expired checkout carried an invalid cartId');
          else logger.error('No cartId found in session metadata');
          break;
        }

        // RELEASE the cart, don't just flag it. This used to set
        // `checkoutSessionExpired = true` and stop — leaving the cart in
        // `pending_payment` with a dead session id. Every later POST /cart/add
        // then 409s with CART_CHECKOUT_IN_PROGRESS, and /cancel-checkout cannot
        // recover it because that route requires the session id the customer no
        // longer has. A customer who merely let the Stripe session time out was
        // locked out of their own cart indefinitely.
        //
        // The legacy /api/cart/webhook mount already did the full reset, so the
        // two live handlers disagreed and recovery depended on which URL Stripe
        // was pointed at (Kimi MEDIUM-3 / GLM E4, 2026-08-16).
        //
        // The conditional `where` is load-bearing: only a cart still pending on
        // THIS session is released, so a late-arriving expiry cannot clobber a
        // cart the customer has since paid for or already recovered.
        const [releasedCount] = await ShoppingCart.update(
          {
            status: 'active',
            paymentStatus: 'cancelled',
            checkoutSessionExpired: true,
            checkoutSessionId: null,
            paymentIntentId: null,
          },
          {
            where: { id: cartId, status: 'pending_payment', checkoutSessionId: session.id },
          }
        );

        logger.info('[Webhook] Checkout session expired for cart', {
          cartId,
          released: releasedCount > 0,
        });
        break;
      }
      // ── ACH / PaymentIntent Events ──────────────────────────────────
      case 'payment_intent.processing': {
        // ACH payments go through a 'processing' state (1-3 business days)
        const pi = event.data.object;
        if (pi.metadata?.source === 'swanstudios_ach' && pi.metadata?.orderId) {
          logger.info(`[ACH Webhook] Payment processing for order ${pi.metadata.orderNumber} (PI: ${pi.id})`);
          try {
            // Was a single combined `{ id: parseInt(...), paymentId: pi.id }`
            // update — the exact shape that made `succeeded` fall through in
            // silence on a stale metadata id: zero rows matched, nothing
            // logged. `succeeded` was fixed in this workstream; its two
            // siblings were left behind (Kimi M2 / GLM M1, 2026-08-19).
            const { order } = await findAchOrder(pi);
            if (!order) {
              logger.error('[ACH Webhook] processing event matched NO order', {
                paymentIntentId: pi.id,
                metadataOrderId: pi.metadata?.orderId,
                orderNumber: pi.metadata?.orderNumber,
              });
              break;
            }
            if (order.status === 'pending' || order.status === 'pending_payment') {
              await order.update({ status: 'processing' });
            }
          } catch (achErr) {
            logger.error(`[ACH Webhook] Failed to update order to processing: ${achErr.message}`);
          }
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        if (pi.metadata?.source === 'swanstudios_ach' && pi.metadata?.orderId) {
          logger.info(`[ACH Webhook] Payment succeeded for order ${pi.metadata.orderNumber} (PI: ${pi.id})`);
          try {
            // Lookup lives in findAchOrder — shared with processing / failed /
            // canceled so the four ACH states cannot drift apart again. See
            // that helper for why the fallback keys on the order id ALONE.
            const { order: matchedOrder, matchedBy } = await findAchOrder(pi);
            let order = matchedOrder;

            if (!order) {
              // A captured ACH payment with no order is exactly the condition a
              // human must see. Alerting is the fix for the silence;
              // reconciling the payment is a manual action.
              logger.error('[ACH Webhook] Captured payment matched NO order', {
                paymentIntentId: pi.id,
                metadataOrderId: pi.metadata?.orderId,
                orderNumber: pi.metadata?.orderNumber,
              });
              await notifyAdminSafely({
                title: 'ACH payment received with NO matching order',
                message: 'ACH payment ' + pi.id + ' succeeded but no order matched. '
                  + 'The customer has been charged and nothing was fulfilled — reconcile manually.',
                data: {
                  type: 'ach_orphan_payment',
                  paymentIntentId: pi.id,
                  metadataOrderId: pi.metadata?.orderId ?? null,
                  orderNumber: pi.metadata?.orderNumber ?? null,
                  amount: Number(pi.amount_received ?? 0) / 100,
                  actionRequired: 'MANUAL_RECONCILIATION',
                },
              }, '[ACH Webhook]');
            }

            // A WEAK match must prove itself before it moves money.
            //
            // Matching on paymentId means Stripe itself linked this intent to
            // this order. Matching on metadata.orderId alone means only that a
            // row with that id exists — and the ACH route persists orders with
            // `paymentId: null` on its `incomplete` path, so weakly-matched
            // orders are a real population, not a theoretical one. Granting a
            // weak match the same authority as a strong one let an intent
            // complete and allocate an order whose price it never covered
            // (Kimi K3 M2, 2026-08-19).
            //
            // COVERAGE, not equality: paying more than the order total is fine,
            // paying less is not. Both figures are `totalWithFee` on this rail
            // (achPaymentRoutes 276 and 320) — checked before this comparison
            // was written, because the previous amount guard in this workstream
            // compared two quantities that were not the same thing and refused
            // honest payments for it.
            //
            // Unverifiable fails CLOSED. Unknown is not agreement.
            if (order && matchedBy === 'metadata') {
              const paidCents = receivedCents(pi);
              const owedCents = Math.round(Number(order.totalAmount ?? 0) * 100);
              const covers = paidCents !== null
                && Number.isFinite(owedCents)
                && owedCents > 0
                && paidCents >= owedCents;

              if (!covers) {
                logger.error('[ACH Webhook] Weak (metadata-only) match not verified — refusing to fulfil', {
                  paymentIntentId: pi.id,
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  paidCents,
                  owedCents,
                });
                await notifyAdminSafely({
                  title: 'ACH payment could not be matched to its order safely',
                  message: 'ACH payment ' + pi.id + ' matched order ' + order.orderNumber
                    + ' by metadata only, and the amount received does not cover the order total. '
                    + 'Nothing was fulfilled — reconcile manually.',
                  data: {
                    type: 'ach_unverified_match',
                    paymentIntentId: pi.id,
                    orderId: order.id,
                    orderNumber: order.orderNumber ?? null,
                    amountReceived: paidCents === null ? null : paidCents / 100,
                    orderTotal: Number(order.totalAmount ?? 0),
                    actionRequired: 'MANUAL_RECONCILIATION',
                  },
                }, '[ACH Webhook]');
                order = null;
              }
            }

            if (order && !order.paymentAppliedAt) {
              const completedAt = order.completedAt || new Date();
              if (order.status !== 'completed') {
                await order.update({
                  status: 'completed',
                  completedAt,
                  paymentReference: pi.id,
                });
              }

              // Use the UNIFIED allocator: transactional + order-row-locked +
              // FinancialTransaction-keyed idempotent. The old SessionAllocation
              // Service had no internal idempotency, so a Stripe retry / crash
              // between allocate and the paymentAppliedAt write double-granted
              // sessions and double-counted revenue. (Matches orderRoutes.mjs:138
              // and routes/sessions.mjs.)
              const sessionCreationResult = await unifiedSessionService.allocateSessionsFromOrder(order.id, order.userId);
              await order.update({
                paymentAppliedAt: new Date(),
                paymentReference: pi.id,
                completedAt,
              });
              logger.info(`[ACH Webhook] Order ${pi.metadata.orderNumber} marked completed`, {
                sessionsAllocated: sessionCreationResult.allocated,
                totalSessions: sessionCreationResult.totalSessions,
              });
            }
          } catch (achErr) {
            logger.error(`[ACH Webhook] Failed to complete order: ${achErr.message}`);
            throw achErr;
          }
        } else {
          logger.info(`Payment succeeded: ${pi.id}`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        if (pi.metadata?.source === 'swanstudios_ach' && pi.metadata?.orderId) {
          logger.warn(`[ACH Webhook] Payment FAILED for order ${pi.metadata.orderNumber} (PI: ${pi.id})`);
          try {
            const { order } = await findAchOrder(pi);
            if (!order) {
              // The customer submitted bank details and believes a payment is
              // in flight. With no order matched, nobody ever tells them it
              // failed and the row sits `pending` forever.
              logger.error('[ACH Webhook] FAILED payment matched NO order', {
                paymentIntentId: pi.id,
                metadataOrderId: pi.metadata?.orderId,
                orderNumber: pi.metadata?.orderNumber,
              });
              await notifyAdminSafely({
                title: 'ACH payment FAILED with no matching order',
                message: 'ACH payment ' + pi.id + ' failed but no order matched. '
                  + 'The customer believes a payment is in flight — reconcile manually.',
                data: {
                  type: 'ach_failed_orphan',
                  paymentIntentId: pi.id,
                  metadataOrderId: pi.metadata?.orderId ?? null,
                  orderNumber: pi.metadata?.orderNumber ?? null,
                  actionRequired: 'MANUAL_RECONCILIATION',
                },
              }, '[ACH Webhook]');
              break;
            }
            if (!order.paymentAppliedAt) {
              await order.update({ status: 'failed' });
            }
          } catch (achErr) {
            logger.error(`[ACH Webhook] Failed to mark order as failed: ${achErr.message}`);
          }
        } else {
          logger.info(`Payment failed: ${pi.id}`);
        }
        break;

      }
      // Kimi K3 L5: a PaymentIntent canceled after creation had NO handler, so
      // its order stayed `pending` with nothing left to move it — invisible to
      // the customer and to reconciliation alike.
      //
      // Terminal status is `failed`, NOT `cancelled`. Order.status is a Postgres
      // ENUM of ('pending','pending_payment','processing','completed',
      // 'refunded','failed') — models/Order.mjs:32. Writing 'cancelled' throws
      // `invalid input value for enum` at runtime, and widening the enum is
      // production DDL this workstream defers on purpose. The cancellation is
      // distinguished in the log line, not in the column.
      case 'payment_intent.canceled': {
        const pi = event.data.object;
        if (pi.metadata?.source === 'swanstudios_ach' && pi.metadata?.orderId) {
          logger.warn('[ACH Webhook] Payment CANCELED', {
            paymentIntentId: pi.id,
            orderNumber: pi.metadata?.orderNumber,
            cancellationReason: pi.cancellation_reason ?? null,
          });
          try {
            const { order } = await findAchOrder(pi);
            if (!order) {
              logger.error('[ACH Webhook] canceled event matched NO order', {
                paymentIntentId: pi.id,
                metadataOrderId: pi.metadata?.orderId,
              });
              break;
            }
            // Never walk back an order whose payment already applied — a late
            // cancellation event must not un-complete a fulfilled purchase.
            if (!order.paymentAppliedAt && order.status !== 'completed') {
              await order.update({ status: 'failed' });
            }
          } catch (achErr) {
            logger.error('[ACH Webhook] Failed to close canceled order', {
              errorMessage: achErr?.message,
            });
          }
        } else {
          logger.info('Payment canceled: ' + pi.id);
        }
        break;
      }
      // Money leaving the business. Neither of these had a handler: an admin could
      // issue a refund (adminChargeCardRoutes / adminGalleryRoutes both call
      // stripe.refunds.create) or a customer could file a chargeback, and NOTHING
      // downstream reacted — the buyer kept every granted session and their `client`
      // role. Found by a local sweep 2026-08-16.
      case 'charge.refunded':
      case 'charge.dispute.created':
      // The CLOSING half of the lifecycle. Opening a reversal was detected; every
      // transition after it was invisible:
      //   dispute.closed  — won or lost, weeks later. A LOST dispute means the money
      //                     is gone permanently while the sessions stay granted, and
      //                     the only signal ever sent was the opening alert.
      //   refund.updated  — an issued refund can FAIL (bank rejects, card closed), so
      //                     the order reads `refunded` while nobody was ever repaid.
      //   refund.created  — the per-refund event; `charge.refunded` fires on the
      //                     CHARGE and carries a cumulative total, so a sequence of
      //                     partials cannot be reconciled from it alone.
      case 'charge.dispute.closed':
      case 'charge.refund.updated':
      case 'charge.refund.created': {
        await handleChargeReversal(event);
        break;
      }
      default:
        // Unexpected event type
        logger.info(`Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error(`Error processing webhook: ${err.message}`);
    res.status(500).send(`Webhook processing error: ${err.message}`);
  }
};

const rawBodyMiddleware = express.raw({ type: 'application/json' });

// Legacy path: /webhooks/stripe/webhook
router.post('/webhook', rawBodyMiddleware, stripeWebhookHandler);
// Stripe dashboard path: /api/webhook/stripe (mounted at /api/webhook/stripe, handler at '/')
router.post('/', rawBodyMiddleware, stripeWebhookHandler);

/**
 * Process actions needed after an order is completed
 */
/**
 * Handle money flowing BACK out — a refund or a chargeback.
 *
 * DELIBERATELY POLICY-NEUTRAL, and that is the whole design.
 *
 * Whether a refund should claw back every granted session, only the unused ones, or
 * none of them is a customer-trust decision, not a technical one, and it has not been
 * made. Auto-revoking would be irreversible and wrong under two of the three plausible
 * policies — so this does only what is correct under ALL of them:
 *
 *   1. mark the order refunded (dispute: flagged, NOT refunded — a dispute may be won)
 *   2. raise an ADMIN_NOTIFICATION carrying the amount and the order
 *   3. say explicitly that sessions were NOT auto-revoked, so nobody assumes they were
 *
 * It never touches sessions or roles. When the policy is decided, revocation hangs off
 * this function; the detection is already in place and tested.
 *
 * An UNMATCHED charge still alerts. Silent fall-through on a money event is the defect
 * (same class as the ACH orphan-payment path), not an acceptable fallback.
 *
 * Alert failures are swallowed: a down mail transport must not turn a refund webhook
 * into a 500, because Stripe retries 500s and sustained failures get the endpoint
 * disabled — which would kill fulfillment for ALL sales.
 */
async function handleChargeReversal(event) {
  const object = event.data.object;

  // Event taxonomy. Each carries a DIFFERENT object shape, which is why the field
  // reads below are conditional rather than uniform:
  //   charge.refunded        -> object is the CHARGE   (amount, amount_refunded, refunds[])
  //   charge.dispute.created -> object is the DISPUTE  (amount, charge, reason)
  //   charge.dispute.closed  -> object is the DISPUTE  (+ status: won|lost|warning_*)
  //   charge.refund.created  -> object is the REFUND   (amount, charge, status)
  //   charge.refund.updated  -> object is the REFUND   (+ status: failed|succeeded, failure_reason)
  const isDisputeOpened = event.type === 'charge.dispute.created';
  const isDisputeClosed = event.type === 'charge.dispute.closed';
  const isRefundUpdate = event.type === 'charge.refund.updated'
    || event.type === 'charge.refund.created';
  const isDispute = isDisputeOpened || isDisputeClosed;

  // A dispute/refund object points AT a charge; a charge object IS one.
  const paymentIntentId = object?.payment_intent || null;
  const chargeId = (isDispute || isRefundUpdate) ? object?.charge : object?.id;

  // Dispute outcome. Stripe uses `won` / `lost` / `warning_*`; only `lost` means the
  // money is actually gone. A WON dispute must never be booked as a refund.
  const disputeStatus = isDisputeClosed ? (object?.status ?? 'unknown') : null;
  const disputeLost = disputeStatus === 'lost';

  // A refund can fail AFTER being issued. That is the case where the books say
  // "refunded" and the customer was never repaid — the most misleading state here.
  const refundStatus = isRefundUpdate ? (object?.status ?? 'unknown') : null;
  const refundFailed = refundStatus === 'failed';

  // PARTIAL REFUNDS. `charge.amount_refunded` is CUMULATIVE across every refund on
  // the charge, so using it as "the amount refunded now" reported a growing total as
  // if newly refunded on each event, and flipping status on it marked an order fully
  // refunded on the first $0.01 (GLM-5.3 MEDIUM-6, round 2).
  // Report the LATEST refund's delta, and only call the order refunded when the
  // cumulative total has actually reached the charge total.
  const chargeTotalCents = Number(object?.amount ?? 0);
  const cumulativeRefundedCents = Number(object?.amount_refunded ?? 0);
  // `refunds.data[length - 1]` was wrong twice over. Stripe list objects come
  // back NEWEST-FIRST, so the last element is the OLDEST refund, not the latest;
  // and the embedded list is capped (10 by default, `has_more` set beyond that),
  // so on a heavily-refunded charge the entry may not be present at all
  // (Kimi K3 L3 / GLM-5.3 L1, 2026-08-19).
  //
  // Pick by `created` rather than by position, and only trust the list when it
  // is complete. When it is truncated or absent, fall back to the cumulative
  // figure and SAY SO in the payload — reporting a cumulative total as a
  // per-event delta is the exact misreport this block was written to kill, and
  // an alert that quietly lies about an amount is worse than one that admits
  // it does not know.
  const refundEntries = Array.isArray(object?.refunds?.data) ? object.refunds.data : [];
  const refundListTruncated = Boolean(object?.refunds?.has_more) || refundEntries.length === 0;
  const newestRefund = refundEntries.reduce(
    (newest, entry) => (
      newest === null || Number(entry?.created ?? 0) > Number(newest?.created ?? 0) ? entry : newest
    ),
    null,
  );
  const latestRefundCents = (!refundListTruncated && newestRefund)
    ? Number(newestRefund.amount ?? cumulativeRefundedCents)
    : cumulativeRefundedCents;
  const latestRefundAmountIsExact = !refundListTruncated && Boolean(newestRefund);
  // Only a CHARGE-level refund that has reached the full amount flips order status.
  // A dispute (won or lost) is not a refund, and a per-refund event does not carry
  // the charge's cumulative total, so neither may move it.
  const isFullyRefunded = !isDispute
    && !isRefundUpdate
    && chargeTotalCents > 0
    && cumulativeRefundedCents >= chargeTotalCents;

  // For a refund.* event the object IS the refund, so its own amount is the delta.
  const amountCents = (isDispute || isRefundUpdate)
    ? Number(object?.amount ?? 0)
    : latestRefundCents;
  const amount = amountCents / 100;
  const cumulativeRefunded = cumulativeRefundedCents / 100;

  let order = null;
  try {
    if (paymentIntentId) {
      const { default: Order } = await import('../models/Order.mjs');
      // Both columns are populated depending on the rail that created the order:
      // ACH writes `paymentId`, the card path writes `stripePaymentIntentId`.
      order = await Order.findOne({ where: { stripePaymentIntentId: paymentIntentId } })
        || await Order.findOne({ where: { paymentId: paymentIntentId } });

      if (order && isFullyRefunded) {
        // A dispute is not a refund — it can still be won — and a PARTIAL refund is
        // not a refunded order. Only a refund that has reached the full charge
        // amount moves the order's status.
        await order.update({ status: 'refunded' });
      }
    }
  } catch (lookupError) {
    logger.error('[Webhook] Charge reversal: order lookup/update failed', {
      eventType: event.type,
      chargeId,
      errorName: lookupError?.name,
      errorMessage: lookupError?.message,
    });
  }

  const label = isDisputeClosed
    ? `Chargeback CLOSED — ${disputeLost ? 'LOST' : (disputeStatus === 'won' ? 'WON' : disputeStatus)}`
    : isDisputeOpened
      ? 'Chargeback opened'
      : event.type === 'charge.refund.updated'
        ? (refundFailed ? `Refund FAILED (${object?.failure_reason ?? 'reason unknown'})` : `Refund updated — ${refundStatus}`)
        : event.type === 'charge.refund.created'
          ? 'Refund created'
          : (isFullyRefunded ? 'Refund issued (full)' : 'Refund issued (PARTIAL)');
  logger.warn(`[Webhook] ${label}`, {
    eventType: event.type,
    chargeId,
    paymentIntentId,
    amount,
    orderId: order?.id ?? null,
    orderNumber: order?.orderNumber ?? null,
    matched: Boolean(order),
  });

  try {
    await sendNotification({
      type: 'ADMIN_NOTIFICATION',
      title: order
        ? `${label} — review granted sessions`
        : `${label} — NO MATCHING ORDER`,
      message: order
        ? `${label}: $${amount.toFixed(2)} on order ${order.orderNumber}. `
          + 'Sessions and role were NOT changed automatically — review and adjust manually.'
        : `${label}: $${amount.toFixed(2)} for charge ${chargeId}, but no order matched `
          + `payment intent ${paymentIntentId}. Investigate — this payment is unreconciled.`,
      data: {
        type: isDispute ? 'charge_dispute' : 'charge_refund',
        disputeStatus,
        disputeLost: isDisputeClosed ? disputeLost : null,
        refundStatus,
        refundFailed: isRefundUpdate ? refundFailed : null,
        failureReason: refundFailed ? (object?.failure_reason ?? null) : null,
        eventType: event.type,
        chargeId,
        paymentIntentId,
        amount,
        cumulativeRefunded: isDispute ? null : cumulativeRefunded,
        // False when the embedded refunds list was truncated or absent, in
        // which case `amount` above is the CUMULATIVE total rather than this
        // event's delta. An alert that quietly reports the wrong number is
        // worse than one that admits it does not know.
        amountIsExactDelta: (isDispute || isRefundUpdate) ? true : latestRefundAmountIsExact,
        chargeTotal: chargeTotalCents / 100,
        fullyRefunded: isFullyRefunded,
        orderId: order?.id ?? null,
        orderNumber: order?.orderNumber ?? null,
        userId: order?.userId ?? null,
        cartId: order?.cartId ?? null,
        sessionsAutoRevoked: false,
        reason: isDispute ? (object?.reason ?? null) : null,
        actionRequired: 'MANUAL_SESSION_REVIEW',
      },
    });
  } catch (notifyError) {
    // Never rethrow: a 500 here triggers Stripe retries and endpoint disabling.
    logger.error('[Webhook] Charge reversal: admin notification failed', {
      chargeId,
      errorName: notifyError?.name,
      errorMessage: notifyError?.message,
    });
  }
}

export async function processCompletedOrder(cartId, { grantResult = null, stripeSessionId = null } = {}) {
  try {
    // Retrieve the completed cart with its items
    const cart = await ShoppingCart.findByPk(cartId, {
      include: [{ 
        model: CartItem, 
        as: 'cartItems',
        include: [{ 
          model: StorefrontItem, 
          as: 'storefrontItem' 
        }]
      }]
    });
    
    if (!cart || !cart.cartItems) {
      logger.error(`Could not find completed cart with ID: ${cartId}`);
      return;
    }
    
    const userId = cart.userId;
    
    // Fetch user data to include in notifications
    const user = await User.findByPk(userId);
    if (!user) {
      logger.error(`User not found with ID: ${userId}`);
      return;
    }
    
    let totalSessionsAdded = 0;
    const packageNames = [];
    
    // Process each item — collect totals first, then batch DB operations
    const subscriptionItems = [];
    for (const item of cart.cartItems) {
      const storefrontItem = item.storefrontItem;
      if (!storefrontItem) {
        logger.warn(`StorefrontItem not found for cart item: ${item.id}`);
        continue;
      }
      packageNames.push(storefrontItem.name);
      totalSessionsAdded += getStorefrontSessionCredits(storefrontItem) * (item.quantity || 1);
      if (storefrontItem.packageType === 'monthly') {
        subscriptionItems.push(storefrontItem);
      }
    }

    // A cart may legitimately contain ONLY physical products (merch), which carry zero
    // session credits. Throwing on that shape 500'd this webhook FOREVER: the grant has
    // already committed, so every Stripe retry re-threw here, and sustained failures make
    // Stripe disable the endpoint outright — which would kill server-side fulfillment for
    // ALL sales, including training packages. Only a cart with neither session credits nor
    // physical items is a genuine anomaly worth retrying.
    const hasPhysicalItems = cart.cartItems.some(isPhysicalCartItem);
    if (cart.cartItems.length > 0 && totalSessionsAdded <= 0 && !hasPhysicalItems) {
      throw new Error(`No session credits found for completed cart ${cartId}`);
    }

    // Create order record for history. The helper is idempotent by cart id.
    const orderReceipt = await createOrderRecord(cart, { stripeSessionId });
    const order = orderReceipt?.order || null;

    if (totalSessionsAdded > 0) {
      await upgradeToClient(userId);

      if (orderReceipt?.created) {
        try {
          const io = global.io;
          if (io) {
            io.to('admin').emit('user_purchased_sessions', {
              userId,
              userName: `${user.firstName} ${user.lastName}`,
              sessions: totalSessionsAdded,
              timestamp: new Date().toISOString()
            });
          }
        } catch (socketError) {
          logger.warn(`Failed to emit Socket.IO event: ${socketError.message}`);
        }
      }
    }

    if (orderReceipt?.created) {
      // Process subscriptions sequentially (rare, usually 1)
      for (const subItem of subscriptionItems) {
        await createSubscription(userId, subItem);
      }

      // Fire gamification rewards in parallel (non-critical, external calls)
      await Promise.allSettled(
        cart.cartItems
          .filter(item => item.storefrontItem)
          .map(item => triggerPurchaseAchievements(userId, item))
      );
    }

    // Create trainer commission record once per order (non-critical, non-blocking)
    if (totalSessionsAdded > 0) {
      const totalAmount = cart.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      if (orderReceipt?.created) {
        await createCommissionForPurchase({
          userId,
          orderId: order?.id,
          grossAmount: totalAmount,
          taxAmount: 0, // Tax calculated separately in checkout
          sessionsGranted: totalSessionsAdded,
          storefrontItemId: cart.cartItems[0]?.storefrontItemId,
          leadSource: 'platform', // Default for Stripe checkout; admin grants can specify
        }).catch(err => logger.warn(`[Webhook] Commission creation failed (non-fatal): ${err.message}`));
      }
    }

    logger.info('[Webhook] Purchase fulfillment completed through SwanStudios APIs', {
      userId,
      cartId,
      totalSessionsAdded,
      packages: packageNames.length,
      grantAlreadyProcessed: grantResult?.alreadyProcessed === true,
    });
    
    // Send real-time notification to admins once per order.
    if (orderReceipt?.created) {
      try {
        await sendNotification({
          type: 'ADMIN_NOTIFICATION',
          title: 'New Purchase',
          message: `${user.firstName} ${user.lastName} purchased ${packageNames.join(', ')}${totalSessionsAdded ? ` (${totalSessionsAdded} sessions)` : ''}.`,
          data: {
            userId,
            type: 'purchase',
            sessions: totalSessionsAdded,
            orderId: order?.id,
            timestamp: new Date().toISOString()
          },
          recipients: ['admin'] // Target all admins
        });
      } catch (notifyError) {
        logger.warn(`Failed to send admin notification: ${notifyError.message}`);
      }
    }
    
  } catch (error) {
    logger.error(`Error processing completed order: ${error.message}`);
    throw error;
  }
}

/**
 * Create subscription for monthly training packages
 */
async function createSubscription(userId, storefrontItem) {
  // To be implemented based on your subscription model
  logger.info(`Creating subscription for user ${userId} with package ${storefrontItem.id}`);
}

/**
 * Trigger achievements and point rewards for purchase
 */
async function triggerPurchaseAchievements(userId, cartItem) {
  try {
    const sessions = getStorefrontSessionCredits(cartItem.storefrontItem);
    const points = Math.min(500, Math.max(25, sessions * 10 || Math.round(Number(cartItem.price || 0) / 10)));
    const itemName = cartItem.storefrontItem?.name || 'Training Package';

    await GamificationPointsService.recordLedgerEntry({
      userId,
      points,
      transactionType: 'earn',
      source: 'package_purchase',
      sourceId: cartItem.storefrontItemId,
      description: `Purchase reward: ${itemName}`,
      metadata: {
        cartItemId: cartItem.id,
        itemId: cartItem.storefrontItemId,
        itemName,
        itemType: cartItem.storefrontItem?.packageType || 'UNKNOWN',
        price: cartItem.price,
        sessions
      },
      idempotencyKey: `purchase:${userId}:${cartItem.id || cartItem.storefrontItemId}`,
      applyMultiplier: false
    });
    
    logger.info(`Recorded purchase reward for user ${userId} with item ${cartItem.storefrontItemId}`);
  } catch (error) {
    logger.warn(`Error triggering purchase achievements: ${error.message}`);
    // Don't throw the error to prevent blocking the main purchase flow
  }
}

/**
 * Create order record for order history
 */
async function createOrderRecord(cart, { stripeSessionId = null } = {}) {
  try {
    const { default: Order } = await import('../models/Order.mjs');
    const totalAmount = cart.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const idempotencyKey = `stripe-webhook-cart:${cart.id}`;
    const orderNumber = `SWAN-CART-${cart.id}`;
    const paymentReference = stripeSessionId || cart.checkoutSessionId || null;

    // The session grant already wrote THE order for this cart (createCartOrderIfPossible,
    // inside its transaction) under a DIFFERENT idempotency key ('cart-fulfillment:<id>'
    // vs 'stripe-webhook-cart:<id>'). Claiming by our own key therefore never saw it and
    // created a SECOND status:'completed' row with the same cartId and totalAmount — so
    // every cart sale was counted twice by Order.sum('totalAmount', {status:'completed'})
    // in the revenue/admin dashboards. Reuse the grant's row instead.
    //
    // 'created' still has to mean "this delivery is the first to fulfil this cart", since
    // it gates the one-time side effects (commission, admin notification, gamification).
    // Claim that right atomically on the existing row via paymentAppliedAt, which the
    // grant leaves NULL: exactly one concurrent delivery can flip NULL -> now. This is
    // also path-independent — it works when verify-session created the order first.
    const existingOrder = await Order.findOne({ where: { cartId: cart.id } });
    if (existingOrder) {
      const [claimedCount] = await Order.update(
        { paymentAppliedAt: new Date(), paymentReference },
        { where: { id: existingOrder.id, paymentAppliedAt: null } },
      );
      const claimed = Number(claimedCount) === 1;
      logger.info(
        claimed
          ? `Claimed fulfillment side effects for cart ${cart.id} (order ${existingOrder.id})`
          : `Fulfillment side effects already applied for cart ${cart.id}`,
      );
      return { order: existingOrder, created: claimed };
    }

    // Fallback: no grant-created order (e.g. the optional Order model was unavailable
    // during the grant). Keep the legacy writer so fulfillment history is never lost.
    const { record, created } = await claimIdempotentRecord({
      model: Order,
      lookupWhere: { idempotencyKey },
      createValues: {
        userId: cart.userId,
        cartId: cart.id,
        orderNumber,
        totalAmount,
        status: 'completed',
        paymentMethod: 'card',
        paymentReference: stripeSessionId || cart.checkoutSessionId || null,
        idempotencyKey,
        paymentAppliedAt: new Date(),
        notes: JSON.stringify({
          cartId: cart.id,
          checkoutSessionId: stripeSessionId || cart.checkoutSessionId || null,
          items: cart.cartItems.map(item => ({
            itemId: item.storefrontItemId,
            quantity: item.quantity,
            price: item.price,
            name: item.storefrontItem?.name || 'Unknown Item',
          })),
        }),
      },
    });

    if (created) {
      logger.info(`Created order record ${orderNumber} for cart ${cart.id}`);
    } else {
      logger.info(`Order record already exists for cart ${cart.id}`);
    }

    return { order: record, created };
  } catch (error) {
    logger.error(`Error creating order record: ${error.message}`);
    throw error;
  }
}

/**
 * Fulfill gallery credit purchase or VIP activation after Stripe payment confirmed.
 * Called from the checkout.session.completed handler when metadata.type === 'gallery_credits'.
 */
async function fulfillGalleryCredits(session) {
  const meta = session.metadata || {};
  const visitorId = parseInt(meta.visitorId);
  const pkg = meta.package;
  const credits = parseInt(meta.credits) || 0;

  if (!visitorId) {
    logger.error(`[Gallery Webhook] No visitorId in session ${session.id}`);
    return;
  }

  const visitor = await GalleryVisitor.findByPk(visitorId);
  if (!visitor) {
    logger.error(`[Gallery Webhook] Visitor ${visitorId} not found for session ${session.id}`);
    return;
  }

  const amount = typeof session.amount_total === 'number'
    ? Math.round(session.amount_total) / 100
    : null;
  const [processed] = await sequelize.query(
    `INSERT INTO processed_stripe_sessions ("sessionId", "userId", tier, amount)
     VALUES (:sessionId, :userId, 'gallery-credit', :amount)
     ON CONFLICT ("sessionId") DO NOTHING
     RETURNING id`,
    {
      replacements: {
        sessionId: session.id,
        userId: visitor.userId || null,
        amount,
      },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (!processed) {
    logger.info(`[Gallery Webhook] Duplicate gallery credit session ${session.id} skipped`);
    return;
  }

  if (pkg === 'vip') {
    await visitor.update({ isVip: true });
    logger.info(`[Gallery Webhook] VIP activated for visitor ${visitorId}`);
  } else if (credits > 0) {
    // Atomic increment — safe against concurrent webhooks
    await GalleryVisitor.increment('enhancementCredits', {
      by: credits,
      where: { id: visitorId },
    });
    logger.info(`[Gallery Webhook] +${credits} credits for visitor ${visitorId}`);
  }

  // Bump lead score (+10 for purchase)
  try {
    const lead = await Lead.findOne({ where: { galleryVisitorId: visitorId } });
    if (lead) {
      const newScore = Math.min(100, (lead.score || 0) + 10);
      await lead.update({ score: newScore });
      await LeadActivity.create({
        leadId: lead.id,
        type: 'score_changed',
        performedByAI: true,
        title: `Lead score +10 (credit purchase: ${pkg})`,
        description: `Purchased ${pkg} package via Stripe (session ${session.id})`,
        metadata: { previousScore: lead.score, newScore, reason: 'credit_purchase', package: pkg },
      });
    }
  } catch (scoreErr) {
    logger.warn(`[Gallery Webhook] Lead score bump failed: ${scoreErr.message}`);
  }
}

async function fulfillGalleryDonation(session) {
  const meta = session.metadata || {};
  const visitorId = Number.parseInt(meta.visitorId, 10);
  const eventId = Number.parseInt(meta.eventId, 10);
  const method = meta.method === 'venmo' ? 'venmo' : 'stripe';
  const amount = typeof session.amount_total === 'number'
    ? Math.round(session.amount_total) / 100
    : Number.parseFloat(meta.amount) || 0;

  if (!visitorId || !eventId) {
    logger.error(`[Gallery Donation Webhook] Missing visitor/event metadata in session ${session.id}`);
    return;
  }

  if (session.payment_status && session.payment_status !== 'paid') {
    logger.warn(`[Gallery Donation Webhook] Session ${session.id} completed with payment_status=${session.payment_status}; skipping donation record`);
    return;
  }

  const visitor = await GalleryVisitor.findOne({ where: { id: visitorId, eventId } });
  if (!visitor) {
    logger.error(`[Gallery Donation Webhook] Visitor ${visitorId} not found for event ${eventId} in session ${session.id}`);
    return;
  }

  const [processed] = await sequelize.query(
    `INSERT INTO processed_stripe_sessions ("sessionId", "userId", tier, amount)
     VALUES (:sessionId, :userId, 'gallery-donation', :amount)
     ON CONFLICT ("sessionId") DO NOTHING
     RETURNING id`,
    {
      replacements: {
        sessionId: session.id,
        userId: visitor.userId || null,
        amount,
      },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (!processed) {
    logger.info(`[Gallery Donation Webhook] Duplicate donation session ${session.id} skipped`);
    return;
  }

  await GalleryDonation.create({
    visitorId,
    eventId,
    amount,
    method,
    stripePaymentId: session.id,
  });

  try {
    await sendNotification({
      type: 'ADMIN_NOTIFICATION',
      title: 'Gallery Donation Received',
      message: `Visitor #${visitorId} donated $${amount.toFixed(2)} via ${method === 'venmo' ? 'Venmo' : 'Stripe'}.`,
      data: {
        type: 'gallery_donation',
        visitorId,
        eventId,
        amount,
        method,
        stripeSessionId: session.id,
        timestamp: new Date().toISOString(),
      },
      recipients: ['admin'],
    });
  } catch (notifyErr) {
    logger.warn(`[Gallery Donation Webhook] Admin notification failed: ${notifyErr.message}`);
  }
}

/**
 * Fulfill a paid gallery PRINT order (Slice 3b — the money loop).
 * Called from checkout.session.completed when metadata.type === 'print_order'.
 *
 * Design (plan §3):
 *  - Signature is already verified by the outer handler (constructEvent).
 *  - ATOMIC replay guard: processed_stripe_sessions INSERT … ON CONFLICT — the
 *    first delivery of a session wins; Stripe's at-least-once redelivery no-ops.
 *  - Map the PrintOrder from the SESSION'S OWN id (server-set on the order at
 *    checkout), falling back to the server-set metadata.orderId — never client
 *    input.
 *  - Fail-closed: capture (pending → paid) FIRST. The print-lab submission is
 *    Slice 3c (a separate step); if it later fails the order stays 'paid' and
 *    surfaces in the admin view — a captured order is never left invisible.
 *  - Idempotent by construction: the flip is `WHERE status = 'pending'`, and the
 *    replay-guard INSERT + the flip share ONE transaction — a fulfillment failure
 *    rolls back the 'processed' marker so Stripe's retry re-processes (no
 *    stuck-in-pending-after-payment hole).
 */
async function fulfillPrintOrder(session) {
  const meta = session.metadata || {};

  // Only fulfill genuinely-paid sessions (mirror the donation guard).
  if (session.payment_status && session.payment_status !== 'paid') {
    logger.warn(`[Print Webhook] Session ${session.id} completed with payment_status=${session.payment_status}; not marking paid`);
    return;
  }

  const amount = typeof session.amount_total === 'number'
    ? Math.round(session.amount_total) / 100
    : null;
  // Prodigi (3c) needs a recipient address; capture what Stripe collected. Read across
  // API-version shapes (shipping_details moved under collected_information in newer versions).
  const shippingDetails = session.shipping_details
    || session.collected_information?.shipping_details
    || null;

  let flippedOrder = null;
  let recordedStatus = null;
  const t = await sequelize.transaction();
  try {
    // Atomic replay guard. Concurrent same-session deliveries serialize on the
    // unique index: the second blocks, then sees no row and skips.
    const [processed] = await sequelize.query(
      `INSERT INTO processed_stripe_sessions ("sessionId", "userId", tier, amount)
       VALUES (:sessionId, :userId, 'gallery-print', :amount)
       ON CONFLICT ("sessionId") DO NOTHING
       RETURNING id`,
      {
        replacements: { sessionId: session.id, userId: null, amount },
        type: sequelize.QueryTypes.SELECT,
        transaction: t,
      }
    );

    if (!processed) {
      await t.rollback();
      logger.info(`[Print Webhook] Duplicate print-order session ${session.id} skipped`);
      return;
    }

    // Resolve by the session's own id (server-set at checkout), then by the
    // server-set metadata.orderId. Row-locked to serialize any concurrent edit.
    let order = await PrintOrder.findOne({
      where: { stripeSessionId: session.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!order) {
      const orderId = Number.parseInt(meta.orderId, 10);
      if (Number.isInteger(orderId) && orderId > 0) {
        order = await PrintOrder.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
      }
    }
    if (!order) {
      await t.rollback();
      // A PAID session with no local order = money captured, no record. This
      // should never happen (the order is created before the session), but if it
      // does, the plan's "never leave a captured order invisible" rule applies:
      // don't silently drop it — alert an admin to reconcile in Stripe. Ack 200
      // (a retry cannot conjure a deleted order); the alert is the safety net.
      logger.error(`[Print Webhook] PAID session ${session.id} has NO matching PrintOrder (metadata.orderId=${meta.orderId}) — alerting admin`);
      try {
        await sendNotification({
          type: 'ADMIN_NOTIFICATION',
          title: 'Print Payment Needs Attention',
          message: `A print payment completed (session ${session.id}) but no matching order was found. Verify in Stripe — money may be captured with no local order.`,
          data: {
            type: 'print_order_orphan',
            stripeSessionId: session.id,
            metadataOrderId: meta.orderId ?? null,
            amount,
            timestamp: new Date().toISOString(),
          },
          recipients: ['admin'],
        });
      } catch (notifyErr) {
        logger.warn(`[Print Webhook] Orphan-payment admin alert failed: ${notifyErr.message}`);
      }
      return;
    }

    // Fail-closed capture: pending → paid. No-op if already advanced.
    const [flipped] = await sequelize.query(
      `UPDATE print_orders SET status = 'paid', paid_at = NOW(),
              shipping_address = :shipping::jsonb, updated_at = NOW()
       WHERE id = :id AND status = 'pending'
       RETURNING id`,
      {
        replacements: { id: order.id, shipping: shippingDetails ? JSON.stringify(shippingDetails) : null },
        type: sequelize.QueryTypes.SELECT,
        transaction: t,
      }
    );

    flippedOrder = flipped ? order : null;
    recordedStatus = order.status;
    await t.commit();
  } catch (err) {
    try { await t.rollback(); } catch { /* already settled */ }
    logger.error(`[Print Webhook] fulfillPrintOrder failed for session ${session.id}: ${err.message}`);
    throw err; // 500 → Stripe retries; the rolled-back processed marker lets the retry re-process.
  }

  if (!flippedOrder) {
    logger.info(`[Print Webhook] print-order session ${session.id} recorded; order already beyond pending (status=${recordedStatus}), no re-flip`);
    return;
  }

  logger.info(`[Print Webhook] PrintOrder ${flippedOrder.id} → paid (session ${session.id})`);

  // Best-effort admin notification (outside the txn — a notify failure must not
  // un-capture the payment). Slice 3c will hang print-lab submission off 'paid'.
  try {
    await sendNotification({
      type: 'ADMIN_NOTIFICATION',
      title: 'Print Order Paid',
      message: `Print order #${flippedOrder.id} paid ($${amount != null ? amount.toFixed(2) : flippedOrder.priceUsd}). Ready to fulfill.`,
      data: {
        type: 'print_order',
        orderId: flippedOrder.id,
        visitorId: flippedOrder.visitorId,
        eventId: flippedOrder.eventId,
        amount,
        stripeSessionId: session.id,
        timestamp: new Date().toISOString(),
      },
      recipients: ['admin'],
    });
  } catch (notifyErr) {
    logger.warn(`[Print Webhook] Admin notification failed: ${notifyErr.message}`);
  }

  // Slice 3c: hand the captured order off to the print lab as a SEPARATE, flag-gated step.
  // The flip is already committed, so a provider failure keeps the order 'paid' (visible +
  // retryable). Inline flag check + LAZY import so this LIVE payment webhook never
  // hard-depends on the print modules at load — a print-module fault can't crash payments.
  if (process.env.PRINT_FULFILLMENT_PRODIGI_ENABLED === 'true') {
    try {
      const { submitToProvider } = await import('../services/print/printFulfillmentService.mjs');
      await submitToProvider(flippedOrder.id, { source: 'stripe_webhook' });
    } catch (fulfillErr) {
      logger.warn(`[Print Webhook] Prodigi hand-off error (order stays paid): ${fulfillErr.message}`);
    }
  }
}

export default router;
