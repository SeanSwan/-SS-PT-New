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
import { getShoppingCart, getCartItem, getStorefrontItem, getProductVariant, getUser } from '../models/index.mjs';
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
import {
  FULFILLMENT_DETAILS_REQUIRED_CODE,
  normalizeCheckoutFulfillmentIntent,
  validateCheckoutFulfillmentIntent,
} from '../services/checkoutFulfillmentIntentService.mjs';
import { getCheckoutReceiptSummary } from '../services/checkoutReceiptSummaryService.mjs';

const router = express.Router();
const CHECKOUT_CREATION_FAILED_CODE = 'CHECKOUT_CREATION_FAILED';
const PRODUCT_TAX_RATE = 0.08;

function buildCheckoutSessionIdempotencyKey(userId, cart) {
  const itemFingerprint = buildCartItemsStripeFingerprint(
    cart?.cartItems,
    (item) => getStorefrontSessionCredits(item?.storefrontItem),
  );

  return buildStripeIdempotencyKey(`checkout:${userId}:${cart?.id}`, itemFingerprint);
}

const toMoneyNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toStripeCents = (amount) => Math.round(toMoneyNumber(amount) * 100);

const isPhysicalProductLine = (item) => (
  item?.storefrontItem?.itemKind === 'physical_product' || Boolean(item?.productVariantId)
);

const isTaxablePhysicalProductLine = (item) => (
  isPhysicalProductLine(item) && item?.storefrontItem?.isTaxable === true
);

const resolveCheckoutProductName = (item) => {
  const baseName = item?.storefrontItem?.name || `Storefront Item #${item?.storefrontItemId}`;
  const variantLabel = item?.productVariant?.label;
  return variantLabel ? `${baseName} - ${variantLabel}` : baseName;
};

const resolveCheckoutLineDescription = (item) => {
  if (item?.productVariant?.sku) {
    return `Variant SKU: ${item.productVariant.sku}`;
  }

  return item?.storefrontItem?.description || 'Premium SwanStudios purchase';
};

function resolveCheckoutLineItem(item) {
  const itemPrice = toMoneyNumber(item?.price);
  const quantity = Number(item?.quantity) > 0 ? Number(item.quantity) : 1;
  const storefrontItemId = item?.storefrontItemId?.toString?.() || '';
  const sessions = getStorefrontSessionCredits(item?.storefrontItem).toString();

  return {
    lineItem: {
      price_data: {
        currency: 'usd',
        product_data: {
          name: resolveCheckoutProductName(item),
          description: resolveCheckoutLineDescription(item),
          metadata: {
            storefrontItemId,
            productVariantId: item.productVariantId ? item.productVariantId.toString() : '',
            sessions
          }
        },
        unit_amount: toStripeCents(itemPrice),
      },
      quantity,
    },
    subtotal: itemPrice * quantity,
    taxableProductSubtotal: isTaxablePhysicalProductLine(item) ? itemPrice * quantity : 0,
  };
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
    const { cartId, customerInfo, fulfillmentIntent } = req.body;
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
    logger.info('[v2 Payment] Checkout session creation started', {
      userId,
      cartId: normalizedCartId
    });

    // 🎯 P0 FIX: Get fully associated models from coordinated cache
    let ShoppingCart, CartItem, StorefrontItem, ProductVariant, User;
    try {
      ShoppingCart = getShoppingCart();
      CartItem = getCartItem();
      StorefrontItem = getStorefrontItem();
      ProductVariant = getProductVariant();
      User = getUser();

      logger.info('[v2 Payment] Coordinated checkout models loaded', {
        shoppingCartAssociationCount: Object.keys(ShoppingCart.associations || {}).length,
        cartItemAssociationCount: Object.keys(CartItem.associations || {}).length
      });
    } catch (debugError) {
      logger.error('[v2 Payment] Coordinated model loading failed', {
        errorName: debugError.name,
        errorCode: debugError.code || 'MODEL_LOAD_FAILED'
      });
      throw new Error('Models not properly initialized. Server may still be starting up.');
    }

    // Step 1: Validate and fetch cart data
    logger.info('[v2 Payment] Querying checkout cart', {
      userId,
      cartId: normalizedCartId
    });
    
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
            }, {
              model: ProductVariant,
              as: 'productVariant',
              required: false
            }]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'stripeCustomerId']
          }
        ]
      });
      
      logger.info('[v2 Payment] Cart query completed', {
        userId,
        cartId: normalizedCartId,
        cartFound: !!cart,
        itemCount: cart?.cartItems?.length || 0,
        hasUser: !!cart?.user
      });
    } catch (cartQueryError) {
      logger.error('[v2 Payment] Cart query failed', {
        userId,
        cartId: normalizedCartId,
        errorName: cartQueryError.name,
        errorCode: cartQueryError.code || 'CART_QUERY_FAILED'
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

    const normalizedFulfillmentIntent = normalizeCheckoutFulfillmentIntent(fulfillmentIntent, cart.cartItems);
    const fulfillmentValidationError = validateCheckoutFulfillmentIntent(normalizedFulfillmentIntent);

    if (fulfillmentValidationError) {
      return res.status(400).json({
        success: false,
        message: fulfillmentValidationError,
        error: {
          code: FULFILLMENT_DETAILS_REQUIRED_CODE,
          details: fulfillmentValidationError
        }
      });
    }

    // Step 2: Calculate totals. Training packages are all-inclusive services;
    // only taxable physical products receive the manual product-tax line.
    const checkoutLines = cart.cartItems.map(resolveCheckoutLineItem);
    const subtotal = checkoutLines.reduce((sum, item) => sum + item.subtotal, 0);
    const taxableProductSubtotal = checkoutLines.reduce((sum, item) => (
      sum + item.taxableProductSubtotal
    ), 0);
    const tax = Number((taxableProductSubtotal * PRODUCT_TAX_RATE).toFixed(2));
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

    logger.info('[v2 Payment] Checkout total calculated', {
      userId,
      cartId: normalizedCartId,
      totalCents,
      totalSessions
    });

    // Step 3: Create or retrieve Stripe Customer
    let stripeCustomer = null;
    const user = cart.user;
    
    if (user.stripeCustomerId) {
      try {
        stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
        logger.info('[v2 Payment] Using existing Stripe customer', {
          userId,
          hasStripeCustomerId: true
        });
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

      logger.info('[v2 Payment] Created new Stripe customer', {
        userId,
        hasStripeCustomerId: true
      });
    }

    // Step 4: Prepare line items for Stripe
    const lineItems = checkoutLines.map((item) => item.lineItem);

    // Add product tax as a separate line item for transparency
    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Product sales tax',
            description: 'Sales tax on taxable physical products'
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
        fulfillmentIntent: normalizedFulfillmentIntent.mode,
        physicalProductCount: normalizedFulfillmentIntent.itemCount.toString(),
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
        fulfillmentIntent: normalizedFulfillmentIntent,
        stripeCustomerId: stripeCustomer.id
      }),
      lastCheckoutAttempt: new Date()
    });

    logger.info('[v2 Payment] Stripe checkout session created and cart updated', {
      userId,
      cartId: normalizedCartId,
      itemCount: cart.cartItems.length,
      totalSessions
    });

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
          taxableProductSubtotal,
          fulfillmentIntent: normalizedFulfillmentIntent,
          tax: tax,
          total: total
        }
      }
    });

    logger.info('[v2 Payment] Checkout session created successfully', {
      userId,
      cartId: normalizedCartId,
      hasSessionId: true
    });

  } catch (error) {
    logger.error('[v2 Payment] Error creating checkout session', {
      userId: req.user?.id,
      cartId: req.body?.cartId,
      errorName: error.name,
      errorCode: error.code || CHECKOUT_CREATION_FAILED_CODE,
      errorType: error.type || 'unknown'
    });
    
    // Return appropriate error response
    const statusCode = error.type === 'StripeCardError' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: 'Failed to create checkout session',
      error: {
        code: CHECKOUT_CREATION_FAILED_CODE,
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

    logger.info('[v2 Payment] Verifying checkout session for user', {
      userId,
      hasSessionId: true
    });
    logger.info('[v2 Payment] Verifying Stripe checkout session', {
      userId,
      hasSessionId: true
    });

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
    const receiptSummary = await getCheckoutReceiptSummary({ cartId: cart.id, userId });

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
          orderDate: new Date().toISOString(),
          ...receiptSummary,
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
        orderDate: new Date().toISOString(),
        ...receiptSummary,
      }
    });

    logger.info('[v2 Payment] Session verified successfully', {
      userId,
      hasSessionId: true,
      sessionsAdded: result.sessionsAdded
    });

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
    logger.error('[v2 Payment] Error verifying session', {
      userId: req.user?.id,
      errorName: error.name,
      errorCode: error.code || classified.code,
      errorType: error.type || 'unknown'
    });
    
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
