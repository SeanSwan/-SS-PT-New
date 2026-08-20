// /backend/routes/cartRoutes.mjs
// Enhanced cart routes with role-based access control.
// Role promotion (user -> client) is NOT done here — see the note below.

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { cartMutationLimiter, checkoutSessionLimiter } from '../middleware/moneyPathRateLimits.mjs';
import { isPriceAccessGranted } from '../services/store/priceVisibilityService.mjs';
// 🚀 ENHANCED P0 FIX: Coordinated model imports with associations
import { 
  getShoppingCart,
  getCartItem, 
  getStorefrontItem,
  getProductVariant
} from '../models/index.mjs';

// 🎯 ENHANCED P0 FIX: Lazy loading models to prevent initialization race condition
// Models will be retrieved via getter functions inside each route handler when needed

import Stripe from 'stripe';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
// MAX_CART_ITEM_QUANTITY is a NAMED import on purpose. It was previously
// destructured off the DEFAULT export — which never contained it — so it bound
// `undefined`, every `qty > MAX_CART_ITEM_QUANTITY` check below silently
// evaluated false, and the ceiling had never fired. A named import is validated
// at link time: if the export disappears, this module fails to load instead of
// quietly disabling a money-path guard.
import cartHelpers, { MAX_CART_ITEM_QUANTITY } from '../utils/cartHelpers.mjs';
import { resolveUnitPrice, UnpriceableItemError } from '../services/store/itemPricing.mjs';
import {
  normalizeAuthenticatedUserId,
  safeFindOrCreateActiveCart,
  safeLoadCartItemsWithStorefront
} from '../utils/cartSchemaRecovery.mjs';
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

/**
 * Upper bound on a single cart line's quantity.
 *
 * parsePositiveInteger has no ceiling, and training packages carry
 * stockQuantity: null (verified on live), so getAvailableStock returns null and
 * the stock check below is skipped entirely for them. That left the only limit
 * as Number.MAX_SAFE_INTEGER. ShoppingCart.total is DECIMAL(10,2) — max
 * 99,999,999.99 — so a large enough quantity overflows the column and turns a
 * money-path request into a 500. Below that it still lets a client mint an
 * absurd real Stripe Checkout Session.
 *
 * 99 is far above how these are actually sold (a package already bundles up to
 * 192 sessions, so quantity counts PACKAGES) while keeping any cart total
 * comfortably inside the column.
 */
// MAX_CART_ITEM_QUANTITY is imported from utils/cartHelpers.mjs — one value,
// enforced by BOTH the cart routes and the checkout gate.

const quantityCeilingError = (res) => res.status(400).json({
  success: false,
  message: `Quantity must be ${MAX_CART_ITEM_QUANTITY} or fewer per item. For a larger order, please contact us.`,
  code: 'QUANTITY_LIMIT_EXCEEDED'
});

const parseOptionalPositiveInteger = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return parsePositiveInteger(value);
};

// firstMoney/toMoneyNumber lived here and returned 0 when nothing resolved —
// superseded 2026-08-16 by services/store/itemPricing.mjs resolveUnitPrice, which
// THROWS instead, and which the ACH and offline rails now share. Do not
// reintroduce a local price fallback: three divergent copies of "what does this
// cost" is precisely how a totalCost-only package came to sell for $0 on ACH.

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

  // A deactivated item must not be purchasable. Without this, a caller could POST a
  // retired package id (still carrying its old totalCost/sessions) and check out at the
  // stale price. It ALSO makes the special-cancel defense real: DELETE /custom-packages
  // flips the hidden item to isActive:false precisely so a revoked deal can't be bought.
  if (storeFrontItem.isActive === false) {
    return { status: 409, message: 'This item is no longer available' };
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

  // Shared resolver (services/store/itemPricing.mjs) — same precedence this rail
  // has always used (variant -> totalCost -> price), now the ONE implementation
  // the ACH and offline rails call too. Those two priced off `price` alone and
  // sold totalCost-only packages for $0 (Kimi HIGH-2 / GLM §4.7, 2026-08-16).
  // An item that cannot be priced is not sellable — refuse instead of carting $0.
  let price;
  try {
    price = resolveUnitPrice(storeFrontItem, variant).toNumber();
  } catch (priceError) {
    if (priceError instanceof UnpriceableItemError) {
      logger.error('[Cart] Refusing to cart an unpriceable item', {
        storefrontItemId: storeFrontItem?.id
      });
      return { status: 409, message: 'This item is not currently available' };
    }
    throw priceError;
  }

  return {
    status: 200,
    storefrontItem: storeFrontItem,
    variant,
    price
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

// NOTE: role promotion (user -> client) deliberately does NOT live here.
// It used to run on POST /add, matching a storefront item's *display name*
// against 'Gold'/'Platinum'/'Rhodium'/'Silver' and writing role: 'client' with
// no payment — any authenticated user could self-promote by adding a package and
// removing it again (GLM security audit 2026-08-15, Finding 2).
// The promotion now happens only on the payment-success path, keyed on sessions
// actually granted: SessionGrantService.buildUserPurchaseUpdate
// (`sessionsToAdd > 0 && user.role === 'user'`) and the equivalent in
// sessionPackageCheckoutFulfillmentService. Do not reintroduce a cart-time write.

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
router.post('/add', protect, cartMutationLimiter, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const ProductVariant = getOptionalProductVariant();

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

    if (normalizedQuantity && normalizedQuantity > MAX_CART_ITEM_QUANTITY) {
      return quantityCeilingError(res);
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

    // Resolve the item FIRST — we need to know whether it's the client's own
    // per-client special before applying the invitation gate below.
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

    // Per-client "SwanStudios Special": only its owning client may add it, and
    // only while it's active/unexpired/redeemable. Ordinary items skip this.
    // A validated owned special is itself the invitation (see the gate below).
    let isOwnedSpecial = false;
    if (snapshot.storefrontItem?.isSpecialOffer) {
      const { default: CustomPackage } = await import('../models/CustomPackage.mjs');
      const { assertClientOwnsActiveSpecial, findSpecialByStorefrontItemId, SpecialOfferError } =
        await import('../services/specialOfferService.mjs');
      try {
        const special = await findSpecialByStorefrontItemId(normalizedStorefrontItemId, { CustomPackage });
        assertClientOwnsActiveSpecial({ customPackage: special, userId: req.authUserId });
        if (normalizedQuantity > 1) {
          return res.status(409).json({ success: false, message: 'A special offer can only be purchased once per order.' });
        }
        isOwnedSpecial = true;
      } catch (e) {
        if (e instanceof SpecialOfferError) {
          return res.status(e.status || 403).json({ success: false, message: e.message, code: e.code });
        }
        throw e;
      }
    }

    // Launch P1-1: store purchasing is invitation-only — requires the
    // admin-granted store-prices flag (admins always pass). EXCEPTION: a
    // client's OWN active special is itself the invitation (its price is shown
    // to them on the store), so it bypasses the global flag requirement.
    if (!isOwnedSpecial && !(await isPriceAccessGranted(req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Store purchasing is by invitation. Contact SwanStudios to request access.',
        code: 'PRICE_ACCESS_REQUIRED'
      });
    }

    logger.debug('[Cart] Adding storefront item to active cart', {
      userId: req.authUserId,
      storefrontItemId: normalizedStorefrontItemId,
      productVariantId: normalizedProductVariantId
    });

    // Find or create the user's active cart with schema-drift recovery.
    const [cart] = await safeFindOrCreateActiveCart(ShoppingCart, req.authUserId, logger);
    if (cart.status !== 'active') {
      return res.status(409).json({
        success: false,
        message: 'Checkout is already in progress for this cart.',
        code: 'CART_CHECKOUT_IN_PROGRESS',
      });
    }

    // Check if item already exists in cart
    let cartItem = await CartItem.findOne({
      where: buildCartItemLookup(cart.id, normalizedStorefrontItemId, normalizedProductVariantId)
    });

    if (cartItem) {
      if (isOwnedSpecial) {
        return res.status(409).json({
          success: false,
          message: 'A special offer can only be purchased once per order.',
          code: 'SPECIAL_QUANTITY_INVALID'
        });
      }
      // Update quantity if item exists
      const nextQuantity = cartItem.quantity + normalizedQuantity;
      if (nextQuantity > MAX_CART_ITEM_QUANTITY) {
        return quantityCeilingError(res);
      }
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
      itemCount: updatedCartItems.length
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
router.put('/update/:itemId', protect, cartMutationLimiter, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
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

    if (normalizedQuantity > MAX_CART_ITEM_QUANTITY) {
      return quantityCeilingError(res);
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

    if (cartItem.storefrontItem?.isSpecialOffer && normalizedQuantity !== 1) {
      return res.status(409).json({
        success: false,
        message: 'A special offer quantity must remain one.',
        code: 'SPECIAL_QUANTITY_INVALID'
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
router.delete('/remove/:itemId', protect, cartMutationLimiter, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
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
router.delete('/clear', protect, cartMutationLimiter, ensureNumericCartUser, validatePurchaseRole, async (req, res) => {
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
 * Release a user-cancelled Stripe Checkout session back to an editable cart.
 * The Stripe session, JWT user, cart metadata, and current pending cart must all
 * agree before state is reopened.
 */
// Rate limited because each hit makes 1-2 Stripe API calls
// (sessions.retrieve / sessions.expire): an authenticated caller could
// otherwise burn the Stripe quota from a single account (GLM-5.3 L2,
// 2026-08-19). checkoutSessionLimiter is the right bucket — this route is part
// of the checkout-session lifecycle, not a cart mutation.
router.post('/cancel-checkout', protect, checkoutSessionLimiter, ensureNumericCartUser, async (req, res) => {
  if (!stripeClient) {
    return res.status(503).json({ success: false, message: 'Payment processing is not configured.' });
  }

  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ success: false, message: 'Valid checkout session ID is required.' });
  }

  try {
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    const normalizedCartId = parsePositiveInteger(session.metadata?.cartId);
    const normalizedSessionUserId = parsePositiveInteger(session.metadata?.userId);

    if (!normalizedCartId || normalizedSessionUserId !== req.authUserId) {
      return res.status(404).json({ success: false, message: 'Checkout session not found.' });
    }
    if (session.payment_status === 'paid' || session.status === 'complete') {
      return res.status(409).json({ success: false, message: 'A completed checkout cannot be cancelled.' });
    }

    if (session.status === 'open') {
      await stripeClient.checkout.sessions.expire(sessionId);
    } else if (session.status !== 'expired') {
      return res.status(409).json({ success: false, message: 'Checkout session cannot be released.' });
    }

    const ShoppingCart = getShoppingCart();
    const [updated] = await ShoppingCart.update(
      {
        status: 'active',
        paymentStatus: 'cancelled',
        checkoutSessionExpired: true,
        checkoutSessionId: null,
        paymentIntentId: null,
      },
      {
        where: {
          id: normalizedCartId,
          userId: req.authUserId,
          status: 'pending_payment',
          checkoutSessionId: sessionId,
        },
      },
    );

    if (updated !== 1) {
      const currentCart = await ShoppingCart.findOne({
        where: { id: normalizedCartId, userId: req.authUserId },
        attributes: ['id', 'status', 'checkoutSessionId'],
      });
      if (currentCart?.status === 'active' && !currentCart.checkoutSessionId) {
        return res.json({
          success: true,
          cartId: normalizedCartId,
          status: 'active',
          alreadyReleased: true,
        });
      }
      return res.status(409).json({
        success: false,
        message: 'This checkout is no longer the active pending session.',
      });
    }

    return res.json({ success: true, cartId: normalizedCartId, status: 'active' });
  } catch (error) {
    logCartError('[Cart] Failed to cancel checkout session', error, req);
    return sendInternalError(res, 'Failed to cancel checkout session');
  }
});
/**
 * Webhook handler for Stripe events
 * POST /api/cart/webhook
 *
 * DELEGATES to the canonical handler — it does not reimplement it.
 *
 * This route used to carry its own switch covering exactly two events
 * (checkout.session.completed, checkout.session.expired). Every event type the
 * canonical handler gained — payment_intent.succeeded/processing/payment_failed,
 * charge.refunded, charge.dispute.created — fell through to `default` here and was
 * SILENTLY 200-ACKED. Stripe saw success and never redelivered, so whether a refund
 * was detected at all depended on which URL the dashboard happened to point at
 * (Kimi K3 HIGH-2, round 2).
 *
 * The two copies had already drifted once, on checkout.session.expired: legacy
 * released the cart, canonical only flagged it. One handler, one contract.
 *
 * express.raw stays HERE because signature verification needs the untouched Buffer
 * and the global JSON parser is bypassed for this path (see core/middleware).
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // LAZY import, deliberately. A static import pulls the canonical handler's entire
  // dependency graph (models, notification, commission, gamification, session
  // services) into every module that imports cartRoutes — which broke four test
  // suites whose mocks legitimately only cover the cart's own dependencies. Node
  // caches the module, so this resolves once per process.
  const { stripeWebhookHandler } = await import('../webhooks/stripeWebhook.mjs');
  return stripeWebhookHandler(req, res);
});

// DELETE the /api/cart/checkout/success route - It's insecure
// The backend should rely SOLELY on the 'checkout.session.completed' webhook event
// to fulfill orders/update status, not a redirect from the frontend.

export default router;
