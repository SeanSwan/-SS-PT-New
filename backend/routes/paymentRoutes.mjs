/**
 * Enhanced Payment Routes - SwanStudios Premium Payment Integration
 * ================================================================
 * Production-ready payment processing with improved error handling for Render deployment
 * Maintains backward compatibility with existing Stripe Checkout
 * 
 * Features:
 * - Stripe Elements (embedded payment forms)
 * - Stripe Checkout (redirect method) - existing
 * - Payment Intent management
 * - Real-time payment status
 * - Enhanced security and validation
 * - Comprehensive error handling for 503 prevention
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

/**
 * Public diagnostics endpoint (no auth required)
 * GET /api/payments/diagnostics
 * Provides system configuration status for debugging payment issues
 */
router.get('/diagnostics', async (req, res) => {
  try {
    // Dynamically import diagnostics to avoid startup issues
    const { diagnosticsHandler } = await import('../utils/environmentDiagnostics.mjs');
    return diagnosticsHandler(req, res);
  } catch (error) {
    logger.error('Diagnostics module error:', error);
    res.status(500).json({
      success: false,
      message: 'Diagnostics unavailable',
      error: {
        code: 'DIAGNOSTICS_MODULE_ERROR',
        details: 'Diagnostics module could not be loaded'
      }
    });
  }
});

// Apply authentication to all other payment routes
router.use(protect);

// Initialize Stripe client with comprehensive error handling
let stripeClient = null;
let stripeInitializationError = null;

const initializeStripe = () => {
  try {
    if (isStripeEnabled() && process.env.STRIPE_SECRET_KEY) {
      stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16'
      });
      logger.info('Enhanced Stripe client initialized successfully');
      return true;
    } else {
      const reason = !process.env.STRIPE_SECRET_KEY ? 'Missing STRIPE_SECRET_KEY' : 'Stripe not enabled';
      stripeInitializationError = `Stripe initialization failed: ${reason}`;
      logger.warn(stripeInitializationError);
      return false;
    }
  } catch (error) {
    stripeInitializationError = `Failed to initialize Stripe client: ${error.message}`;
    logger.error(stripeInitializationError);
    return false;
  }
};

// Initialize Stripe on module load
const stripeReady = initializeStripe();

/**
 * Middleware to check Stripe availability and provide helpful error responses
 */
const checkStripeAvailability = (req, res, next) => {
  if (!stripeClient || !stripeReady) {
    return res.status(503).json({
      success: false,
      message: 'Payment processing temporarily unavailable',
      error: {
        code: 'PAYMENT_SERVICE_UNAVAILABLE',
        details: stripeInitializationError || 'Payment service not configured',
        retryAfter: 300, // 5 minutes
        supportContact: 'support@swanstudios.com'
      },
      fallbackOptions: [
        {
          method: 'contact',
          description: 'Contact our support team to complete your purchase',
          contact: 'support@swanstudios.com'
        },
        {
          method: 'retry',
          description: 'Try again in a few minutes',
          retryAfter: 300
        }
      ]
    });
  }
  next();
};

/**
 * Health check endpoint for payment system
 */
router.get('/health', (req, res) => {
  const health = {
    status: stripeReady ? 'healthy' : 'degraded',
    stripe: {
      available: stripeReady,
      error: stripeInitializationError
    },
    timestamp: new Date().toISOString()
  };

  res.status(stripeReady ? 200 : 503).json({
    success: true,
    data: health
  });
});

/**
 * Simple status endpoint (no dependencies)
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'payment_service_running',
    timestamp: new Date().toISOString(),
    stripe_configured: stripeReady
  });
});

/**
 * POST /api/payments/create-payment-intent
 * Create a Payment Intent for Stripe Elements
 * This enables embedded payment forms with enhanced UX
 */
router.post('/create-payment-intent', checkStripeAvailability, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartId } = req.body;

    logger.info(`Creating payment intent for user ${userId}, cart ${cartId}`);

    // Validate cart with comprehensive error handling
    let cart;
    try {
      cart = await ShoppingCart.findOne({
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
    } catch (dbError) {
      logger.error(`Database error while fetching cart: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to access cart data',
        error: {
          code: 'DATABASE_ERROR',
          details: 'Cart validation failed'
        }
      });
    }

    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or empty cart',
        error: {
          code: 'INVALID_CART',
          details: 'Cart not found or contains no items'
        }
      });
    }

    // Calculate total amount with validation
    const totalAmount = Math.round(cart.total * 100); // Convert to cents
    
    if (totalAmount < 50) { // $0.50 minimum for Stripe
      return res.status(400).json({
        success: false,
        message: 'Order total too small',
        error: {
          code: 'AMOUNT_TOO_SMALL',
          details: 'Minimum order amount is $0.50'
        }
      });
    }

    // Get customer information with error handling
    let user;
    try {
      user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: {
            code: 'USER_NOT_FOUND',
            details: 'Authentication user not found in database'
          }
        });
      }
    } catch (dbError) {
      logger.error(`Database error while fetching user: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to access user data',
        error: {
          code: 'DATABASE_ERROR',
          details: 'User validation failed'
        }
      });
    }

    // Create Payment Intent with comprehensive error handling
    let paymentIntent;
    try {
      paymentIntent = await stripeClient.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        customer: user.stripeCustomerId || undefined,
        metadata: {
          cartId: cart.id.toString(),
          userId: userId.toString(),
          userName: `${user.firstName} ${user.lastName}`,
          itemCount: cart.cartItems.length.toString()
        },
        description: `SwanStudios Training Package - ${cart.cartItems.length} item(s)`,
        automatic_payment_methods: {
          enabled: true
        },
        setup_future_usage: 'off_session'
      });
    } catch (stripeError) {
      logger.error(`Stripe error creating payment intent: ${stripeError.message}`);
      
      // Handle specific Stripe errors
      let errorMessage = 'Failed to create payment intent';
      let errorCode = 'STRIPE_ERROR';
      
      if (stripeError.type === 'StripeCardError') {
        errorMessage = 'Card was declined';
        errorCode = 'CARD_DECLINED';
      } else if (stripeError.type === 'StripeRateLimitError') {
        errorMessage = 'Too many requests, please try again later';
        errorCode = 'RATE_LIMITED';
      } else if (stripeError.type === 'StripeInvalidRequestError') {
        errorMessage = 'Invalid payment request';
        errorCode = 'INVALID_REQUEST';
      } else if (stripeError.type === 'StripeAPIError') {
        errorMessage = 'Payment service temporarily unavailable';
        errorCode = 'SERVICE_UNAVAILABLE';
      } else if (stripeError.type === 'StripeConnectionError') {
        errorMessage = 'Network error, please check your connection';
        errorCode = 'CONNECTION_ERROR';
      }

      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: {
          code: errorCode,
          details: process.env.NODE_ENV === 'development' ? stripeError.message : 'Payment processing error',
          retryable: ['RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'CONNECTION_ERROR'].includes(errorCode)
        }
      });
    }

    // Store payment intent ID in cart for tracking
    try {
      cart.paymentIntentId = paymentIntent.id;
      await cart.save();
    } catch (dbError) {
      logger.error(`Database error saving payment intent ID: ${dbError.message}`);
      // Don't fail the request if we can't save the ID, but log it
    }

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
    logger.error('Unexpected error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  }
});

/**
 * POST /api/payments/confirm-payment
 * Confirm payment and complete order processing
 * Called after successful payment via Stripe Elements
 */
router.post('/confirm-payment', checkStripeAvailability, async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID required',
        error: {
          code: 'MISSING_PAYMENT_INTENT_ID',
          details: 'paymentIntentId is required'
        }
      });
    }

    // Retrieve payment intent from Stripe with error handling
    let paymentIntent;
    try {
      paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeError) {
      logger.error(`Stripe error retrieving payment intent: ${stripeError.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment intent',
        error: {
          code: 'INVALID_PAYMENT_INTENT',
          details: 'Payment intent not found or inaccessible'
        }
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: paymentIntent.status,
        error: {
          code: 'PAYMENT_NOT_COMPLETED',
          details: `Payment status: ${paymentIntent.status}`
        }
      });
    }

    // Find the cart associated with this payment
    let cart;
    try {
      cart = await ShoppingCart.findOne({
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
    } catch (dbError) {
      logger.error(`Database error while fetching cart for confirmation: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to access cart data',
        error: {
          code: 'DATABASE_ERROR',
          details: 'Cart confirmation failed'
        }
      });
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found or already processed',
        error: {
          code: 'CART_NOT_FOUND',
          details: 'Associated cart not found or already completed'
        }
      });
    }

    // Mark cart as completed
    try {
      cart.status = 'completed';
      cart.paymentStatus = 'paid';
      cart.completedAt = new Date();
      cart.paymentIntentId = paymentIntentId;
      await cart.save();

      // Process the completed order (add sessions, trigger notifications, etc.)
      await processCompletedOrder(cart.id);
    } catch (dbError) {
      logger.error(`Database error while completing order: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to complete order',
        error: {
          code: 'ORDER_COMPLETION_ERROR',
          details: 'Order processing failed'
        }
      });
    }

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
    logger.error('Unexpected error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  }
});

/**
 * GET /api/payments/status/:paymentIntentId
 * Get real-time payment status
 */
router.get('/status/:paymentIntentId', checkStripeAvailability, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const userId = req.user.id;

    // Verify this payment intent belongs to the user
    let cart;
    try {
      cart = await ShoppingCart.findOne({
        where: {
          paymentIntentId,
          userId
        }
      });
    } catch (dbError) {
      logger.error(`Database error while checking payment ownership: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to verify payment ownership',
        error: {
          code: 'DATABASE_ERROR',
          details: 'Payment verification failed'
        }
      });
    }

    if (!cart) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to payment',
        error: {
          code: 'UNAUTHORIZED_PAYMENT_ACCESS',
          details: 'Payment does not belong to authenticated user'
        }
      });
    }

    // Get payment intent status from Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeError) {
      logger.error(`Stripe error retrieving payment status: ${stripeError.message}`);
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve payment status',
        error: {
          code: 'PAYMENT_STATUS_ERROR',
          details: 'Payment status unavailable'
        }
      });
    }

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
    logger.error('Unexpected error fetching payment status:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  }
});

/**
 * POST /api/payments/cancel-payment
 * Cancel a pending payment intent
 */
router.post('/cancel-payment', checkStripeAvailability, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID required',
        error: {
          code: 'MISSING_PAYMENT_INTENT_ID',
          details: 'paymentIntentId is required'
        }
      });
    }

    // Verify this payment intent belongs to the user
    let cart;
    try {
      cart = await ShoppingCart.findOne({
        where: {
          paymentIntentId,
          userId,
          status: 'active'
        }
      });
    } catch (dbError) {
      logger.error(`Database error while checking payment for cancellation: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to verify payment for cancellation',
        error: {
          code: 'DATABASE_ERROR',
          details: 'Payment cancellation verification failed'
        }
      });
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already processed',
        error: {
          code: 'PAYMENT_NOT_FOUND',
          details: 'Payment not found or not eligible for cancellation'
        }
      });
    }

    // Cancel the payment intent in Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripeClient.paymentIntents.cancel(paymentIntentId);
    } catch (stripeError) {
      logger.error(`Stripe error cancelling payment intent: ${stripeError.message}`);
      return res.status(400).json({
        success: false,
        message: 'Unable to cancel payment',
        error: {
          code: 'PAYMENT_CANCELLATION_ERROR',
          details: 'Payment cancellation failed'
        }
      });
    }

    // Clear payment intent from cart
    try {
      cart.paymentIntentId = null;
      await cart.save();
    } catch (dbError) {
      logger.error(`Database error clearing payment intent: ${dbError.message}`);
      // Don't fail the request, but log the error
    }

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
    logger.error('Unexpected error cancelling payment:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  }
});

/**
 * GET /api/payments/methods
 * Get available payment methods for the user's location
 */
router.get('/methods', (req, res) => {
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
      message: 'Failed to fetch payment methods',
      error: {
        code: 'INTERNAL_ERROR',
        details: 'Payment methods unavailable'
      }
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
