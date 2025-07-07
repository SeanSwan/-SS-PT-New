/**
 * Professional-Grade Checkout Routes - SwanStudios 7-Star Experience
 * ================================================================
 * AA-Grade checkout system with intelligent payment strategy routing
 * Customer data capture with manual payment fallback integration
 * 
 * Features:
 * ✅ PaymentService Strategy Pattern Integration
 * ✅ Automatic Stripe → Manual Payment Fallback
 * ✅ Customer Data Capture for All Payment Attempts
 * ✅ Admin Dashboard Integration for Manual Processing
 * ✅ Professional Error Handling & User Experience
 * ✅ Real-time Payment Status Tracking
 * 
 * Master Prompt v33 Compliance: Production-Ready Payment Processing
 */

import express from 'express';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import User from '../models/User.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import paymentService from '../services/payment/PaymentService.mjs';

const router = express.Router();

/**
 * Enhanced cart validation with detailed error reporting
 */
const validateCartForCheckout = async (userId) => {
  try {
    const cart = await ShoppingCart.findOne({
      where: { userId, status: 'active' },
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
      return { valid: false, error: 'No active cart found', cart: null };
    }

    if (!cart.cartItems || cart.cartItems.length === 0) {
      return { valid: false, error: 'Cart is empty', cart: null };
    }

    // Validate all cart items have valid storefront items
    const invalidItems = cart.cartItems.filter(item => !item.storefrontItem);
    if (invalidItems.length > 0) {
      return {
        valid: false,
        error: `Invalid items in cart: ${invalidItems.map(i => i.id).join(', ')}`,
        cart: null
      };
    }

    // Calculate totals
    const subtotal = cart.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + tax;

    return {
      valid: true,
      cart,
      totals: { subtotal, tax, total }
    };
  } catch (error) {
    logger.error('Cart validation error:', error);
    return { valid: false, error: 'Cart validation failed', cart: null };
  }
};

/**
 * Create pending order record for manual payment processing
 */
const createPendingOrder = async (userId, cart, totals, paymentMethod = 'manual') => {
  try {
    // Get user information
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create order record with pending status
    const orderData = {
      userId,
      status: 'pending_manual_payment',
      paymentStatus: 'pending_manual_payment',
      paymentMethod,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      customerInfo: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone || null
      },
      items: cart.cartItems.map(item => ({
        id: item.storefrontItem.id,
        name: item.storefrontItem.name,
        quantity: item.quantity,
        price: item.price,
        sessions: item.storefrontItem.sessions || null
      })),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    // Update cart with order information
    await cart.update({
      status: 'pending_payment',
      paymentStatus: 'pending_manual_payment',
      customerInfo: JSON.stringify(orderData.customerInfo),
      orderMetadata: JSON.stringify(orderData)
    });

    logger.info(`Created pending order for user ${userId}, cart ${cart.id}`);
    
    return {
      success: true,
      orderId: cart.id,
      orderReference: `SWAN-${cart.id}`,
      orderData
    };
  } catch (error) {
    logger.error('Error creating pending order:', error);
    throw error;
  }
};

/**
 * POST /checkout - 7-Star Professional Checkout Experience
 * ========================================================
 * Intelligent payment routing with customer data capture
 * Stripe primary → Manual payment fallback with admin integration
 */
router.post('/checkout', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethod = 'auto' } = req.body; // 'auto', 'stripe', 'manual'
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    logger.info(`🛒 Starting 7-star checkout for user ${userId} with method: ${paymentMethod}`);

    // Validate cart
    const validation = await validateCartForCheckout(userId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        code: 'INVALID_CART'
      });
    }

    const { cart, totals } = validation;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Prepare payment parameters
    const paymentParams = {
      amount: totals.total,
      currency: 'usd',
      userId,
      cartId: cart.id,
      customer: {
        id: userId,
        email: req.user.email,
        name: `${req.user.firstName} ${req.user.lastName}`
      },
      items: cart.cartItems.map(item => ({
        name: item.storefrontItem.name,
        description: item.storefrontItem.description,
        price: item.price,
        quantity: item.quantity,
        sessions: item.storefrontItem.sessions
      })),
      successUrl: `${baseUrl}/checkout/CheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/checkout/CheckoutCancel?cart_id=${cart.id}`,
      metadata: {
        cartId: cart.id,
        userId,
        orderType: 'training_package'
      }
    };

    try {
      // Attempt primary payment strategy (Stripe Checkout)
      if (paymentMethod === 'auto' || paymentMethod === 'stripe') {
        logger.info(`💳 Attempting Stripe checkout for user ${userId}`);
        
        const paymentResult = await paymentService.createPaymentIntent(paymentParams);
        
        if (paymentResult.success && paymentResult.checkoutUrl) {
          logger.info(`✅ Stripe checkout created successfully: ${paymentResult.paymentIntentId}`);
          
          // Update cart with Stripe session info
          await cart.update({
            status: 'checkout_session_created',
            checkoutSessionId: paymentResult.paymentIntentId,
            paymentStatus: 'pending'
          });
          
          return res.status(200).json({
            success: true,
            method: 'stripe_checkout',
            checkoutUrl: paymentResult.checkoutUrl,
            sessionId: paymentResult.paymentIntentId,
            message: 'Stripe checkout session created successfully'
          });
        }
      }
      
      // Fallback to manual payment
      logger.info(`🔄 Falling back to manual payment for user ${userId}`);
      
    } catch (stripeError) {
      logger.warn(`Stripe checkout failed, falling back to manual: ${stripeError.message}`);
    }

    // Manual Payment Fallback - ALWAYS capture customer data
    logger.info(`📝 Creating manual payment order for user ${userId}`);
    
    const pendingOrder = await createPendingOrder(userId, cart, totals, 'manual');
    
    if (!pendingOrder.success) {
      throw new Error('Failed to create pending order');
    }

    // Manual payment success response
    return res.status(200).json({
      success: true,
      method: 'manual_payment',
      orderId: pendingOrder.orderId,
      orderReference: pendingOrder.orderReference,
      message: 'Order created successfully - Manual payment required',
      nextSteps: {
        title: 'Complete Your Payment',
        description: 'We\'ve received your order and will contact you with payment instructions.',
        actions: [
          'Check your email for payment instructions',
          'Our team will contact you within 24 hours',
          'Payment can be completed via bank transfer or phone'
        ]
      },
      customerInfo: pendingOrder.orderData.customerInfo,
      paymentInstructions: {
        title: 'Complete Your SwanStudios Payment',
        methods: [
          {
            method: 'contact',
            title: 'Contact Our Team',
            description: 'Speak with our payment specialist for assistance',
            details: {
              email: process.env.CONTACT_EMAIL || 'support@swanstudios.com',
              phone: process.env.OWNER_PHONE || 'Contact Admin',
              hours: 'Monday-Friday 9AM-6PM EST'
            }
          },
          {
            method: 'bank_transfer',
            title: 'Bank Transfer (ACH)',
            description: 'Direct bank transfer - lowest fees',
            details: {
              accountName: 'SwanStudios Training',
              memo: `Payment for ${pendingOrder.orderReference}`
            }
          }
        ]
      }
    });

  } catch (error) {
    logger.error('💥 Critical checkout error:', error);
    
    // Even in error, try to capture customer intent
    try {
      const validation = await validateCartForCheckout(req.user.id);
      if (validation.valid) {
        await createPendingOrder(req.user.id, validation.cart, validation.totals, 'error_fallback');
        logger.info(`📋 Customer intent captured despite checkout error for user ${req.user.id}`);
      }
    } catch (fallbackError) {
      logger.error('Failed to capture customer intent:', fallbackError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Checkout process encountered an error',
      code: 'CHECKOUT_ERROR',
      fallback: {
        message: 'Please contact our support team to complete your order',
        email: process.env.CONTACT_EMAIL || 'support@swanstudios.com',
        phone: process.env.OWNER_PHONE || 'Contact Admin'
      }
    });
  }
});

/**
 * GET /payment-status/:orderId - Check payment status
 * Professional payment tracking for admin dashboard integration
 */
router.get('/payment-status/:orderId', protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Find the cart/order
    const cart = await ShoppingCart.findOne({
      where: { 
        id: orderId,
        userId // Ensure user can only check their own orders
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
        message: 'Order not found'
      });
    }

    // Check payment status via PaymentService if there's a checkout session
    let paymentStatus = {
      status: cart.paymentStatus || 'unknown',
      method: cart.paymentMethod || 'unknown'
    };

    if (cart.checkoutSessionId) {
      try {
        const stripeStatus = await paymentService.getPaymentStatus(cart.checkoutSessionId);
        if (stripeStatus.success) {
          paymentStatus = stripeStatus;
        }
      } catch (error) {
        logger.warn(`Could not fetch Stripe status for ${cart.checkoutSessionId}:`, error.message);
      }
    }

    res.json({
      success: true,
      orderId: cart.id,
      orderReference: `SWAN-${cart.id}`,
      status: cart.status,
      paymentStatus: paymentStatus.status,
      paymentMethod: paymentStatus.method,
      total: cart.total,
      items: cart.cartItems?.map(item => ({
        name: item.storefrontItem?.name || 'Unknown Item',
        quantity: item.quantity,
        price: item.price
      })) || [],
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt
    });

  } catch (error) {
    logger.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status'
    });
  }
});

/**
 * POST /confirm-payment - Admin endpoint to confirm manual payments
 * Used by PendingOrdersAdminPanel to mark payments as complete
 */
router.post('/confirm-payment', protect, async (req, res) => {
  try {
    const { paymentIntentId, adminNotes, verifiedBy } = req.body;
    
    // Check if user has admin permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Find the cart/order
    const cart = await ShoppingCart.findOne({
      where: {
        $or: [
          { id: paymentIntentId },
          { checkoutSessionId: paymentIntentId }
        ]
      }
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Update payment status
    await cart.update({
      status: 'completed',
      paymentStatus: 'paid',
      completedAt: new Date(),
      adminNotes: adminNotes || 'Manually verified by admin',
      verifiedBy: verifiedBy || req.user.email
    });

    logger.info(`💰 Payment manually confirmed by admin ${req.user.email} for order ${cart.id}`);

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      orderId: cart.id,
      orderReference: `SWAN-${cart.id}`,
      verifiedBy: req.user.email,
      verifiedAt: new Date()
    });

  } catch (error) {
    logger.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment'
    });
  }
});

/**
 * GET /service-status - Payment service health check
 * Provides real-time status of payment processing capabilities
 */
router.get('/service-status', async (req, res) => {
  try {
    const serviceStatus = paymentService.getServiceStatus();
    const healthCheck = await paymentService.performHealthCheck();
    
    res.json({
      success: true,
      service: serviceStatus,
      health: healthCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting payment service status:', error);
    res.status(500).json({
      success: false,
      message: 'Payment service status unavailable'
    });
  }
});

export default router;