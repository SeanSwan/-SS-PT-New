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
import { checkoutSessionLimiter, paymentVerifyLimiter } from '../middleware/moneyPathRateLimits.mjs';
import { MAX_CART_ITEM_QUANTITY } from '../utils/cartHelpers.mjs';
import { isPriceAccessGranted } from '../services/store/priceVisibilityService.mjs';
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
import { CheckoutInventoryError } from '../services/cartCheckoutFulfillmentService.mjs';
import { buildCartCheckoutSnapshot } from '../services/cartCheckoutSnapshotService.mjs';
import {
  FULFILLMENT_DETAILS_REQUIRED_CODE,
  normalizeCheckoutFulfillmentIntent,
  validateCheckoutFulfillmentIntent,
} from '../services/checkoutFulfillmentIntentService.mjs';
import {
  validateCheckoutStockAvailability,
} from '../services/checkoutStockAvailabilityService.mjs';
import { getCheckoutReceiptSummary } from '../services/checkoutReceiptSummaryService.mjs';
import { captureLeadFromCheckout } from '../services/leadCaptureService.mjs';
import { deriveChannel } from '../services/leadCaptureShared.mjs';

const router = express.Router();
const CHECKOUT_CREATION_FAILED_CODE = 'CHECKOUT_CREATION_FAILED';
const STRIPE_TAX_NOT_CONFIGURED_CODE = 'STRIPE_TAX_NOT_CONFIGURED';

function buildCheckoutSessionIdempotencyKey(userId, cart) {
  const itemFingerprint = buildCartItemsStripeFingerprint(
    cart?.cartItems,
    (item) => getStorefrontSessionCredits(item?.storefrontItem),
  );

  return buildStripeIdempotencyKey(`checkout:${userId}:${cart?.id}`, {
    itemFingerprint,
    priorCheckoutAttempt: cart?.lastCheckoutAttempt
      ? new Date(cart.lastCheckoutAttempt).toISOString()
      : null,
  });
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

const isStripeTaxEnabled = () => process.env.SWAN_STRIPE_TAX_ENABLED === 'true';

const toPaymentErrorMetadata = (error, fallbackCode = 'PAYMENT_INTERNAL_ERROR') => ({
  errorName: error?.name || 'Error',
  errorCode: error?.code || error?.type || fallbackCode,
});

const getOptionalProductVariant = () => {
  try {
    return getProductVariant();
  } catch (error) {
    logger.warn('[v2 Payment] ProductVariant model unavailable; continuing without variant include.', {
      ...toPaymentErrorMetadata(error, 'PRODUCT_VARIANT_MODEL_UNAVAILABLE')
    });
    return null;
  }
};

const buildCheckoutCartItemIncludes = ({ StorefrontItem, ProductVariant }) => {
  const include = [{
    model: StorefrontItem,
    as: 'storefrontItem'
  }];

  if (ProductVariant) {
    include.push({
      model: ProductVariant,
      as: 'productVariant',
      required: false
    });
  }

  return include;
};

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
        tax_behavior: isTaxablePhysicalProductLine(item) ? 'exclusive' : 'unspecified',
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

async function captureVerifiedCheckoutLead({ user, session, cart = null, sessionsAdded = 0 }) {
  const leadCaptureResult = await captureLeadFromCheckout({
    user,
    session,
    cart,
    sessionsAdded,
  });

  if (leadCaptureResult.error) {
    logger.warn('[v2 Payment] Checkout lead capture failed', {
      userId: user?.id,
      hasSessionId: true,
      error: leadCaptureResult.error,
    });
  }

  return leadCaptureResult;
}

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
router.post('/create-checkout-session', protect, checkoutSessionLimiter, checkStripeAvailability, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartId, customerInfo, fulfillmentIntent } = req.body;
    const checkoutAttribution = deriveChannel({
      utmSource: req.body?.utmSource || req.body?.metadata?.utmSource,
      utmMedium: req.body?.utmMedium || req.body?.metadata?.utmMedium,
      referrer: req.body?.referrer || req.body?.metadata?.referrer,
    });
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
      ProductVariant = getOptionalProductVariant();
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
            include: buildCheckoutCartItemIncludes({ StorefrontItem, ProductVariant })
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

    const stockValidationError = validateCheckoutStockAvailability(cart.cartItems);
    if (stockValidationError) {
      return res.status(stockValidationError.status).json({
        success: false,
        message: stockValidationError.message,
        error: {
          code: stockValidationError.code,
          details: stockValidationError.message,
          itemName: stockValidationError.itemName,
          requestedQuantity: stockValidationError.requestedQuantity,
          availableStock: stockValidationError.availableStock
        }
      });
    }

    // Defense-in-depth: re-verify every per-client special in the cart belongs
    // to this user and is still redeemable, right before we mint a Stripe
    // session (the cart guard runs at add-time; this catches an expired/redeemed
    // deal sitting in a stale cart). No-op for ordinary carts.
    {
      const { default: CustomPackage } = await import('../models/CustomPackage.mjs');
      const { assertCartSpecialsRedeemable, SpecialOfferError } =
        await import('../services/specialOfferService.mjs');
      try {
        await assertCartSpecialsRedeemable({ cartItems: cart.cartItems, userId, CustomPackage });
      } catch (e) {
        if (e instanceof SpecialOfferError) {
          return res.status(e.status || 409).json({ success: false, message: e.message, code: e.code });
        }
        throw e;
      }
    }

    const cartContainsSpecialOffers = cart.cartItems
      .some((item) => item.storefrontItem?.isSpecialOffer === true);
    const cartContainsOnlySpecialOffers = cartContainsSpecialOffers
      && cart.cartItems.every((item) => item.storefrontItem?.isSpecialOffer === true);
    const checkoutInvited = await isPriceAccessGranted(req.user)
      || cartContainsOnlySpecialOffers;
    if (!checkoutInvited) {
      return res.status(403).json({
        success: false,
        message: 'Store purchasing is by invitation. Contact SwanStudios to request access.',
        error: { code: 'PRICE_ACCESS_REQUIRED' }
      });
    }

    // Step 2: Calculate totals. Stripe Tax owns taxable physical product tax.

    // FAIL CLOSED ON QUANTITY. What the buyer SEES and what Stripe CHARGES are
    // computed by two independent implementations — cartHelpers.calculateCartTotals
    // persists ShoppingCart.total for the cart UI, while resolveCheckoutLineItem
    // below builds the Stripe lines. They disagree on malformed quantities, and
    // they disagree in the direction that overcharges:
    //   quantity 0  -> total shows $0.00,  Stripe charges one unit at full price
    //                  (`Number(0) > 0` is false, so the resolver defaults to 1)
    //   quantity -1 -> total shows -$175,  Stripe charges $175
    //   quantity "2" (a string) -> the item is skipped from the total entirely
    //                  (`typeof quantity !== 'number'`), Stripe charges for 2
    // Route writes currently gate quantity through parsePositiveInteger, so a row
    // like this cannot be created through the API today — but the price column
    // already comes back from Sequelize as a STRING, which is why the total helper
    // carries explicit string handling. The same thing happening to quantity, or
    // any admin/repair/import path writing cart_items directly, turns this from
    // latent into live. Refusing costs a healthy cart nothing (every legitimate
    // row is a positive integer) and is the only safe direction: never charge for
    // a line the buyer's displayed total did not include.
    const invalidQuantityItem = cart.cartItems.find((item) => (
      typeof item?.quantity !== 'number'
      || !Number.isSafeInteger(item.quantity)
      || item.quantity <= 0
      // Also enforce the CEILING here, not just at the cart routes. A row can
      // exceed the cap without ever passing through those routes — it predates
      // the cap, or an admin/repair/import path wrote it directly — and this is
      // the last gate before Stripe is charged. Same constant, one source.
      || item.quantity > MAX_CART_ITEM_QUANTITY
    ));
    if (invalidQuantityItem) {
      logger.error('[v2 Payment] Refusing checkout: cart item quantity is not a positive integer', {
        cartId: cart.id,
        cartItemId: invalidQuantityItem.id,
        quantityType: typeof invalidQuantityItem.quantity,
      });
      // 422, deliberately NOT 409. This route already returns 409 for
      // CART_CHECKOUT_IN_PROGRESS, which is a transient conflict a client may
      // sensibly retry. An unprocessable cart row is not transient — retrying
      // spins forever. Two meanings on one status code is how that happens.
      return res.status(422).json({
        success: false,
        message: 'Your cart needs to be refreshed before checkout. Please reload the store and try again.',
        error: { code: 'CART_ITEM_QUANTITY_INVALID' }
      });
    }

    const checkoutLines = cart.cartItems.map(resolveCheckoutLineItem);
    const subtotal = checkoutLines.reduce((sum, item) => sum + item.subtotal, 0);
    const taxableProductSubtotal = checkoutLines.reduce((sum, item) => (
      sum + item.taxableProductSubtotal
    ), 0);
    const requiresStripeTax = taxableProductSubtotal > 0;
    if (requiresStripeTax && !isStripeTaxEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'Physical product checkout is temporarily unavailable',
        error: {
          code: STRIPE_TAX_NOT_CONFIGURED_CODE,
          details: 'Stripe Tax must be configured before taxable physical product checkout is enabled'
        }
      });
    }

    const usesStripeTax = requiresStripeTax;
    const tax = usesStripeTax ? null : 0;
    const total = subtotal;
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
        if (stripeCustomer?.deleted === true) {
          logger.warn('[v2 Payment] Stored Stripe customer was deleted; creating a replacement', {
            userId,
            hasStripeCustomerId: true
          });
          stripeCustomer = null;
        } else {
          logger.info('[v2 Payment] Using existing Stripe customer', {
            userId,
            hasStripeCustomerId: true
          });
        }
      } catch (error) {
        if (error?.code !== 'resource_missing') throw error;
        logger.warn('[v2 Payment] Existing Stripe customer no longer exists; creating a replacement');
        stripeCustomer = null;
      }
    }

    if (!stripeCustomer) {
      const customerIdempotencyKey = buildStripeIdempotencyKey('checkout-customer', {
        userId,
        previousCustomerId: user.stripeCustomerId || null,
      });
      stripeCustomer = await stripe.customers.create({
        email: customerInfo?.email || user.email,
        name: customerInfo?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: customerInfo?.phone || user.phone,
        metadata: {
          userId: userId.toString(),
          source: 'genesis_checkout'
        }
      }, { idempotencyKey: customerIdempotencyKey });

      // Checkout contact fields belong to this order only. Changing account
      // identity requires the authenticated profile verification flow.
      await user.update({
        stripeCustomerId: stripeCustomer.id
      });

      logger.info('[v2 Payment] Created new Stripe customer', {
        userId,
        hasStripeCustomerId: true
      });
    }

    // Step 4: Prepare line items for Stripe
    const lineItems = checkoutLines.map((item) => item.lineItem);

    const checkoutIdempotencyKey = buildCheckoutSessionIdempotencyKey(userId, cart);
    const checkoutAttemptedAt = new Date();
    const [claimedCartCount] = await ShoppingCart.update({
      status: 'pending_payment',
      paymentStatus: 'initializing',
      checkoutSessionId: null,
      lastCheckoutAttempt: checkoutAttemptedAt,
    }, {
      where: { id: normalizedCartId, userId, status: 'active' },
    });
    if (claimedCartCount !== 1) {
      return res.status(409).json({
        success: false,
        message: 'Checkout is already in progress for this cart.',
        error: { code: 'CART_CHECKOUT_IN_PROGRESS' },
      });
    }

    const checkoutReturnBaseUrl = (process.env.FRONTEND_URL || 'https://sswanstudios.com').replace(/\/+$/, '');

    let session;
    let checkoutFinalized = false;
    try {
      session = await stripe.checkout.sessions.create({
        customer: stripeCustomer.id,
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: lineItems,
        success_url: `${checkoutReturnBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${checkoutReturnBaseUrl}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          userId: userId.toString(),
          cartId: cart.id.toString(),
          totalSessions: totalSessions.toString(),
          fulfillmentIntent: normalizedFulfillmentIntent.mode,
          physicalProductCount: normalizedFulfillmentIntent.itemCount.toString(),
          acquisitionChannel: checkoutAttribution.channel,
          source: 'genesis_checkout'
        },
        customer_update: {
          address: 'auto',
          name: 'auto'
        },
        billing_address_collection: 'auto',
        allow_promotion_codes: !cartContainsSpecialOffers,
        automatic_tax: { enabled: usesStripeTax }
      }, { idempotencyKey: checkoutIdempotencyKey });

      const checkoutSnapshot = buildCartCheckoutSnapshot(cart.cartItems, session.id);
      const [finalizedCartCount] = await ShoppingCart.update({
        checkoutSessionId: session.id,
        paymentIntentId: session.payment_intent,
        total,
        subtotal,
        tax: usesStripeTax ? 0 : tax,
        paymentStatus: 'pending',
        checkoutSessionExpired: false,
        stripeSessionData: JSON.stringify({ checkoutSnapshot }),
        customerInfo: JSON.stringify({
          name: customerInfo?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: customerInfo?.email || user.email,
          phone: customerInfo?.phone || user.phone,
          fulfillmentIntent: normalizedFulfillmentIntent,
          acquisitionAttribution: { channel: checkoutAttribution.channel },
          taxMode: usesStripeTax ? 'stripe_automatic_tax' : 'not_applicable',
          stripeCustomerId: stripeCustomer.id
        }),
      }, {
        where: {
          id: normalizedCartId,
          userId,
          status: 'pending_payment',
          paymentStatus: 'initializing',
          checkoutSessionId: null,
        },
      });
      if (finalizedCartCount !== 1) {
        throw new Error('Failed to attach Stripe session to the claimed cart');
      }
      checkoutFinalized = true;
    } catch (checkoutError) {
      let stripeSessionClosed = !session?.id;
      if (session?.id) {
        try {
          await stripe.checkout.sessions.expire(session.id);
          stripeSessionClosed = true;
        } catch (expireError) {
          logger.error('[v2 Payment] Failed to expire an untracked Stripe session', {
            cartId: normalizedCartId,
            errorCode: expireError.code || 'STRIPE_SESSION_EXPIRE_FAILED',
          });
        }
      }
      if (!checkoutFinalized && stripeSessionClosed) {
        await ShoppingCart.update({
          status: 'active',
          paymentStatus: 'cancelled',
          checkoutSessionExpired: true,
        }, {
          where: {
            id: normalizedCartId,
            userId,
            status: 'pending_payment',
            paymentStatus: 'initializing',
            checkoutSessionId: null,
          },
        });
      }
      throw checkoutError;
    }
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
          tax,
          taxMode: usesStripeTax ? 'stripe_automatic_tax' : 'not_applicable',
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
router.post('/verify-session', protect, paymentVerifyLimiter, checkStripeAvailability, async (req, res) => {
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
    const userId = Number(req.user.id);

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
      await captureVerifiedCheckoutLead({
        user: req.user,
        session,
        sessionsAdded: result.sessionsAdded,
      });

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
    const result = await grantSessionsForCart(cart.id, userId, 'verify-session', { checkoutSessionId: session.id });
    const receiptSummary = await getCheckoutReceiptSummary({ cartId: cart.id, userId });
    await captureVerifiedCheckoutLead({
      cart,
      user: req.user,
      session,
      sessionsAdded: result.sessionsAdded,
    });

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

    if (error instanceof CheckoutInventoryError) {
      logger.error('[v2 Payment] Paid checkout inventory conflict', {
        userId: req.user?.id,
        errorCode: error.code,
        itemName: error.itemName,
        requestedQuantity: error.requestedQuantity,
        availableStock: error.availableStock,
      });

      return res.status(409).json({
        success: false,
        message: 'Payment verified, but product inventory changed before fulfillment. SwanStudios will review this order.',
        error: {
          code: 'CHECKOUT_INVENTORY_UNAVAILABLE',
          details: 'Product inventory changed before fulfillment could complete.',
          itemName: error.itemName,
          requestedQuantity: error.requestedQuantity,
          availableStock: error.availableStock,
          requiresSupportReview: true,
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
router.get('/activation-status', protect, paymentVerifyLimiter, async (req, res) => {
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
