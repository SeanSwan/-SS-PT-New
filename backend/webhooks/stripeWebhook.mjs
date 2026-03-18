// backend/webhooks/stripeWebhook.mjs
import express from 'express';
import Stripe from 'stripe';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import User from '../models/User.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import GalleryVisitor from '../models/GalleryVisitor.mjs';
import Lead from '../models/Lead.mjs';
import LeadActivity from '../models/LeadActivity.mjs';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
import { upgradeToClient } from '../services/roleService.mjs';
import axios from 'axios';
import { sendNotification } from '../services/notificationService.mjs';

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
    } else {
      const signature = req.headers['stripe-signature'];
      event = stripeClient.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    }
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // ── Gallery Credit / VIP Fulfillment ──────────────────────────
        if (session.metadata?.type === 'gallery_credits') {
          await fulfillGalleryCredits(session);
          break;
        }

        // ── Cart / Store Fulfillment ──────────────────────────────────
        const cartId = session.metadata?.cartId;

        if (!cartId) {
          logger.warn('[Webhook] checkout.session.completed with no cartId or gallery_credits — ignoring');
          break;
        }

        // Get the cart and complete the order
        const cart = await ShoppingCart.findByPk(cartId);

        if (!cart) {
          logger.error(`Cart with ID ${cartId} not found`);
          break;
        }

        // IDEMPOTENCY CHECK: Skip if sessions already granted
        if (cart.sessionsGranted === true) {
          logger.info(`[Webhook] Idempotency: Cart ${cartId} already has sessions granted - skipping`);
          console.log(`⚠️ [Webhook] Sessions already granted for cart ${cartId} - idempotent skip`);
          break;
        }

        // Mark cart as completed — but do NOT set sessionsGranted until fulfillment succeeds
        cart.status = 'completed';
        cart.paymentStatus = 'paid';
        cart.completedAt = new Date();
        cart.checkoutSessionId = session.id;

        try {
          // Process fulfillment FIRST
          await processCompletedOrder(cartId);

          // ONLY mark as granted if fulfillment succeeded
          cart.sessionsGranted = true;
          cart.fulfillmentAttempts = (cart.fulfillmentAttempts || 0) + 1;
          cart.fulfillmentStatus = 'success';
          await cart.save();
        } catch (fulfillError) {
          cart.fulfillmentAttempts = (cart.fulfillmentAttempts || 0) + 1;
          logger.error('Order fulfillment failed', {
            cartId,
            attempt: cart.fulfillmentAttempts,
            error: fulfillError.message,
            stack: fulfillError.stack,
          });
          if (cart.fulfillmentAttempts >= 5) {
            cart.fulfillmentStatus = 'failed';
          }
          await cart.save();
          throw fulfillError; // Let Stripe retry
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

        logger.info(`Order completed for cart ID: ${cartId} (via webhook)`);
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
            if (order && order.status !== 'completed') {
              await order.update({
                status: 'completed',
                paymentAppliedAt: new Date(),
              });
              logger.info(`[ACH Webhook] Order ${pi.metadata.orderNumber} marked completed`);
            }
          } catch (achErr) {
            logger.error(`[ACH Webhook] Failed to complete order: ${achErr.message}`);
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
async function processCompletedOrder(cartId) {
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
    let packageNames = [];
    
    // Process each item — collect totals first, then batch DB operations
    const subscriptionItems = [];
    for (const item of cart.cartItems) {
      const storefrontItem = item.storefrontItem;
      if (!storefrontItem) {
        logger.warn(`StorefrontItem not found for cart item: ${item.id}`);
        continue;
      }
      packageNames.push(storefrontItem.name);
      if (storefrontItem.itemType === 'TRAINING_PACKAGE_FIXED') {
        totalSessionsAdded += storefrontItem.sessions || 0;
      } else if (storefrontItem.itemType === 'TRAINING_PACKAGE_SUBSCRIPTION') {
        subscriptionItems.push(storefrontItem);
      }
    }

    // Batch: single atomic increment for all sessions
    if (totalSessionsAdded > 0) {
      await addSessionsToUserAccount(userId, totalSessionsAdded);
    }

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
    
    // Create order record for history
    await createOrderRecord(cart);
    
    // Notify the MCP server about the purchase (Financial Events MCP)
    try {
      const mcpUrl = process.env.FINANCIAL_EVENTS_MCP_URL || 'http://localhost:8010';
      
      // Extract comprehensive purchase metadata for enhanced analytics
      const purchaseData = {
        userId,
        cartId,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalSessionsAdded,
        packages: packageNames,
        totalAmount: cart.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        timestamp: new Date().toISOString(),
        // Enhanced metadata for better analytics
        clientType: user.clientType || 'standard',
        purchaseSource: cart.source || 'web',
        isFirstPurchase: !user.hasPurchasedBefore, // Check if this is their first purchase
        packageDetails: cart.cartItems.map(item => ({
          id: item.storefrontItem?.id,
          name: item.storefrontItem?.name,
          type: item.storefrontItem?.itemType,
          sessions: item.storefrontItem?.sessions || 0,
          price: item.price,
          quantity: item.quantity
        })),
        // Add user demographics if available
        userDemographics: {
          joinDate: user.createdAt,
          region: user.region || 'unknown'
        }
      };
      
      // Fire all MCP notifications in parallel (non-critical, don't block webhook)
      const mcpCalls = [
        axios.post(`${mcpUrl}/api/process-sale`, purchaseData).catch(err =>
          logger.warn(`Failed to notify Financial MCP: ${err.message}`)
        ),
      ];

      const clientInsightsMcpUrl = process.env.CLIENT_INSIGHTS_MCP_URL;
      if (clientInsightsMcpUrl) {
        mcpCalls.push(
          axios.post(`${clientInsightsMcpUrl}/api/enrich-client-profile`, { userId, purchaseData }).catch(err =>
            logger.warn(`Failed to notify Client Insights MCP: ${err.message}`)
          )
        );
      }

      const schedulingMcpUrl = process.env.SCHEDULING_ASSIST_MCP_URL;
      if (schedulingMcpUrl && totalSessionsAdded > 0) {
        mcpCalls.push(
          axios.post(`${schedulingMcpUrl}/api/suggest-session-slots`, { userId, packageId: cart.id, sessionCount: totalSessionsAdded }).catch(err =>
            logger.warn(`Failed to notify Scheduling MCP: ${err.message}`)
          )
        );
      }

      await Promise.allSettled(mcpCalls);
    } catch (error) {
      logger.warn(`Error communicating with MCP servers: ${error.message}`);
    }
    
    // Send real-time notification to admins
    try {
      await sendNotification({
        type: 'ADMIN_NOTIFICATION',
        title: 'New Purchase',
        message: `${user.firstName} ${user.lastName} purchased ${packageNames.join(', ')}${totalSessionsAdded ? ` (${totalSessionsAdded} sessions)` : ''}.`,
        data: {
          userId,
          type: 'purchase',
          sessions: totalSessionsAdded,
          timestamp: new Date().toISOString()
        },
        recipients: ['admin'] // Target all admins
      });
    } catch (notifyError) {
      logger.warn(`Failed to send admin notification: ${notifyError.message}`);
    }
    
  } catch (error) {
    logger.error(`Error processing completed order: ${error.message}`);
    throw error;
  }
}

/**
 * Add sessions to user account
 */
async function addSessionsToUserAccount(userId, sessions) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.error(`User not found with ID: ${userId}`);
      return;
    }
    
    // Atomic increment — prevents race conditions with concurrent purchases/bookings
    await User.increment('availableSessions', { by: sessions, where: { id: userId } });

    // Mark that the user has purchased before for analytics
    await User.update({ hasPurchasedBefore: true }, { where: { id: userId } });

    // Reload user to get updated values for socket emit
    await user.reload();
    
    // Upgrade user to client role if they purchase training
    await upgradeToClient(userId);
    
    // Send Socket.IO notification for real-time dashboard updates
    try {
      const io = global.io; // Access the Socket.IO instance from global scope
      if (io) {
        io.to('admin').emit('user_purchased_sessions', {
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          sessions,
          timestamp: new Date().toISOString()
        });
      }
    } catch (socketError) {
      logger.warn(`Failed to emit Socket.IO event: ${socketError.message}`);
    }
    
    logger.info(`Added ${sessions} sessions to user ${userId} and upgraded to client role if applicable`);
  } catch (error) {
    logger.error(`Error adding sessions to user account: ${error.message}`);
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
    // Call the Gamification MCP server to award points and badges for purchase
    const gamificationMcpUrl = process.env.GAMIFICATION_MCP_URL || 'http://localhost:8011';
    
    await axios.post(`${gamificationMcpUrl}/api/award_purchase_points`, {
      userId,
      purchaseDetails: {
        itemId: cartItem.storefrontItemId,
        itemName: cartItem.storefrontItem?.name || 'Unknown Package',
        itemType: cartItem.storefrontItem?.itemType || 'UNKNOWN',
        price: cartItem.price,
        sessions: cartItem.storefrontItem?.sessions || 0
      }
    }).catch(err => {
      logger.warn(`Failed to trigger gamification rewards: ${err.message}`);
    });
    
    logger.info(`Triggered purchase achievements for user ${userId} with item ${cartItem.storefrontItemId}`);
  } catch (error) {
    logger.warn(`Error triggering purchase achievements: ${error.message}`);
    // Don't throw the error to prevent blocking the main purchase flow
  }
}

/**
 * Create order record for order history
 */
async function createOrderRecord(cart) {
  try {
    const { default: Order } = await import('../models/Order.mjs');
    const totalAmount = cart.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderNumber = `SWAN-${Date.now().toString(36).toUpperCase().slice(-8)}`;

    await Order.create({
      userId: cart.userId,
      orderNumber,
      totalAmount,
      status: 'completed',
      paymentMethod: 'card',
      paymentAppliedAt: new Date(),
      notes: JSON.stringify({
        cartId: cart.id,
        items: cart.cartItems.map(item => ({
          itemId: item.storefrontItemId,
          quantity: item.quantity,
          price: item.price,
          name: item.storefrontItem?.name || 'Unknown Item',
        })),
      }),
    });

    logger.info(`Created order record ${orderNumber} for cart ${cart.id}`);
  } catch (error) {
    logger.error(`Error creating order record: ${error.message}`);
    // Log but don't throw to avoid blocking the purchase flow
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

export default router;
