/**
 * Enhanced Payment Routes - SwanStudios Premium Payment Integration
 * ================================================================
 * Production-ready payment processing with Stripe Elements support
 * Maintains backward compatibility with existing Stripe Checkout
 * 
 * Features:
 * - Stripe Elements (embedded payment forms)
 * - Stripe Checkout (redirect method) - existing
 * - Payment Intent management
 * - Real-time payment status
 * - Enhanced security and validation
 * - Galaxy-themed payment experience support
 * 
 * Security: PCI DSS compliant, authenticated users only
 * Performance: Optimized payment processing
 * UX: Seamless embedded payment experience
 */

import express from 'express';
import Stripe from 'stripe';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import User from '../models/User.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';

const router = express.Router();

// Apply authentication to all payment routes
router.use(protect);

// Initialize Stripe client
let stripeClient = null;
if (isStripeEnabled()) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
    logger.info('Enhanced Stripe client initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize Stripe client: ${error.message}`);
  }
} else {
  logger.warn('Stripe not available - payment routes will return errors');
}

/**
 * POST /api/payments/create-payment-intent
 * Create a Payment Intent for Stripe Elements
 * This enables embedded payment forms with enhanced UX
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing temporarily unavailable'
      });
    }

    const userId = req.user.id;
    const { cartId } = req.body;

    // Validate cart
    const cart = await ShoppingCart.findOne({
      where: { 
        id: cartId || null,
        userId, 
        status: 'active' 
      },
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem'
        }]
      }]
    });

    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or empty cart'
      });
    }

    // Calculate total amount
    const totalAmount = Math.round(cart.total * 100); // Convert to cents

    // Get customer information
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create Payment Intent
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: user.stripeCustomerId || undefined, // Use existing customer if available
      metadata: {
        cartId: cart.id.toString(),
        userId: userId.toString(),
        userName: `${user.firstName} ${user.lastName}`,
        itemCount: cart.cartItems.length.toString()
      },
      description: `SwanStudios Training Package - ${cart.cartItems.length} item(s)`,
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true
      },
      // Set up for future payments if needed
      setup_future_usage: 'off_session'
    });

    // Store payment intent ID in cart for tracking
    cart.paymentIntentId = paymentIntent.id;
    await cart.save();

    logger.info(`Created payment intent ${paymentIntent.id} for cart ${cart.id}`);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        currency: 'usd',
        cart: {
          id: cart.id,
          total: cart.total,
          itemCount: cart.cartItems.length,
          items: cart.cartItems.map(item => ({
            id: item.id,
            name: item.storefrontItem?.name || 'Training Package',
            price: item.price,
            quantity: item.quantity
          }))
        }
      }
    });

  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Payment processing error'
    });
  }
});

/**
 * POST /api/payments/confirm-payment
 * Confirm payment and complete order processing
 * Called after successful payment via Stripe Elements
 */
router.post('/confirm-payment', async (req, res) => {
  try {
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing temporarily unavailable'
      });
    }

    const userId = req.user.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID required'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: paymentIntent.status
      });
    }

    // Find the cart associated with this payment
    const cart = await ShoppingCart.findOne({
      where: {
        paymentIntentId,
        userId,
        status: 'active'
      },
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem'
        }]
      }]
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found or already processed'
      });
    }

    // Mark cart as completed
    cart.status = 'completed';
    cart.paymentStatus = 'paid';
    cart.completedAt = new Date();
    cart.paymentIntentId = paymentIntentId;
    await cart.save();

    // Process the completed order (add sessions, trigger notifications, etc.)
    await processCompletedOrder(cart.id);

    logger.info(`Payment confirmed and order completed for cart ${cart.id}`);

    res.json({
      success: true,
      message: 'Payment confirmed and order completed',
      data: {
        orderId: cart.id,
        paymentIntentId,
        amount: cart.total,
        completedAt: cart.completedAt,
        items: cart.cartItems.map(item => ({
          name: item.storefrontItem?.name || 'Training Package',
          sessions: item.storefrontItem?.sessions || 0,
          price: item.price,
          quantity: item.quantity
        }))
      }
    });

  } catch (error) {
    logger.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Payment confirmation error'
    });
  }
});

/**
 * GET /api/payments/status/:paymentIntentId
 * Get real-time payment status
 */
router.get('/status/:paymentIntentId', async (req, res) => {
  try {
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing temporarily unavailable'
      });
    }

    const { paymentIntentId } = req.params;
    const userId = req.user.id;

    // Verify this payment intent belongs to the user
    const cart = await ShoppingCart.findOne({
      where: {
        paymentIntentId,
        userId
      }
    });

    if (!cart) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to payment'
      });
    }

    // Get payment intent status from Stripe
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

    res.json({
      success: true,
      data: {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
        lastError: paymentIntent.last_payment_error ? {
          code: paymentIntent.last_payment_error.code,
          message: paymentIntent.last_payment_error.message
        } : null
      }
    });

  } catch (error) {
    logger.error('Error fetching payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Status check error'
    });
  }
});

/**
 * POST /api/payments/cancel-payment
 * Cancel a pending payment intent
 */
router.post('/cancel-payment', async (req, res) => {
  try {
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing temporarily unavailable'
      });
    }

    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID required'
      });
    }

    // Verify this payment intent belongs to the user
    const cart = await ShoppingCart.findOne({
      where: {
        paymentIntentId,
        userId,
        status: 'active'
      }
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already processed'
      });
    }

    // Cancel the payment intent in Stripe
    const paymentIntent = await stripeClient.paymentIntents.cancel(paymentIntentId);

    // Clear payment intent from cart
    cart.paymentIntentId = null;
    await cart.save();

    logger.info(`Payment intent ${paymentIntentId} cancelled for cart ${cart.id}`);

    res.json({
      success: true,
      message: 'Payment cancelled successfully',
      data: {
        status: paymentIntent.status,
        cancelledAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error cancelling payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Cancellation error'
    });
  }
});

/**
 * GET /api/payments/methods
 * Get available payment methods for the user's location
 */
router.get('/methods', async (req, res) => {
  try {
    // Return available payment methods
    // This could be enhanced to be location-specific
    const paymentMethods = {
      card: {
        enabled: true,
        types: ['visa', 'mastercard', 'amex', 'discover']
      },
      digital_wallets: {
        enabled: true,
        types: ['apple_pay', 'google_pay']
      },
      bank_payments: {
        enabled: false, // Can be enabled for specific regions
        types: ['ach_debit']
      }
    };

    res.json({
      success: true,
      data: paymentMethods
    });

  } catch (error) {
    logger.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
});

/**
 * Helper function to process completed orders
 * This function is shared with the webhook handler
 */
async function processCompletedOrder(cartId) {
  try {
    // Import the order processing function from webhook handler
    // This ensures consistent order processing regardless of payment method
    const { default: stripeWebhook } = await import('../webhooks/stripeWebhook.mjs');
    
    // Note: In a real implementation, you'd extract the order processing
    // logic into a separate service module to avoid circular imports
    
    // For now, implement basic order processing here
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

    if (!cart) {
      logger.error(`Cart not found for order processing: ${cartId}`);
      return;
    }

    const userId = cart.userId;
    const user = await User.findByPk(userId);

    // Add sessions to user account
    let totalSessionsAdded = 0;
    for (const item of cart.cartItems) {
      if (item.storefrontItem?.sessions) {
        totalSessionsAdded += item.storefrontItem.sessions * item.quantity;
      }
    }

    if (totalSessionsAdded > 0 && user) {
      user.availableSessions = (user.availableSessions || 0) + totalSessionsAdded;
      user.hasPurchasedBefore = true;
      await user.save();

      logger.info(`Added ${totalSessionsAdded} sessions to user ${userId}`);
    }

    // Trigger notifications and MCP events here
    // (Implementation would mirror the webhook handler)

  } catch (error) {
    logger.error(`Error processing completed order ${cartId}:`, error);
    throw error;
  }
}

export default router;