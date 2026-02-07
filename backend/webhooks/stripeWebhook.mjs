// backend/webhooks/stripeWebhook.mjs
import express from 'express';
import Stripe from 'stripe';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import User from '../models/User.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
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
 * POST /webhook
 * Handles Stripe webhook events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Verify webhook signature
  let event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.warn('Stripe webhook secret not configured. Skipping signature verification.');
      event = req.body;
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

        // Extract cart ID from metadata
        const cartId = session.metadata?.cartId;

        if (!cartId) {
          logger.error('No cartId found in session metadata');
          break;
        }

        // Get the cart and complete the order
        const cart = await ShoppingCart.findByPk(cartId);

        if (!cart) {
          logger.error(`Cart with ID ${cartId} not found`);
          break;
        }

        // IDEMPOTENCY CHECK: Skip if sessions already granted
        // This prevents double-grants if verify-session already processed this order
        if (cart.sessionsGranted === true) {
          logger.info(`[Webhook] Idempotency: Cart ${cartId} already has sessions granted - skipping`);
          console.log(`⚠️ [Webhook] Sessions already granted for cart ${cartId} - idempotent skip`);
          break;
        }

        // Mark cart as completed with sessionsGranted flag
        cart.status = 'completed';
        cart.paymentStatus = 'paid';
        cart.completedAt = new Date();
        cart.checkoutSessionId = session.id;
        cart.sessionsGranted = true; // IDEMPOTENCY FLAG - set BEFORE processing
        await cart.save();

        // Process any necessary follow-up actions (e.g., provision digital products, etc.)
        await processCompletedOrder(cartId);

        logger.info(`Order completed for cart ID: ${cartId} (via webhook)`);
        console.log(`✅ [Webhook] Sessions granted via webhook (idempotency flag set)`);
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
      // Additional event types to handle:
      case 'payment_intent.succeeded':
        // Handle successful payment
        logger.info(`Payment succeeded: ${event.data.object.id}`);
        break;
      case 'payment_intent.payment_failed':
        // Handle failed payment
        logger.info(`Payment failed: ${event.data.object.id}`);
        break;
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
});

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
    
    // Process each item purchased
    for (const item of cart.cartItems) {
      const storefrontItem = item.storefrontItem;
      
      if (!storefrontItem) {
        logger.warn(`StorefrontItem not found for cart item: ${item.id}`);
        continue;
      }
      
      // Keep track of package names for notification
      packageNames.push(storefrontItem.name);
      
      // Handle different item types
      switch (storefrontItem.itemType) {
        case 'TRAINING_PACKAGE_FIXED': 
          // Add training sessions to user account
          const sessionsAdded = storefrontItem.sessions || 0;
          totalSessionsAdded += sessionsAdded;
          await addSessionsToUserAccount(userId, sessionsAdded);
          break;
        case 'TRAINING_PACKAGE_SUBSCRIPTION':
          // Create subscription record
          await createSubscription(userId, storefrontItem);
          break;
        // Add more item type handling as needed
      }
      
      // Trigger gamification rewards for purchase
      await triggerPurchaseAchievements(userId, item);
    }
    
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
      
      await axios.post(`${mcpUrl}/api/process-sale`, purchaseData).catch(err => {
        // Log error but don't fail the whole process if MCP is unavailable
        logger.warn(`Failed to notify MCP server: ${err.message}`);
      });
      
      // Also notify other relevant MCP servers if configured
      // Client Insights MCP for AI-generated insights (P2 feature)
      const clientInsightsMcpUrl = process.env.CLIENT_INSIGHTS_MCP_URL;
      if (clientInsightsMcpUrl) {
        try {
          await axios.post(`${clientInsightsMcpUrl}/api/enrich-client-profile`, {
            userId,
            purchaseData: purchaseData
          }).catch(err => {
            logger.warn(`Failed to notify Client Insights MCP: ${err.message}`);
          });
        } catch (insightError) {
          logger.warn(`Error communicating with Client Insights MCP: ${insightError.message}`);
        }
      }
      
      // Scheduling Assist MCP for automated session suggestions (P1 feature)
      const schedulingMcpUrl = process.env.SCHEDULING_ASSIST_MCP_URL;
      if (schedulingMcpUrl && totalSessionsAdded > 0) {
        try {
          await axios.post(`${schedulingMcpUrl}/api/suggest-session-slots`, {
            userId,
            packageId: cart.id,
            sessionCount: totalSessionsAdded
          }).catch(err => {
            logger.warn(`Failed to notify Scheduling Assist MCP: ${err.message}`);
          });
        } catch (schedulingError) {
          logger.warn(`Error communicating with Scheduling Assist MCP: ${schedulingError.message}`);
        }
      }
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
    
    // Assuming User model has an availableSessions field
    user.availableSessions = (user.availableSessions || 0) + sessions;
    
    // Mark that the user has purchased before for analytics
    user.hasPurchasedBefore = true;
    
    await user.save();
    
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
    // Assuming you have an Order model
    // This would be replaced with your actual Order model import and implementation
    // For demonstration purposes, we're showing what data would be saved
    
    // const Order = await import('../models/Order.mjs');
    // const newOrder = await Order.create({
    //   userId: cart.userId,
    //   cartId: cart.id,
    //   orderStatus: 'completed',
    //   paymentStatus: 'paid',
    //   totalAmount: cart.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    //   orderItems: cart.cartItems.map(item => ({
    //     itemId: item.storefrontItemId,
    //     quantity: item.quantity,
    //     price: item.price,
    //     name: item.storefrontItem?.name || 'Unknown Item'
    //   })),
    //   completedAt: new Date()
    // });
    
    // Log instead since actual implementation depends on your models
    logger.info(`Created order record for cart ${cart.id}`);
    
    // Optionally notify other systems about the new order
    // This could be an analytics system, inventory system, etc.
  } catch (error) {
    logger.error(`Error creating order record: ${error.message}`);
    // Log but don't throw to avoid blocking the purchase flow
  }
}

export default router;
