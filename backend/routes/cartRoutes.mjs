// /backend/routes/cartRoutes.mjs
// Enhanced cart routes with role-based access control and user role upgrade logic

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
// 🚀 ENHANCED P0 FIX: Coordinated model imports with associations
import { 
  getShoppingCart,
  getCartItem, 
  getStorefrontItem,
  getUser
} from '../models/index.mjs';

// 🎯 ENHANCED P0 FIX: Lazy loading models to prevent initialization race condition
// Models will be retrieved via getter functions inside each route handler when needed

import Stripe from 'stripe';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
import cartHelpers from '../utils/cartHelpers.mjs';
import { grantSessionsForCart } from '../services/SessionGrantService.mjs';
import {
  buildStripeIdempotencyKey,
  getStripeRetryWindowStart
} from '../utils/stripeIdempotency.mjs';
import {
  normalizeAuthenticatedUserId,
  safeFindOrCreateActiveCart,
  safeLoadCartItemsWithStorefront
} from '../utils/cartSchemaRecovery.mjs';
const { updateCartTotals, getCartTotalsWithFallback, debugCartState } = cartHelpers;

const router = express.Router();
const STOREFRONT_CART_ATTRIBUTES = ['id', 'name', 'description', 'imageUrl', 'price', 'totalCost', 'packageType', 'sessions', 'totalSessions'];
const INTERNAL_ERROR = 'Internal server error';
let cachedSafeStorefrontAttributes = null;

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  error: INTERNAL_ERROR
});

const toCartErrorMetadata = (error, fallbackCode = 'cart_internal_error') => ({
  errorName: error?.name || 'Error',
  errorCode: error?.code || error?.type || fallbackCode
});

const logCartError = (message, error, req, metadata = {}) => {
  logger.error(message, {
    userId: req?.authUserId,
    ...metadata,
    ...toCartErrorMetadata(error)
  });
};

const parsePositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const ensureNumericCartUser = (req, res, next) => {
  try {
    req.authUserId = normalizeAuthenticatedUserId(req.user?.id);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication context for cart access'
    });
  }
};

const getSafeStorefrontAttributes = async (StorefrontItem) => {
  if (cachedSafeStorefrontAttributes) return cachedSafeStorefrontAttributes;

  try {
    const queryInterface = StorefrontItem.sequelize.getQueryInterface();
    const tableNameRef = StorefrontItem.getTableName();
    const tableName = typeof tableNameRef === 'string' ? tableNameRef : tableNameRef.tableName;
    const tableDefinition = await queryInterface.describeTable(tableName);
    const existingColumns = new Set(Object.keys(tableDefinition));

    cachedSafeStorefrontAttributes = STOREFRONT_CART_ATTRIBUTES.filter((column) =>
      existingColumns.has(column)
    );

    if (cachedSafeStorefrontAttributes.length === 0) {
      cachedSafeStorefrontAttributes = ['id', 'name', 'price'];
    }
  } catch (error) {
    logger.warn('[Cart] Could not resolve storefront table columns. Falling back to minimal attributes.', {
      ...toCartErrorMetadata(error, 'cart_storefront_columns_unavailable')
    });
    cachedSafeStorefrontAttributes = ['id', 'name', 'price'];
  }

  return cachedSafeStorefrontAttributes;
};

// Role validation middleware
const validatePurchaseRole = (req, res, next) => {
  // Allow any authenticated user to access cart functionality
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required to access cart functionality.' 
    });
  }
  
  logger.debug('[Cart] Access approved', {
    userId: req.authUserId,
    role: req.user.role
  });
  
  // Allow access for all authenticated users
  next();
};

// Check if user role should be upgraded after adding training packages
const checkUserRoleUpgrade = async (user, cartItems) => {
  // If user has 'user' role and adds training sessions, they should be upgraded to 'client'
  if (user.role === 'user') {
    const hasTrainingPackages = cartItems.some(item => {
      const itemName = item.storefrontItem?.name || '';
      return itemName.includes('Gold') || itemName.includes('Platinum') || 
             itemName.includes('Rhodium') || itemName.includes('Silver');
    });
    
    if (hasTrainingPackages) {
      const User = getUser(); // 🎯 ENHANCED: Lazy load User model
      await User.update({ role: 'client' }, { where: { id: user.id } });
      logger.info('[Cart] User role upgraded after training package detection', {
        userId: user.id
      });
      return true;
    }
  }
  return false;
};

// --- Conditionally initialize Stripe ---
let stripeClient = null;
if (isStripeEnabled()) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' // Use a fixed, recent API version
    });
    logger.info('Stripe client initialized successfully.');
  } catch (error) {
      logger.error('[Cart] Failed to initialize Stripe client', {
        ...toCartErrorMetadata(error, 'cart_stripe_init_failed')
      });
      // stripeClient remains null
  }
} else {
    logger.warn('Stripe client NOT initialized due to missing/invalid API key.');
}
// --- End Conditional Initialization ---

/**
 * GET User's Active Cart
 * GET /api/cart
 * Retrieves the current user's active shopping cart with items
 */
router.get('/', protect, ensureNumericCartUser, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    
    // 🚀 ENHANCED P0 VERIFICATION: Coordinated association status
    const hasAssociation = !!CartItem.associations?.storefrontItem;
    logger.debug('[Cart] Storefront association status', {
      hasStorefrontAssociation: hasAssociation
    });
    
    // Find or create the user's active cart with schema-drift recovery.
    const [cart] = await safeFindOrCreateActiveCart(ShoppingCart, req.authUserId, logger);
    const storefrontAttributes = await getSafeStorefrontAttributes(StorefrontItem);

    const cartItems = await safeLoadCartItemsWithStorefront({
      CartItem,
      StorefrontItem,
      cartId: cart.id,
      storefrontAttributes,
      logger
    });

    logger.debug('[Cart] Loaded active cart items', {
      cartId: cart.id,
      itemCount: cartItems.length,
      itemsWithStorefrontData: cartItems.filter((item) => item.storefrontItem).length
    });

    // Calculate cart total using helper (with session tracking preparation)
    const { total: cartTotal, totalSessions } = cartHelpers.calculateCartTotals(cartItems);
    
    logger.debug('[Cart] Calculated active cart totals', {
      cartTotal,
      totalSessions,
      itemCount: cartItems.length
    });

    res.status(200).json({
      id: cart.id,
      status: cart.status,
      items: cartItems,
      total: cartTotal,
      totalSessions, // Include session count for future dashboard integration
      itemCount: cartItems.length
    });
  } catch (error) {
    logCartError('[Cart] Failed to fetch cart', error, req);
    return sendInternalError(res, 'Failed to fetch shopping cart');
  }
});

/**
 * Add Item to Cart
 * POST /api/cart/add
 * Adds a training package to the user's cart
 * Supports role-based access and automatic user role upgrade
 */
router.post('/add', protect, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();
    
    const { storefrontItemId, quantity = 1 } = req.body;
    
    const normalizedStorefrontItemId = parsePositiveInteger(storefrontItemId);
    const normalizedQuantity = parsePositiveInteger(quantity);

    if (!normalizedStorefrontItemId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid storefront item ID is required'
      });
    }

    if (!normalizedQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive whole number'
      });
    }

    logger.debug('[Cart] Add item request accepted', {
      userId: req.authUserId,
      role: req.user.role,
      storefrontItemId: normalizedStorefrontItemId,
      quantity: normalizedQuantity
    });

    // 🚀 ENHANCED: Using coordinated model imports
    // Get the storefront item to check price
    const storeFrontItem = await StorefrontItem.findByPk(normalizedStorefrontItemId);
    if (!storeFrontItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Training package not found' 
      });
    }
    
    logger.debug('[Cart] Adding storefront item to active cart', {
      userId: req.authUserId,
      storefrontItemId: normalizedStorefrontItemId
    });

    // Find or create the user's active cart with schema-drift recovery.
    const [cart] = await safeFindOrCreateActiveCart(ShoppingCart, req.authUserId, logger);

    // Check if item already exists in cart
    let cartItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        storefrontItemId: normalizedStorefrontItemId
      }
    });

    if (cartItem) {
      // Update quantity if item exists
      cartItem.quantity += normalizedQuantity;
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        cartId: cart.id,
        storefrontItemId: normalizedStorefrontItemId,
        quantity: normalizedQuantity,
        price: storeFrontItem.totalCost || storeFrontItem.price || 0 // Use totalCost field if available, fallback to price
      });
    }

    // Update cart totals in database using helper
    const totalsResult = await updateCartTotals(cart.id);
    
    if (!totalsResult.success) {
      logger.warn('Cart ADD: Failed to persist totals, continuing with calculated values', {
        cartId: cart.id,
        error: totalsResult.error
      });
    }

    // Get updated cart with items
    const storefrontAttributes = await getSafeStorefrontAttributes(StorefrontItem);
    const updatedCartItems = await safeLoadCartItemsWithStorefront({
      CartItem,
      StorefrontItem,
      cartId: cart.id,
      storefrontAttributes,
      logger
    });
    
    logger.debug('[Cart] Items after add operation', {
      cartId: cart.id,
      itemCount: updatedCartItems.length,
      itemsWithStorefrontData: updatedCartItems.filter(item => item.storefrontItem).length
    });

    // Check if user role should be upgraded
    let userRoleUpgraded = false;
    try {
      const user = await User.findByPk(req.authUserId);
      userRoleUpgraded = await checkUserRoleUpgrade(user, updatedCartItems);
      if (userRoleUpgraded) {
        logger.info('[Cart] User role upgraded after cart add', {
          userId: req.authUserId
        });
      }
    } catch (roleUpgradeError) {
      logger.warn('[Cart] Role upgrade check failed', {
        userId: req.authUserId,
        ...toCartErrorMetadata(roleUpgradeError, 'cart_role_upgrade_failed')
      });
      // Don't fail the request if role upgrade fails
    }

    // Use persisted totals or calculate as fallback
    const { total: cartTotal, totalSessions } = getCartTotalsWithFallback({
      id: cart.id,
      total: totalsResult.total,
      cartItems: updatedCartItems
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      id: cart.id,
      status: cart.status,
      items: updatedCartItems,
      total: cartTotal,
      totalSessions, // Include session count for future dashboard integration
      itemCount: updatedCartItems.length,
      userRoleUpgrade: userRoleUpgraded // Inform frontend about role upgrade
    });
  } catch (error) {
    logCartError('[Cart] Failed to add item to cart', error, req);
    return sendInternalError(res, 'Failed to add item to cart');
  }
});

/**
 * Update Cart Item Quantity
 * PUT /api/cart/update/:itemId
 * Updates the quantity of an item in the cart
 */
router.put('/update/:itemId', protect, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    
    const { itemId } = req.params;
    const { quantity } = req.body;

    const normalizedItemId = parsePositiveInteger(itemId);
    const normalizedQuantity = parsePositiveInteger(quantity);

    if (!normalizedItemId) {
      return res.status(400).json({
        success: false,
        message: 'Valid cart item ID is required'
      });
    }

    if (!normalizedQuantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity must be a positive whole number'
      });
    }

    // Get the cart item
    const cartItem = await CartItem.findOne({
      where: { id: normalizedItemId },
      include: [{
        model: ShoppingCart,
        as: 'cart',
        where: { 
          userId: req.authUserId,
          status: 'active'
        }
      }]
    });

    if (!cartItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }

    // Update quantity
    cartItem.quantity = normalizedQuantity;
    await cartItem.save();

    // Update cart totals in database
    const totalsResult = await updateCartTotals(cartItem.cartId);
    
    if (!totalsResult.success) {
      logger.warn('Cart UPDATE: Failed to persist totals', {
        cartId: cartItem.cartId,
        error: totalsResult.error
      });
    }

    // Get updated cart with items
    const storefrontAttributes = await getSafeStorefrontAttributes(StorefrontItem);
    const updatedCartItems = await safeLoadCartItemsWithStorefront({
      CartItem,
      StorefrontItem,
      cartId: cartItem.cartId,
      storefrontAttributes,
      logger
    });

    // Use persisted totals or calculate as fallback
    const { total: cartTotal, totalSessions } = getCartTotalsWithFallback({
      id: cartItem.cartId,
      total: totalsResult.total,
      cartItems: updatedCartItems
    });

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      items: updatedCartItems,
      total: cartTotal,
      totalSessions,
      itemCount: updatedCartItems.length
    });
  } catch (error) {
    logCartError('[Cart] Failed to update cart item', error, req);
    return sendInternalError(res, 'Failed to update cart item');
  }
});

/**
 * Remove Item from Cart
 * DELETE /api/cart/remove/:itemId
 * Removes an item from the cart
 */
router.delete('/remove/:itemId', protect, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    
    const { itemId } = req.params;
    const normalizedItemId = parsePositiveInteger(itemId);

    if (!normalizedItemId) {
      return res.status(400).json({
        success: false,
        message: 'Valid cart item ID is required'
      });
    }

    // Get the cart item
    const cartItem = await CartItem.findOne({
      where: { id: normalizedItemId },
      include: [{
        model: ShoppingCart,
        as: 'cart',
        where: { 
          userId: req.authUserId,
          status: 'active'
        }
      }]
    });

    if (!cartItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }

    const cartId = cartItem.cartId;

    // Delete the cart item
    await cartItem.destroy();

    // Update cart totals in database
    const totalsResult = await updateCartTotals(cartId);
    
    if (!totalsResult.success) {
      logger.warn('Cart REMOVE: Failed to persist totals', {
        cartId,
        error: totalsResult.error
      });
    }

    // Get updated cart with items
    const storefrontAttributes = await getSafeStorefrontAttributes(StorefrontItem);
    const updatedCartItems = await safeLoadCartItemsWithStorefront({
      CartItem,
      StorefrontItem,
      cartId,
      storefrontAttributes,
      logger
    });

    // Use persisted totals or calculate as fallback
    const { total: cartTotal, totalSessions } = getCartTotalsWithFallback({
      id: cartId,
      total: totalsResult.total,
      cartItems: updatedCartItems
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      items: updatedCartItems,
      total: cartTotal,
      totalSessions,
      itemCount: updatedCartItems.length
    });
  } catch (error) {
    logCartError('[Cart] Failed to remove item from cart', error, req);
    return sendInternalError(res, 'Failed to remove item from cart');
  }
});

/**
 * Clear Cart
 * DELETE /api/cart/clear
 * Removes all items from the user's cart
 */
router.delete('/clear', protect, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    
    // Find the user's active cart
    const cart = await ShoppingCart.findOne({
      where: { 
        userId: req.authUserId,
        status: 'active'
      }
    });

    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Active cart not found' 
      });
    }

    // Delete all cart items
    await CartItem.destroy({
      where: { cartId: cart.id }
    });

    // Update cart totals to zero
    const totalsResult = await updateCartTotals(cart.id);
    
    if (!totalsResult.success) {
      logger.warn('Cart CLEAR: Failed to persist zero totals', {
        cartId: cart.id,
        error: totalsResult.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      items: [],
      total: 0,
      totalSessions: 0,
      itemCount: 0
    });
  } catch (error) {
    logCartError('[Cart] Failed to clear cart', error, req);
    return sendInternalError(res, 'Failed to clear cart');
  }
});

/**
 * Create Stripe Checkout Session
 * POST /api/cart/checkout
 * Creates a Stripe checkout session for the cart items
 */
router.post('/checkout', protect, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
  // --- Add check for Stripe client ---
  if (!stripeClient) {
    logger.error('Attempted /api/cart/checkout but Stripe is not enabled/initialized.');
    return res.status(503).json({ // 503 Service Unavailable
      success: false,
      message: 'Payment service is currently unavailable. Please try again later or contact support.',
    });
  }
  // --- End check ---

  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();
    
    logger.debug('[Cart] Creating checkout session', {
      userId: req.authUserId
    });
    
    // 🚀 ENHANCED: Verify coordinated associations status
    logger.debug('[Cart] Checkout association status', {
      hasStorefrontAssociation: !!CartItem.associations?.storefrontItem
    });
    
    // Find the user's active cart with all related items using the correct alias "cartItems"
    const cart = await ShoppingCart.findOne({
      where: { 
        userId: req.authUserId,
        status: 'active'
      },
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem',
          attributes: await getSafeStorefrontAttributes(StorefrontItem)
        }]
      }]
    });

    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Active cart not found' 
      });
    }

    if (!cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Your cart is empty' 
      });
    }

    logger.debug('[Cart] Loaded checkout cart items', {
      cartId: cart.id,
      itemCount: cart.cartItems.length
    });

    // Calculate cart total for metadata using helper
    const { total: cartTotal, totalSessions } = cartHelpers.calculateCartTotals(cart.cartItems);
    
    // Debug cart state for checkout troubleshooting
    await debugCartState(cart.id, 'checkout_creation');
    
    // Format line items for Stripe
    const lineItems = cart.cartItems.map(item => {
      const storefrontItem = item.storefrontItem;
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: storefrontItem ? storefrontItem.name : `Package #${item.storefrontItemId}`,
            description: storefrontItem ? storefrontItem.description : 'Security service package'
          },
          unit_amount: Math.round(item.price * 100)
        },
        quantity: item.quantity
      };
    });

    // Default frontend URL if environment variable isn't set
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Retrieve user record for Stripe customer creation
    const userRecord = await User.findByPk(req.authUserId);
    if (!userRecord || !userRecord.email) {
      return res.status(400).json({ 
        success: false,
        message: 'User information missing' 
      });
    }

    // Check or create Stripe customer
    let customerId = userRecord.stripeCustomerId;
    if (customerId) {
      try {
        const customer = await stripeClient.customers.retrieve(customerId);
        customerId = customer.id;
      } catch (err) {
        logger.warn('[Cart] Stored Stripe customer ID rejected; creating replacement', {
          userId: req.authUserId,
          ...toCartErrorMetadata(err, 'cart_stripe_customer_rejected')
        });
        customerId = null;
      }
    }
    
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: userRecord.email,
        name: `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim(),
        metadata: {
          userId: userRecord.id
        }
      });
      customerId = customer.id;
      // Update user record asynchronously (non-blocking)
      User.update({ stripeCustomerId: customerId }, { where: { id: userRecord.id } })
        .catch((err) => logger.error('[Cart] Failed to persist Stripe customer ID', {
          userId: userRecord.id,
          ...toCartErrorMetadata(err, 'cart_stripe_customer_persist_failed')
        }));
    }

    const retryWindowStartMs = getStripeRetryWindowStart();
    const checkoutExpiresAtMs = retryWindowStartMs + (31 * 60 * 1000);
    const checkoutFingerprint = cart.cartItems.map((item) => ({
      storefrontItemId: item.storefrontItemId,
      quantity: item.quantity,
      price: item.price,
      sessionCredits: item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0
    }));
    const idempotencyKey = buildStripeIdempotencyKey(
      `cart-checkout:${req.authUserId}:${cart.id}`,
      {
        retryWindowStartMs,
        total: cartTotal,
        items: checkoutFingerprint
      }
    );

    // Create a Stripe checkout session
    const sessionOptions = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${frontendUrl}/checkout/CheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout/CheckoutCancel`,
      client_reference_id: cart.id.toString(),
      customer: customerId,
      metadata: {
        cartId: cart.id,
        userId: req.authUserId,
        totalAmount: cartTotal.toFixed(2),
        itemCount: cart.cartItems.length,
        createdAt: new Date(retryWindowStartMs).toISOString()
      },
      // Pin expiration to the retry window while keeping it safely above Stripe's 30-minute minimum.
      expires_at: Math.floor(checkoutExpiresAtMs / 1000)
    };

    const session = await stripeClient.checkout.sessions.create(sessionOptions, { idempotencyKey });
    logger.info('[Cart] Stripe checkout session created', {
      userId: req.authUserId,
      cartId: cart.id
    });

    // Update cart with checkout session ID for reference
    await cart.update({
      checkoutSessionId: session.id,
      lastActivityAt: new Date()
    });

    // Return the checkout URL to redirect the user
    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    logCartError('[Cart] Failed to create checkout session', error, req, {
      stripeErrorType: error.type || 'none'
    });
    let errorMessage = 'Failed to create checkout session. Please try again.';
    let statusCode = 500;
    
    if (error.type) {
      switch (error.type) {
        case 'StripeCardError':
          errorMessage = 'Your card was declined';
          statusCode = 400;
          break;
        case 'StripeRateLimitError':
          errorMessage = 'Too many requests to payment processor';
          break;
        case 'StripeInvalidRequestError':
          errorMessage = 'Invalid payment information';
          statusCode = 400;
          break;
        case 'StripeAPIError':
        case 'StripeConnectionError':
          errorMessage = 'Payment service temporarily unavailable';
          break;
        case 'StripeAuthenticationError':
          errorMessage = 'Payment service configuration error';
          logger.error('Stripe authentication failed - check API keys');
          break;
        default:
          errorMessage = 'Payment service temporarily unavailable';
      }
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage
    });
  }
});

/**
 * Webhook handler for Stripe events
 * POST /api/cart/webhook
 * Processes async events from Stripe (payment confirmations, etc.)
 */
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  // --- Add check for Stripe client ---
  if (!stripeClient) {
    logger.error('Received Stripe webhook but Stripe is not enabled/initialized.');
    return res.status(503).send('Webhook Error: Payment processing is not configured.');
  }
  // --- End check ---
  
  const signature = req.headers['stripe-signature'];
  
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('Missing Stripe webhook signature or secret');
    return res.status(400).send('Webhook Error: Missing signature or configuration');
  }
  
  let event;
  
  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('[Webhook] Signature verification failed', {
      ...toCartErrorMetadata(err, 'cart_webhook_signature_failed')
    });
    return res.status(400).send('Webhook Error: Signature verification failed');
  }
  
  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.payment_status === 'paid') {
          const { cartId, userId } = session.metadata || {};

          if (cartId && userId) {
            const normalizedCartId = parsePositiveInteger(cartId);
            const normalizedUserId = parsePositiveInteger(userId);

            if (!normalizedCartId || !normalizedUserId) {
              logger.warn('[Webhook] Ignoring completed checkout with invalid cart metadata');
              break;
            }

            // Grant sessions via shared service (transaction + row lock + atomic increment)
            // If verify-session already ran, this is idempotent (returns alreadyProcessed=true)
            const result = await grantSessionsForCart(normalizedCartId, normalizedUserId, 'webhook');

            if (result.granted) {
              logger.info('[Webhook] Sessions granted for cart', {
                cartId: normalizedCartId,
                userId: normalizedUserId,
                sessionsAdded: result.sessionsAdded
              });
            } else {
              logger.info('[Webhook] Cart already processed', {
                cartId: normalizedCartId,
                userId: normalizedUserId
              });
            }
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const { cartId } = session.metadata || {};
        const normalizedCartId = parsePositiveInteger(cartId);

        if (normalizedCartId) {
          const ShoppingCart = getShoppingCart();
          await ShoppingCart.update(
            { checkoutSessionExpired: true },
            { where: { id: normalizedCartId } }
          );
          logger.info('[Webhook] Checkout session expired for cart', {
            cartId: normalizedCartId
          });
        } else if (cartId) {
          logger.warn('[Webhook] Ignoring expired checkout with invalid cart metadata');
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    // Return 5xx so Stripe retries the webhook (prevents lost credits)
    logger.error('[Webhook] Processing error', {
      ...toCartErrorMetadata(err, 'cart_webhook_processing_failed')
    });
    res.status(500).send('Webhook processing error');
  }
});

// DELETE the /api/cart/checkout/success route - It's insecure
// The backend should rely SOLELY on the 'checkout.session.completed' webhook event
// to fulfill orders/update status, not a redirect from the frontend.

export default router;
