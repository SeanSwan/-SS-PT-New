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
        
        // Mark cart as completed
        cart.status = 'completed';
        cart.paymentStatus = 'paid';
        cart.completedAt = new Date();
        cart.checkoutSessionId = session.id;
        await cart.save();
        
        // Process any necessary follow-up actions (e.g., provision digital products, etc.)
        await processCompletedOrder(cartId);
        
        logger.info(`Order completed for cart ID: ${cartId}`);
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
    
    // Process each item purchased
    for (const item of cart.cartItems) {
      const storefrontItem = item.storefrontItem;
      
      if (!storefrontItem) {
        logger.warn(`StorefrontItem not found for cart item: ${item.id}`);
        continue;
      }
      
      // Handle different item types
      switch (storefrontItem.itemType) {
        case 'TRAINING_PACKAGE_FIXED': 
          // Add training sessions to user account
          await addSessionsToUserAccount(userId, storefrontItem.sessions || 0);
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
    await user.save();
    
    // Upgrade user to client role if they purchase training
    await upgradeToClient(userId);
    
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
  // To be implemented based on your gamification model
  logger.info(`Triggering purchase achievements for user ${userId}`);
}

/**
 * Create order record for order history
 */
async function createOrderRecord(cart) {
  // To be implemented based on your Order model
  logger.info(`Creating order record for cart ${cart.id}`);
}

export default router;
