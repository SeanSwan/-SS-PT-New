/**
 * v2PaymentRoutes.mjs - Genesis Payment System Backend
 * ===================================================
 * 
 * THE SINGLE, CLEAN PAYMENT ENDPOINT - Master Prompt v35 Compliance
 * 
 * Core Philosophy: SIMPLICITY & RELIABILITY
 * - ONE endpoint: POST /api/v2/payments/create-checkout-session
 * - Stripe Checkout ONLY (redirect method)
 * - Admin dashboard connectivity guaranteed
 * - Customer data capture (ALWAYS)
 * - PCI compliance through Stripe
 * - Zero breaking changes
 * 
 * Features:
 * ✅ Single Stripe Checkout Session creation
 * ✅ Customer data storage for admin dashboard
 * ✅ Session management integration
 * ✅ Financial analytics data flow
 * ✅ Error handling & logging
 * ✅ Production-ready security
 * ✅ PostgreSQL integration
 * 
 * Admin Dashboard Integration:
 * - Populates financial analytics
 * - Records customer transactions
 * - Enables order management
 * - Supports revenue tracking
 */

import express from 'express';
import Stripe from 'stripe';
import { protect } from '../middleware/authMiddleware.mjs';
// 🎯 P0 FIX: Use coordinated model getters to prevent race condition
import { getShoppingCart, getCartItem, getStorefrontItem, getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Initialize Stripe with error handling
let stripe = null;
try {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    logger.error('[v2 Payment] STRIPE_SECRET_KEY not found in environment variables');
  } else {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
    logger.info('[v2 Payment] Stripe client initialized successfully');
  }
} catch (error) {
  logger.error('[v2 Payment] Stripe initialization failed:', error.message);
}

/**
 * Middleware to check Stripe availability
 */
const checkStripeAvailability = (req, res, next) => {
  if (!stripe) {
    return res.status(503).json({
      success: false,
      message: 'Payment processing temporarily unavailable',
      error: {
        code: 'STRIPE_UNAVAILABLE',
        details: 'Stripe service not initialized'
      }
    });
  }
  next();
};

/**
 * POST /api/v2/payments/create-checkout-session
 * 
 * THE ONLY PAYMENT ENDPOINT - Creates Stripe Checkout Session
 * 
 * Flow:
 * 1. Validate user and cart
 * 2. Create Stripe Customer (if needed)
 * 3. Create Stripe Checkout Session
 * 4. Store customer data for admin dashboard
 * 5. Return checkout URL for redirect
 * 
 * Admin Dashboard Integration:
 * - Customer data stored in Users table
 * - Order data available for analytics
 * - Financial transaction tracking
 */
router.post('/create-checkout-session', protect, checkStripeAvailability, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartId, customerInfo, metadata } = req.body;

    logger.info(`[v2 Payment] Creating checkout session for user ${userId}`);
    console.log('🚀 [v2 Payment] Genesis Checkout Session Creation Starting...');

    // 🎯 P0 FIX: Get fully associated models from coordinated cache
    let ShoppingCart, CartItem, StorefrontItem, User;
    try {
      console.log('🔍 [DEBUG] Loading coordinated models with associations...');
      ShoppingCart = getShoppingCart();
      CartItem = getCartItem();
      StorefrontItem = getStorefrontItem();
      User = getUser();
      
      console.log('✅ [DEBUG] Coordinated models loaded successfully');
      console.log('🔍 [DEBUG] ShoppingCart associations:', Object.keys(ShoppingCart.associations || {}));
      console.log('🔍 [DEBUG] CartItem associations:', Object.keys(CartItem.associations || {}));
    } catch (debugError) {
      console.error('❌ [DEBUG] Coordinated model loading failed:', debugError.message);
      throw new Error('Models not properly initialized. Server may still be starting up.');
    }

    // Step 1: Validate and fetch cart data
    console.log('🔍 [DEBUG] Starting cart query for userId:', userId);
    
    let cart;
    try {
      cart = await ShoppingCart.findOne({
        where: { 
          userId, 
          status: 'active'
        },
        include: [
          { 
            model: CartItem, 
            as: 'cartItems',
            include: [{ 
              model: StorefrontItem, 
              as: 'storefrontItem' 
            }]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            // Note: stripeCustomerId will be added after migration is run
          }
        ]
      });
      
      console.log('✅ [DEBUG] Cart query completed. Cart found:', !!cart);
      if (cart) {
        console.log('🔍 [DEBUG] Cart items count:', cart.cartItems?.length || 0);
        console.log('🔍 [DEBUG] User data:', {
          id: cart.user?.id,
          email: cart.user?.email,
          hasUser: !!cart.user
        });
      }
    } catch (cartQueryError) {
      console.error('❌ [DEBUG] Cart query failed:', {
        message: cartQueryError.message,
        stack: cartQueryError.stack?.split('\n')[0],
        sql: cartQueryError.sql || 'No SQL',
        name: cartQueryError.name
      });
      throw cartQueryError;
    }

    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty or not found',
        error: {
          code: 'EMPTY_CART',
          details: 'Please add items to cart before checkout'
        }
      });
    }

    // Step 2: Calculate totals
    const subtotal = cart.cartItems.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price) || 0;
      const itemQuantity = item.quantity || 0;
      return sum + (itemPrice * itemQuantity);
    }, 0);
    
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;
    const totalCents = Math.round(total * 100); // Convert to cents for Stripe

    // Calculate total sessions for admin dashboard
    const totalSessions = cart.cartItems.reduce((sum, item) => {
      return sum + ((item.storefrontItem?.sessions || 0) * (item.quantity || 0));
    }, 0);

    if (totalCents < 50) { // Stripe minimum $0.50
      return res.status(400).json({
        success: false,
        message: 'Order total too low',
        error: {
          code: 'AMOUNT_TOO_LOW',
          details: 'Minimum order amount is $0.50'
        }
      });
    }

    console.log(`💰 [v2 Payment] Order total: $${total.toFixed(2)} (${totalSessions} sessions)`);

    // Step 3: Create or retrieve Stripe Customer
    let stripeCustomer = null;
    const user = cart.user;
    
    // TODO: Uncomment after migration adds stripeCustomerId column
    // if (user.stripeCustomerId) {
    //   try {
    //     stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
    //     console.log('👤 [v2 Payment] Using existing Stripe customer:', user.stripeCustomerId);
    //   } catch (error) {
    //     logger.warn('[v2 Payment] Existing Stripe customer not found, creating new one');
    //     stripeCustomer = null;
    //   }
    // }
    
    // TEMPORARY: Always create new customer until migration is complete
    console.log('⚠️ [v2 Payment] Creating new customer (stripeCustomerId not yet available)');

    if (!stripeCustomer) {
      stripeCustomer = await stripe.customers.create({
        email: customerInfo?.email || user.email,
        name: customerInfo?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: customerInfo?.phone || user.phone,
        metadata: {
          userId: userId.toString(),
          source: 'genesis_checkout'
        }
      });

      // Update user with Stripe Customer ID for admin dashboard
      // TODO: Uncomment after migration adds stripeCustomerId column
      await user.update({
        // stripeCustomerId: stripeCustomer.id, // TODO: Enable after migration
        // Update customer info if provided
        ...(customerInfo?.email && { email: customerInfo.email }),
        ...(customerInfo?.phone && { phone: customerInfo.phone })
      });
      
      // TEMPORARY: Log the Stripe customer ID for manual tracking
      console.log('⚠️ [v2 Payment] Stripe Customer ID created but not stored:', stripeCustomer.id);

      console.log('✅ [v2 Payment] Created new Stripe customer:', stripeCustomer.id);
    }

    // Step 4: Prepare line items for Stripe
    const lineItems = cart.cartItems.map(item => {
      const itemPrice = parseFloat(item.price) || 0;
      const itemPriceCents = Math.round(itemPrice * 100);
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.storefrontItem?.name || `Training Package #${item.storefrontItemId}`,
            description: item.storefrontItem?.description || 'Premium training package',
            metadata: {
              storefrontItemId: item.storefrontItemId.toString(),
              sessions: (item.storefrontItem?.sessions || 0).toString()
            }
          },
          unit_amount: itemPriceCents,
        },
        quantity: item.quantity || 1,
      };
    });

    // Add tax as a separate line item for transparency
    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tax',
            description: 'Sales tax (8%)'
          },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });
    }

    // Step 5: Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: userId.toString(),
        cartId: cart.id.toString(),
        totalSessions: totalSessions.toString(),
        source: 'genesis_checkout',
        ...(metadata || {})
      },
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      billing_address_collection: 'auto',
      // shipping_address_collection removed - not needed for digital services
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: false // We're handling tax manually
      }
    });

    // Step 6: Update cart with session information for admin dashboard tracking
    await cart.update({
      checkoutSessionId: session.id,
      paymentIntentId: session.payment_intent,
      total: total,
      subtotal: subtotal,
      tax: tax,
      paymentStatus: 'pending',
      customerInfo: JSON.stringify({
        name: customerInfo?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: customerInfo?.email || user.email,
        phone: customerInfo?.phone || user.phone,
        stripeCustomerId: stripeCustomer.id
      }),
      lastCheckoutAttempt: new Date()
    });

    console.log('✅ [v2 Payment] Stripe Checkout Session created successfully');
    console.log('🔗 [v2 Payment] Session ID:', session.id);
    console.log('📊 [Admin Dashboard] Cart updated with checkout data for analytics');

    // Step 7: Return success response
    res.status(200).json({
      success: true,
      message: 'Checkout session created successfully',
      data: {
        sessionId: session.id,
        checkoutUrl: session.url,
        amount: total,
        currency: 'USD',
        customerInfo: {
          name: customerInfo?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: customerInfo?.email || user.email,
          stripeCustomerId: stripeCustomer.id
        },
        orderSummary: {
          items: cart.cartItems.length,
          sessions: totalSessions,
          subtotal: subtotal,
          tax: tax,
          total: total
        }
      }
    });

    logger.info(`[v2 Payment] Checkout session created successfully for user ${userId}: ${session.id}`);

  } catch (error) {
    logger.error('[v2 Payment] Error creating checkout session:', error);
    console.error('💥 [v2 Payment] Checkout session creation failed:');
    console.error('💥 [DEBUG] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      sql: error.sql || 'No SQL query',
      code: error.code || 'No error code',
      type: error.type || 'No error type'
    });
    
    // Return appropriate error response
    const statusCode = error.type === 'StripeCardError' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: 'Failed to create checkout session',
      error: {
        code: error.code || 'CHECKOUT_CREATION_FAILED',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        debugInfo: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          sql: error.sql || 'No SQL',
          originalMessage: error.message
        } : undefined
      }
    });
  }
});

/**
 * POST /api/v2/payments/verify-session
 * 
 * Verify completed Stripe session and process order
 * Used by SuccessPage component after redirect
 * 
 * Admin Dashboard Integration:
 * - Records successful transaction
 * - Updates user sessions
 * - Provides data for analytics
 */
router.post('/verify-session', protect, checkStripeAvailability, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    logger.info(`[v2 Payment] Verifying session ${sessionId} for user ${userId}`);
    console.log('🔍 [v2 Payment] Verifying Stripe session:', sessionId);

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
        error: {
          code: 'PAYMENT_NOT_COMPLETED',
          details: `Payment status: ${session.payment_status}`
        }
      });
    }

    // 🎯 P0 FIX: Get coordinated models for verify-session endpoint
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();
    
    // Find and update the cart
    const cart = await ShoppingCart.findOne({
      where: { 
        checkoutSessionId: sessionId,
        userId 
      },
      include: [
        { 
          model: CartItem, 
          as: 'cartItems',
          include: [{ 
            model: StorefrontItem, 
            as: 'storefrontItem' 
          }]
        },
        {
          model: User,
          as: 'user'
        }
      ]
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: {
          code: 'ORDER_NOT_FOUND',
          details: 'No matching order found for this session'
        }
      });
    }

    // Calculate sessions to add
    const sessionsToAdd = cart.cartItems.reduce((sum, item) => {
      return sum + ((item.storefrontItem?.sessions || 0) * (item.quantity || 0));
    }, 0);

    // IDEMPOTENCY CHECK: Only grant sessions if not already processed
    // This prevents double-grants if both webhook and verify-session are called
    const alreadyProcessed = cart.sessionsGranted === true || cart.status === 'completed';

    if (alreadyProcessed) {
      console.log('⚠️ [v2 Payment] Sessions already granted for this order - skipping (idempotent)');
      logger.info(`[v2 Payment] Idempotency: Order ${cart.id} already processed, skipping session grant`);

      // Still return success but don't add more sessions
      return res.status(200).json({
        success: true,
        message: 'Order already verified (idempotent response)',
        data: {
          sessionId: session.id,
          amount: session.amount_total / 100,
          sessionsAdded: 0, // Already added previously
          alreadyProcessed: true,
          customerEmail: session.customer_details?.email || cart.user?.email,
          orderDate: cart.completedAt?.toISOString() || new Date().toISOString()
        }
      });
    }

    // Update cart status with sessionsGranted flag for idempotency
    await cart.update({
      status: 'completed',
      paymentStatus: 'paid',
      completedAt: new Date(),
      sessionsGranted: true, // IDEMPOTENCY FLAG
      stripeSessionData: JSON.stringify({
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerDetails: session.customer_details,
        completedAt: new Date(),
        grantedBy: 'verify-session' // Track which endpoint granted sessions
      })
    });

    // Add sessions to user account for training
    const user = cart.user;
    const currentSessions = user.availableSessions || 0;
    await user.update({
      availableSessions: currentSessions + sessionsToAdd,
      hasPurchasedBefore: true,
      lastPurchaseDate: new Date()
    });

    console.log(`✅ [v2 Payment] Sessions granted via verify-session endpoint (idempotency flag set)`);

    console.log('✅ [v2 Payment] Order completed successfully');
    console.log(`🎯 [v2 Payment] Added ${sessionsToAdd} sessions to user account`);
    console.log('📊 [Admin Dashboard] Transaction data available for analytics');

    // Return success response with order data
    res.status(200).json({
      success: true,
      message: 'Order verified and completed successfully',
      data: {
        sessionId: session.id,
        amount: session.amount_total / 100, // Convert from cents
        sessionsAdded: sessionsToAdd,
        customerName: session.customer_details?.name || user.firstName + ' ' + user.lastName,
        customerEmail: session.customer_details?.email || user.email,
        orderDate: new Date().toISOString(),
        items: cart.cartItems.map(item => ({
          name: item.storefrontItem?.name,
          quantity: item.quantity,
          price: item.price,
          sessions: item.storefrontItem?.sessions || 0
        }))
      }
    });

    logger.info(`[v2 Payment] Session verified successfully: ${sessionId}, added ${sessionsToAdd} sessions`);

  } catch (error) {
    logger.error('[v2 Payment] Error verifying session:', error);
    console.error('💥 [v2 Payment] Session verification failed:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify session',
      error: {
        code: 'SESSION_VERIFICATION_FAILED',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  }
});

/**
 * GET /api/v2/payments/health
 * 
 * Health check endpoint for the payment system
 */
router.get('/health', (req, res) => {
  const health = {
    status: stripe ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: 'v2.0.0',
    stripe: {
      available: !!stripe,
      configured: !!process.env.STRIPE_SECRET_KEY
    }
  };

  res.status(stripe ? 200 : 503).json({
    success: true,
    data: health
  });
});

export default router;
