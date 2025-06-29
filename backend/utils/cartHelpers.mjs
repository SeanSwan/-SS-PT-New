/**
 * Cart Helpers Utility - SwanStudios Platform
 * ==========================================
 * Centralized cart calculation and session tracking utilities
 * 
 * Following Master Prompt v30 principles:
 * - Extreme modularity with reusable functions
 * - Defensive programming with comprehensive error handling
 * - Session-aware calculations for future workout integration
 * - Production-ready with detailed logging
 * - Transaction-safe database operations
 * 
 * Key Features:
 * - Consistent cart total calculation across all operations
 * - Session count tracking from StorefrontItems
 * - Database persistence with fallback handling
 * - Comprehensive audit logging
 * - Integration points for future workout session consumption
 */

import logger from './logger.mjs';
// 🚀 ENHANCED P0 FIX: Coordinated model imports for production stability
import { 
  getShoppingCart,
  getCartItem, 
  getStorefrontItem
} from '../models/index.mjs';

// 🎯 ENHANCED P0 FIX: Lazy loading models to prevent initialization race condition
// Models will be retrieved via getter functions inside each function when needed

/**
 * Calculate cart total and session count from cart items
 * @param {Array} cartItems - Array of cart items with populated storefrontItem
 * @returns {Object} - { total: number, totalSessions: number, itemBreakdown: Array }
 */
export const calculateCartTotals = (cartItems) => {
  try {
    let total = 0;
    let totalSessions = 0;
    const itemBreakdown = [];

    if (!cartItems || !Array.isArray(cartItems)) {
      logger.warn('calculateCartTotals: Invalid cartItems provided', { cartItems });
      return { total: 0, totalSessions: 0, itemBreakdown: [] };
    }
    
    // 🎯 P0 CRITICAL DEBUG: Log association status
    const itemsWithStorefront = cartItems.filter(item => item.storefrontItem);
    const itemsWithoutStorefront = cartItems.filter(item => !item.storefrontItem);
    
    logger.info('🔗 P0 DEBUG: calculateCartTotals association analysis', {
      totalItems: cartItems.length,
      itemsWithStorefrontData: itemsWithStorefront.length,
      itemsWithoutStorefrontData: itemsWithoutStorefront.length,
      firstItemHasStorefront: cartItems[0]?.storefrontItem ? true : false,
      sampleStorefrontKeys: cartItems[0]?.storefrontItem ? Object.keys(cartItems[0].storefrontItem) : 'none'
    });
    
    if (itemsWithoutStorefront.length > 0) {
      logger.error('❌ P0 CRITICAL ERROR: CartItems missing StorefrontItem association data', {
        itemsWithoutData: itemsWithoutStorefront.map(item => ({ id: item.id, storefrontItemId: item.storefrontItemId }))
      });
    }

    cartItems.forEach((item, index) => {
      try {
        // Validate cart item structure
        if (!item || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
          logger.warn(`calculateCartTotals: Invalid cart item at index ${index}`, { item });
          return;
        }

        // Calculate item total
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        // Calculate sessions for this item
        let itemSessions = 0;
        if (item.storefrontItem && typeof item.storefrontItem.sessions === 'number') {
          itemSessions = item.storefrontItem.sessions * item.quantity;
          totalSessions += itemSessions;
        } else if (item.storefrontItem && typeof item.storefrontItem.totalSessions === 'number') {
          // Fallback to totalSessions for monthly packages
          itemSessions = item.storefrontItem.totalSessions * item.quantity;
          totalSessions += itemSessions;
        }

        // Track breakdown for audit purposes
        itemBreakdown.push({
          cartItemId: item.id,
          storefrontItemId: item.storefrontItemId,
          storefrontItemName: item.storefrontItem?.name || 'Unknown Item',
          quantity: item.quantity,
          pricePerItem: item.price,
          itemTotal,
          sessionsPerItem: item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0,
          totalSessionsForItem: itemSessions
        });

        logger.debug(`calculateCartTotals: Processed item ${item.id}`, {
          itemTotal,
          itemSessions,
          runningTotal: total,
          runningSessions: totalSessions
        });

      } catch (itemError) {
        logger.error(`calculateCartTotals: Error processing cart item ${index}`, { 
          error: itemError.message,
          item 
        });
      }
    });

    const result = {
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
      totalSessions,
      itemBreakdown
    };

    logger.info('🧮 calculateCartTotals: Calculation complete', {
      itemCount: cartItems.length,
      total: result.total,
      totalSessions: result.totalSessions,
      hasValidItems: itemBreakdown.length > 0,
      calculationMethod: 'helper_function'
    });

    return result;

  } catch (error) {
    logger.error('calculateCartTotals: Unexpected error', { error: error.message });
    return { total: 0, totalSessions: 0, itemBreakdown: [] };
  }
};

/**
 * Persist cart totals to database with comprehensive error handling
 * @param {number} cartId - Cart ID to update
 * @param {number} total - Calculated total to save
 * @param {number} totalSessions - Total sessions count
 * @param {Object} options - Additional options { transaction, skipLogging }
 * @returns {Promise<boolean>} - Success status
 */
export const persistCartTotals = async (cartId, total, totalSessions, options = {}) => {
  const { transaction, skipLogging = false } = options;

  try {
    // 🎯 ENHANCED P0 FIX: Lazy load model to prevent race condition
    const ShoppingCart = getShoppingCart();
    
    if (!cartId || typeof total !== 'number' || typeof totalSessions !== 'number') {
      throw new Error('Invalid parameters for persistCartTotals');
    }

    // Find the cart
    const cart = await ShoppingCart.findByPk(cartId, { transaction });
    
    if (!cart) {
      throw new Error(`Cart not found with ID: ${cartId}`);
    }

    // Update cart with totals
    const updateData = {
      total: Math.round(total * 100) / 100, // Ensure 2 decimal places
      lastActivityAt: new Date()
    };

    // Note: totalSessions will be added to ShoppingCart model in Phase 2
    // For now, we just update the total

    await cart.update(updateData, { transaction });

    if (!skipLogging) {
      logger.info('💾 persistCartTotals: Cart totals persisted to database', {
        cartId,
        newTotal: updateData.total,
        totalSessions,
        previousTotal: cart.total,
        totalChanged: cart.total !== updateData.total
      });
    }

    return true;

  } catch (error) {
    logger.error('persistCartTotals: Failed to persist cart totals', {
      cartId,
      total,
      totalSessions,
      error: error.message
    });
    return false;
  }
};

/**
 * Comprehensive cart total calculation and persistence
 * Fetches cart items, calculates totals, and saves to database
 * @param {number} cartId - Cart ID to process
 * @param {Object} options - Additional options { transaction, skipLogging }
 * @returns {Promise<Object>} - { success: boolean, total: number, totalSessions: number, error?: string }
 */
export const updateCartTotals = async (cartId, options = {}) => {
  const { transaction, skipLogging = false } = options;

  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    
    if (!cartId) {
      throw new Error('Cart ID is required');
    }

    // Fetch cart with items and storefront item details
    const cart = await ShoppingCart.findByPk(cartId, {
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem',
          attributes: ['id', 'name', 'sessions', 'totalSessions', 'packageType']
        }]
      }],
      transaction
    });

    if (!cart) {
      throw new Error(`Cart not found with ID: ${cartId}`);
    }

    if (!cart.cartItems || cart.cartItems.length === 0) {
      // Empty cart - set totals to zero
      const success = await persistCartTotals(cartId, 0, 0, { transaction, skipLogging });
      return {
        success,
        total: 0,
        totalSessions: 0,
        error: success ? null : 'Failed to persist empty cart totals'
      };
    }

    // Calculate totals using cart items
    const { total, totalSessions, itemBreakdown } = calculateCartTotals(cart.cartItems);

    // Persist totals to database
    const success = await persistCartTotals(cartId, total, totalSessions, { transaction, skipLogging });

    if (!skipLogging) {
      logger.info('🔄 updateCartTotals: Complete cart update cycle finished', {
        cartId,
        itemCount: cart.cartItems.length,
        calculatedTotal: total,
        totalSessions,
        persistenceSuccess: success,
        operation: 'full_cart_update'
      });
    }

    return {
      success,
      total,
      totalSessions,
      itemBreakdown,
      error: success ? null : 'Failed to persist calculated totals'
    };

  } catch (error) {
    logger.error('updateCartTotals: Failed to update cart totals', {
      cartId,
      error: error.message
    });

    return {
      success: false,
      total: 0,
      totalSessions: 0,
      error: error.message
    };
  }
};

/**
 * Get cart totals with fallback calculation
 * Used by payment system as defensive programming measure
 * @param {Object} cart - Cart object with cartItems
 * @returns {Object} - { total: number, totalSessions: number, source: string }
 */
export const getCartTotalsWithFallback = (cart) => {
  try {
    if (!cart) {
      return { total: 0, totalSessions: 0, source: 'no_cart' };
    }

    // First, try to use persisted total from database
    if (cart.total && cart.total > 0) {
      logger.debug('💰 getCartTotalsWithFallback: Using persisted database total', {
        cartId: cart.id,
        persistedTotal: cart.total,
        source: 'database_persisted'
      });

      // Calculate sessions from cart items for completeness
      const { totalSessions } = calculateCartTotals(cart.cartItems || []);

      return {
        total: cart.total,
        totalSessions,
        source: 'persisted'
      };
    }

    // Fallback: Calculate from cart items
    if (cart.cartItems && cart.cartItems.length > 0) {
      const { total, totalSessions } = calculateCartTotals(cart.cartItems);

      logger.warn('⚠️ getCartTotalsWithFallback: Database total missing, using calculated fallback', {
        cartId: cart.id,
        calculatedTotal: total,
        totalSessions,
        fallbackReason: 'missing_or_zero_persisted_total'
      });

      return {
        total,
        totalSessions,
        source: 'calculated_fallback'
      };
    }

    // Empty or invalid cart
    return { total: 0, totalSessions: 0, source: 'empty_cart' };

  } catch (error) {
    logger.error('getCartTotalsWithFallback: Error getting cart totals', { error: error.message });
    return { total: 0, totalSessions: 0, source: 'error' };
  }
};

/**
 * Validate cart item session data
 * Ensures session counts are properly linked from StorefrontItems
 * @param {number} cartItemId - Cart item ID to validate
 * @returns {Promise<Object>} - { valid: boolean, sessions: number, error?: string }
 */
export const validateCartItemSessions = async (cartItemId) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    
    const cartItem = await CartItem.findByPk(cartItemId, {
      include: [{
        model: StorefrontItem,
        as: 'storefrontItem',
        attributes: ['id', 'name', 'sessions', 'totalSessions', 'packageType']
      }]
    });

    if (!cartItem) {
      return { valid: false, sessions: 0, error: 'Cart item not found' };
    }

    if (!cartItem.storefrontItem) {
      return { valid: false, sessions: 0, error: 'Storefront item not found' };
    }

    const storefrontItem = cartItem.storefrontItem;
    let sessions = 0;

    // Determine session count based on package type
    if (storefrontItem.packageType === 'fixed' && typeof storefrontItem.sessions === 'number') {
      sessions = storefrontItem.sessions;
    } else if (storefrontItem.packageType === 'monthly' && typeof storefrontItem.totalSessions === 'number') {
      sessions = storefrontItem.totalSessions;
    }

    const totalSessions = sessions * cartItem.quantity;

    logger.debug('validateCartItemSessions: Validation complete', {
      cartItemId,
      storefrontItemId: storefrontItem.id,
      packageType: storefrontItem.packageType,
      sessionsPerItem: sessions,
      quantity: cartItem.quantity,
      totalSessions
    });

    return {
      valid: sessions > 0,
      sessions: totalSessions,
      sessionsPerItem: sessions,
      packageType: storefrontItem.packageType
    };

  } catch (error) {
    logger.error('validateCartItemSessions: Validation failed', {
      cartItemId,
      error: error.message
    });

    return {
      valid: false,
      sessions: 0,
      error: error.message
    };
  }
};

/**
 * Debug helper to log cart state for troubleshooting
 * @param {number} cartId - Cart ID to debug
 * @param {string} context - Context/operation being debugged
 */
export const debugCartState = async (cartId, context = 'unknown') => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    
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
      logger.debug('debugCartState: Cart not found', { cartId, context });
      return;
    }

    const { total, totalSessions, itemBreakdown } = calculateCartTotals(cart.cartItems || []);

    logger.debug('🔍 debugCartState: Complete cart state analysis', {
      context,
      cartId,
      status: cart.status,
      persistedTotal: cart.total,
      calculatedTotal: total,
      totalSessions,
      itemCount: cart.cartItems?.length || 0,
      totalsMismatch: cart.total !== total,
      lastActivityAt: cart.lastActivityAt,
      debugTimestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('debugCartState: Debug failed', { cartId, context, error: error.message });
  }
};

export default {
  calculateCartTotals,
  persistCartTotals,
  updateCartTotals,
  getCartTotalsWithFallback,
  validateCartItemSessions,
  debugCartState
};
