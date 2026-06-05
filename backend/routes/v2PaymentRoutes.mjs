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
import {
  calculateCartSessionCredits,
  getStorefrontSessionCredits,
  grantSessionsForCart
} from '../services/SessionGrantService.mjs';
import {
  buildCartItemsStripeFingerprint,
  buildStripeIdempotencyKey,
} from '../utils/stripeIdempotency.mjs';
import {
  classifyStripeCheckoutSessionError,
  validateCheckoutSessionId,
} from '../utils/stripeCheckoutSessionErrors.mjs';
import {
  getLiveStripeLocalBlockDetails,
  getStripeSecretKeyMode,
  shouldBlockLiveStripeInLocal,
} from '../utils/stripeEnvironmentSafety.mjs';
import {
  PaymentActivationStatusError,
  resolvePaidClientActivationStatus,
} from '../services/paymentActivationStatusService.mjs';
import {
  fulfillSessionPackageCheckoutSession,
  isSessionPackageCheckoutSession,
  SessionPackageFulfillmentError,
} from '../services/sessionPackageCheckoutFulfillmentService.mjs';

const router = express.Router();

export function buildCheckoutSessionIdempotencyKey(userId, cart) {
  const itemFingerprint = buildCartItemsStripeFingerprint(
    cart?.cartItems,
    (item) => getStorefrontSessionCredits(item?.storefrontItem),
  );

  return buildStripeIdempotencyKey(`checkout:${userId}:${cart?.id}`, itemFingerprint);
}

// Initialize Stripe with error handling
let stripe = null;
let stripeUnavailableReason = null;
try {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    stripeUnavailableReason = {
      code: 'STRIPE_SECRET_KEY_MISSING',
      details: 'Stripe secret key is not configured',
    };
    logger.error('[v2 Payment] STRIPE_SECRET_KEY not found in environment variables');
  } else if (shouldBlockLiveStripeInLocal({ secretKey: stripeSecretKey })) {
    stripeUnavailableReason = {
      code: 'LIVE_STRIPE_LOCAL_BLOCKED',
      details: getLiveStripeLocalBlockDetails(),
    };
    logger.error('[v2 Payment] Live Stripe key blocked in local development');
  } else {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
    logger.info(`[v2 Payment] Stripe client initialized successfully (${getStripeSecretKeyMode(stripeSecretKey)} mode)`);
  }
} catch (error) {
  stripeUnavailableReason = {
    code: 'STRIPE_INITIALIZATION_FAILED',
    details: 'Stripe service could not be initialized',
  };
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
        code: stripeUnavailableReason?.code || 'STRIPE_UNAVAILABLE',
        details: stripeUnavailableReason?.details || 'Stripe service not initialized'
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
    const { cartId, customerInfo } = req.body;
    const normalizedCartId = Number(cartId);

    if (!Number.isInteger(normalizedCartId) || normalizedCartId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cart id',
        error: {
          code: 'INVALID_CART_ID',
          details: 'A valid cart id is required before checkout'
        }
      });
    }

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
          id: normalizedCartId,
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
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'stripeCustomerId']
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

    const totalSessions = calculateCartSessionCredits(cart.cartItems);

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
    
    if (user.stripeCustomerId) {
      try {
        stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
        console.log('👤 [v2 Payment] Using existing Stripe customer:', user.stripeCustomerId);
      } catch (error) {
        logger.warn('[v2 Payment] Existing Stripe customer not found, creating new one');
        stripeCustomer = null;
      }
    }

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

      // Update user with Stripe Customer ID (write-if-empty rule)
      await user.update({
        ...(!user.stripeCustomerId ? { stripeCustomerId: stripeCustomer.id } : {}),
        ...(customerInfo?.email && { email: customerInfo.email }),
        ...(customerInfo?.phone && { phone: customerInfo.phone })
      });

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
              sessions: getStorefrontSessionCredits(item.storefrontItem).toString()
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

    const checkoutIdempotencyKey = buildCheckoutSessionIdempotencyKey(userId, cart);

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
        source: 'genesis_checkout'
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
    }, {
      idempotencyKey: checkoutIdempotencyKey
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
        details: 'Internal server error',
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
    const sessionValidation = validateCheckoutSessionId(req.body?.sessionId);
    if (!sessionValidation.ok) {
      return res.status(sessionValidation.statusCode).json({
        success: false,
        message: sessionValidation.message,
        error: {
          code: sessionValidation.code,
          details: sessionValidation.message,
        },
      });
    }

    const { sessionId } = sessionValidation;
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

    if (isSessionPackageCheckoutSession(session)) {
      const packageUserId = Number(session.client_reference_id);
      if (!Number.isInteger(packageUserId) || packageUserId !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
          error: {
            code: 'ORDER_NOT_FOUND',
            details: 'No matching order found for this session'
          }
        });
      }

      const result = await fulfillSessionPackageCheckoutSession(session);

      return res.status(200).json({
        success: true,
        message: result.alreadyProcessed
          ? 'Order already verified (idempotent response)'
          : 'Order verified and completed successfully',
        data: {
          sessionId: session.id,
          amount: session.amount_total / 100,
          sessionsAdded: result.sessionsAdded,
          alreadyProcessed: result.alreadyProcessed,
          customerEmail: session.customer_details?.email,
          orderDate: new Date().toISOString()
        }
      });
    }

    // Find the cart by checkout session ID (scoped to authenticated user)
    const ShoppingCart = getShoppingCart();
    const cart = await ShoppingCart.findOne({
      where: { checkoutSessionId: sessionId, userId }
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

    // Delegate to shared service (handles transaction, row lock, idempotency, atomic increment)
    const result = await grantSessionsForCart(cart.id, userId, 'verify-session');

    if (result.alreadyProcessed) {
      return res.status(200).json({
        success: true,
        message: 'Order already verified (idempotent response)',
        data: {
          sessionId: session.id,
          amount: session.amount_total / 100,
          sessionsAdded: 0,
          alreadyProcessed: true,
          customerEmail: session.customer_details?.email,
          orderDate: new Date().toISOString()
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order verified and completed successfully',
      data: {
        sessionId: session.id,
        amount: session.amount_total / 100,
        sessionsAdded: result.sessionsAdded,
        customerEmail: session.customer_details?.email,
        orderDate: new Date().toISOString()
      }
    });

    logger.info(`[v2 Payment] Session verified successfully: ${sessionId}, added ${result.sessionsAdded} sessions`);

  } catch (error) {
    if (error instanceof SessionPackageFulfillmentError) {
      logger.error('[v2 Payment] Error fulfilling session package checkout:', error);
      return res.status(error.statusCode).json({
        success: false,
        message: 'Failed to fulfill session package checkout',
        error: {
          code: error.code,
          details: 'Session package checkout could not be fulfilled',
        }
      });
    }

    const classified = classifyStripeCheckoutSessionError(error);
    logger.error('[v2 Payment] Error verifying session:', error);
    console.error('💥 [v2 Payment] Session verification failed:', error.message);
    
    res.status(classified.statusCode).json({
      success: false,
      message: classified.message,
      error: {
        code: classified.code,
        details: classified.details,
      }
    });
  }
});

/**
 * GET /api/v2/payments/activation-status
 *
 * Database-backed resolver for the post-purchase activation funnel.
 * This endpoint intentionally does not depend on live Stripe availability:
 * checkout/payment truth is read from the local cart/order/session state.
 */
router.get('/activation-status', protect, async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.query.session_id;
    const status = await resolvePaidClientActivationStatus({
      userId: req.user.id,
      sessionId,
    });

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    const isActivationError = error instanceof PaymentActivationStatusError;
    const statusCode = isActivationError ? error.statusCode : 500;
    const code = isActivationError ? error.code : 'ACTIVATION_STATUS_FAILED';

    logger.error('[v2 Payment] Error resolving activation status:', error);

    return res.status(statusCode).json({
      success: false,
      message: 'Failed to resolve payment activation status',
      error: {
        code,
        details: 'Internal server error',
      },
    });
  }
});

/**
 * GET /api/v2/payments/health
 * 
 * Health check endpoint for the payment system
 */
router.get('/health', protect, (req, res) => {
  const health = {
    status: stripe ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: 'v2.0.0',
    stripe: {
      available: !!stripe,
    }
  };

  res.status(stripe ? 200 : 503).json({
    success: true,
    data: health
  });
});

export default router;
