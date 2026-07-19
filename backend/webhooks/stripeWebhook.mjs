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
const stripeWebhookHandler = async (req, res) => {
  // Verify webhook signature
  let event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.error('CRITICAL: Stripe webhook secret not configured. Rejecting request.', {
        ip: req.ip,
        bodyPreview: typeof req.body === 'string' ? req.body.substring(0, 200) : JSON.stringify(req.body).substring(0, 200)
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
            amount: 175,
          });
          break;
        }

        const cartId = session.metadata?.cartId;

        if (!cartId) {
          logger.warn('[Webhook] checkout.session.completed with no cartId or gallery_credits — ignoring');
          break;
        }

        const cartIdNumber = Number.parseInt(cartId, 10);
        if (!Number.isInteger(cartIdNumber) || cartIdNumber <= 0) {
          logger.error(`[Webhook] Invalid cartId in checkout.session.completed metadata: ${cartId}`);
          break;
        }

        // Get the cart owner, then delegate granting to the shared row-lock service.
        const cart = await ShoppingCart.findByPk(cartIdNumber);

        if (!cart) {
          logger.error(`Cart with ID ${cartId} not found`);
          break;
        }

        if (!cart.userId) {
          logger.error(`[Webhook] Cart ${cartIdNumber} has no userId; cannot grant sessions`);
          break;
        }

        let grantResult;
        try {
          grantResult = await grantSessionsForCart(cartIdNumber, cart.userId, 'webhook', { checkoutSessionId: session.id });
        } catch (grantError) {
          logger.error('[Webhook] Session grant failed', {
            cartId: cartIdNumber,
            userId: cart.userId,
            error: grantError.message,
            stack: grantError.stack,
          });
          throw grantError; // Let Stripe retry; grant service is idempotent.
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
        const cartId = session.metadata?.cartId;
        
        if (!cartId) {
          logger.error('No cartId found in session metadata');
          break;
        }
        
        // Mark cart checkout as expired
        const cart = await ShoppingCart.findByPk(cartId);
        if (cart) {
          cart.checkoutSessionExpired = true;
          await cart.save();
          logger.info(`Checkout session expired for cart ID: ${cartId}`);
        }
        break;
      }
      // ── ACH / PaymentIntent Events ──────────────────────────────────
      case 'payment_intent.processing': {
        // ACH payments go through a 'processing' state (1-3 business days)
        const pi = event.data.object;
        if (pi.metadata?.source === 'swanstudios_ach' && pi.metadata?.orderId) {
          logger.info(`[ACH Webhook] Payment processing for order ${pi.metadata.orderNumber} (PI: ${pi.id})`);
          try {
            const { default: Order } = await import('../models/Order.mjs');
            await Order.update(
              { status: 'processing' },
              { where: { id: parseInt(pi.metadata.orderId), paymentId: pi.id } }
            );
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
            const { default: Order } = await import('../models/Order.mjs');
            const order = await Order.findOne({
              where: { id: parseInt(pi.metadata.orderId), paymentId: pi.id },
            });
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
            const { default: Order } = await import('../models/Order.mjs');
            await Order.update(
              { status: 'failed' },
              { where: { id: parseInt(pi.metadata.orderId), paymentId: pi.id } }
            );
          } catch (achErr) {
            logger.error(`[ACH Webhook] Failed to mark order as failed: ${achErr.message}`);
          }
        } else {
          logger.info(`Payment failed: ${pi.id}`);
        }
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
