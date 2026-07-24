// /backend/routes/cartRoutes.mjs
// Enhanced cart routes with role-based access control and user role upgrade logic

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
// 🚀 ENHANCED P0 FIX: Coordinated model imports with associations
import { 
  getShoppingCart,
  getCartItem, 
  getStorefrontItem,
  getProductVariant,
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
  normalizeAuthenticatedUserId,
  safeFindOrCreateActiveCart,
  safeLoadCartItemsWithStorefront
} from '../utils/cartSchemaRecovery.mjs';
// Trainer-Economics (SWA-62) S1 — SHADOW price instrumentation. The observation logic lives in
// its own service; the cart just calls it. The service is fully guarded and can NEVER affect
// the cart's real behavior (zero behavior change).
import { observeCartAdd } from '../services/economics/shadowObserver.mjs';
const { updateCartTotals, getCartTotalsWithFallback } = cartHelpers;

const router = express.Router();
const STOREFRONT_CART_ATTRIBUTES = [
  'id',
  'name',
  'description',
  'imageUrl',
  'price',
  'totalCost',
  'packageType',
  'sessions',
  'totalSessions',
  'itemKind',
  'isTaxable',
  'fulfillmentType',
  'stockQuantity',
  'sku'
];
const PRODUCT_VARIANT_CART_ATTRIBUTES = ['id', 'storefrontItemId', 'label', 'sku', 'price', 'stockQuantity', 'attributes', 'isActive'];
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

const getOptionalProductVariant = () => {
  try {
    return getProductVariant();
  } catch (error) {
    logger.warn('[Cart] ProductVariant model unavailable; continuing without variant include.', {
      ...toCartErrorMetadata(error, 'cart_product_variant_model_unavailable')
    });
    return null;
  }
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

const parseOptionalPositiveInteger = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return parsePositiveInteger(value);
};

const toMoneyNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstMoney = (...values) => {
  for (const value of values) {
    const parsed = toMoneyNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
};

const isPhysicalProduct = (storefrontItem) => (
  storefrontItem?.itemKind === 'physical_product'
);

const getAvailableStock = (storefrontItem, variant = null) => {
  if (typeof variant?.stockQuantity === 'number') return variant.stockQuantity;
  if (typeof storefrontItem?.stockQuantity === 'number') return storefrontItem.stockQuantity;
  return null;
};

const buildCartItemLookup = (cartId, storefrontItemId, productVariantId) => ({
  cartId,
  storefrontItemId,
  productVariantId: productVariantId || null
});

const resolveCartItemSnapshot = async ({
  StorefrontItem,
  ProductVariant,
  storefrontItemId,
  productVariantId,
  quantity
}) => {
  const storeFrontItem = await StorefrontItem.findByPk(storefrontItemId);
  if (!storeFrontItem) {
    return { status: 404, message: 'Storefront item not found' };
  }

  let variant = null;
  if (productVariantId) {
    if (!ProductVariant) {
      return { status: 409, message: 'Selected product variants are temporarily unavailable. Please refresh the store and try again.' };
    }

    variant = await ProductVariant.findByPk(productVariantId);

    if (!variant || variant.storefrontItemId !== storefrontItemId) {
      return { status: 400, message: 'Selected product variant does not match this product' };
    }

    if (variant.isActive === false) {
      return { status: 409, message: 'Selected product variant is not available' };
    }
  } else if (isPhysicalProduct(storeFrontItem)) {
    return { status: 400, message: 'Please choose a product variant before adding this item' };
  }

  const availableStock = getAvailableStock(storeFrontItem, variant);
  if (typeof availableStock === 'number' && quantity > availableStock) {
    return { status: 409, message: 'Selected item quantity exceeds available stock' };
  }

  return {
    status: 200,
    storefrontItem: storeFrontItem,
    variant,
    price: firstMoney(variant?.price, storeFrontItem.totalCost, storeFrontItem.price)
  };
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
    const ProductVariant = getOptionalProductVariant();
    
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
      ProductVariant,
      cartId: cart.id,
      storefrontAttributes,
      productVariantAttributes: PRODUCT_VARIANT_CART_ATTRIBUTES,
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
    const ProductVariant = getOptionalProductVariant();
    const User = getUser();
    
    const { storefrontItemId, productVariantId, quantity = 1 } = req.body;
    
    const normalizedStorefrontItemId = parsePositiveInteger(storefrontItemId);
    const normalizedProductVariantId = parseOptionalPositiveInteger(productVariantId);
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

    if (productVariantId !== undefined && productVariantId !== null && productVariantId !== '' && !normalizedProductVariantId) {
      return res.status(400).json({
        success: false,
        message: 'Valid product variant ID is required'
      });
    }

    logger.debug('[Cart] Add item request accepted', {
      userId: req.authUserId,
      role: req.user.role,
      storefrontItemId: normalizedStorefrontItemId,
      productVariantId: normalizedProductVariantId,
      quantity: normalizedQuantity
    });

    // 🚀 ENHANCED: Using coordinated model imports
    // Get the storefront item to check price
    const snapshot = await resolveCartItemSnapshot({
      StorefrontItem,
      ProductVariant,
      storefrontItemId: normalizedStorefrontItemId,
      productVariantId: normalizedProductVariantId,
      quantity: normalizedQuantity
    });

    if (snapshot.status !== 200) {
      return res.status(snapshot.status).json({
        success: false,
        message: snapshot.message
      });
    }
    
    logger.debug('[Cart] Adding storefront item to active cart', {
      userId: req.authUserId,
      storefrontItemId: normalizedStorefrontItemId,
      productVariantId: normalizedProductVariantId
    });

    // Find or create the user's active cart with schema-drift recovery.
    const [cart] = await safeFindOrCreateActiveCart(ShoppingCart, req.authUserId, logger);

    // Check if item already exists in cart
    let cartItem = await CartItem.findOne({
      where: buildCartItemLookup(cart.id, normalizedStorefrontItemId, normalizedProductVariantId)
    });

    if (cartItem) {
      // Update quantity if item exists
      const nextQuantity = cartItem.quantity + normalizedQuantity;
      const availableStock = getAvailableStock(snapshot.storefrontItem, snapshot.variant);
      if (typeof availableStock === 'number' && nextQuantity > availableStock) {
        return res.status(409).json({
          success: false,
          message: 'Selected item quantity exceeds available stock'
        });
      }

      cartItem.quantity = nextQuantity;
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        cartId: cart.id,
        storefrontItemId: normalizedStorefrontItemId,
        productVariantId: normalizedProductVariantId,
        quantity: normalizedQuantity,
        price: snapshot.price
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

    // Trainer-Economics (SWA-62) S1 — SHADOW price observation. FIRE-AND-FORGET: intentionally NOT
    // awaited so a slow/blocked audit-table write can add ZERO latency to the cart response (Codex
    // S1 review F3 — awaiting it meant a degraded price_change_logs table could slow every cart add).
    // The service is fully self-guarded and never throws; the trailing .catch is a belt-and-suspenders
    // guard so an unexpected async rejection can never surface as an unhandledRejection.
    void observeCartAdd({
      storefrontItem: snapshot.storefrontItem,
      chargedPrice: snapshot.price,
      actor: { userId: req.authUserId, role: req.user?.role },
    }).catch(() => {});

    // Get updated cart with items
    const storefrontAttributes = await getSafeStorefrontAttributes(StorefrontItem);
    const updatedCartItems = await safeLoadCartItemsWithStorefront({
      CartItem,
      StorefrontItem,
      ProductVariant,
      cartId: cart.id,
      storefrontAttributes,
      productVariantAttributes: PRODUCT_VARIANT_CART_ATTRIBUTES,
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

    const ProductVariant = getOptionalProductVariant();
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
      }, {
        model: StorefrontItem,
        as: 'storefrontItem',
        required: false
      }, ...(ProductVariant ? [{
        model: ProductVariant,
        as: 'productVariant',
        required: false
      }] : [])]
    });

    if (!cartItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }

    const availableStock = getAvailableStock(cartItem.storefrontItem, cartItem.productVariant);
    if (typeof availableStock === 'number' && normalizedQuantity > availableStock) {
      return res.status(409).json({
        success: false,
        message: 'Selected item quantity exceeds available stock'
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
      ProductVariant,
      cartId: cartItem.cartId,
      storefrontAttributes,
      productVariantAttributes: PRODUCT_VARIANT_CART_ATTRIBUTES,
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

    const ProductVariant = getOptionalProductVariant();
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
      ProductVariant,
      cartId,
      storefrontAttributes,
      productVariantAttributes: PRODUCT_VARIANT_CART_ATTRIBUTES,
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
      return res.status(200).json({
        success: true,
        message: 'Cart already empty',
        items: [],
        total: 0,
        totalSessions: 0,
        itemCount: 0
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

const LEGACY_CART_CHECKOUT_DISABLED_CODE = 'LEGACY_CART_CHECKOUT_DISABLED';

/**
 * Legacy checkout gate
 * POST /api/cart/checkout
 * The active storefront uses POST /api/v2/payments/create-checkout-session.
 */
router.post('/checkout', protect, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
  logger.warn('[Cart] Legacy checkout route blocked', {
    userId: req.authUserId
  });

  return res.status(410).json({
    success: false,
    message: 'This checkout route is retired. Use the v2 checkout flow.',
    error: {
      code: LEGACY_CART_CHECKOUT_DISABLED_CODE,
      details: 'POST /api/v2/payments/create-checkout-session is the supported checkout route'
    }
  });
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
