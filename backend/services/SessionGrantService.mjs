/**
 * SessionGrantService.mjs - Shared Session Granting Service
 * ==========================================================
 * Single source of truth for granting session credits after payment.
 * Called by BOTH verify-session endpoint AND Stripe webhook handler.
 *
 * Architecture:
 *   grantSessionsForCart(cartId, userId, grantedBy)
 *     1. Opens DB transaction
 *     2. Fetches cart with row lock (SELECT ... FOR UPDATE)
 *     3. Idempotency check: sessionsGranted === true -> early return
 *     4. Calculates sessions from cart items
 *     5. Atomic increment: user.increment('availableSessions', { by: N })
 *     6. Updates cart: sessionsGranted=true, status='completed'
 *     7. Commits; rolls back on error
 *
 * Callers:
 *   - POST /api/v2/payments/verify-session  (grantedBy: 'verify-session')
 *   - POST /api/cart/webhook                (grantedBy: 'webhook')
 *   - scripts/reconcile-ungrant-carts.mjs   (grantedBy: 'reconciliation')
 */

import sequelize from '../database.mjs';
import { getShoppingCart, getCartItem, getStorefrontItem, getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import {
  createCartOrderIfPossible,
  loadOptionalFulfillmentModels,
} from './cartCheckoutFulfillmentService.mjs';
import { isNonDeductingClient } from './sessionBillingPolicy.mjs';

export function getStorefrontSessionCredits(storefrontItem) {
  const directSessions = Number(storefrontItem?.sessions || 0);
  if (Number.isFinite(directSessions) && directSessions > 0) {
    return directSessions;
  }

  const totalSessions = Number(storefrontItem?.totalSessions || 0);
  if (Number.isFinite(totalSessions) && totalSessions > 0) {
    return totalSessions;
  }

  return 0;
}

export function getCartItemSessionCredits(cartItem) {
  const quantity = Number(cartItem?.quantity || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }

  return getStorefrontSessionCredits(cartItem?.storefrontItem) * quantity;
}

export function calculateCartSessionCredits(cartItems = []) {
  return cartItems.reduce((sum, item) => sum + getCartItemSessionCredits(item), 0);
}

async function findLockedCart({
  ShoppingCart,
  CartItem,
  StorefrontItem,
  ProductVariant,
  User,
  cartId,
  userId,
  transaction,
}) {
  const cartItemIncludes = [{ model: StorefrontItem, as: 'storefrontItem' }];

  if (ProductVariant) {
    cartItemIncludes.push({
      model: ProductVariant,
      as: 'productVariant',
      required: false,
    });
  }

  return ShoppingCart.findOne({
    where: { id: cartId, userId },
    include: [
      {
        model: CartItem,
        as: 'cartItems',
        include: cartItemIncludes,
      },
      {
        model: User,
        as: 'user',
      },
    ],
    lock: {
      level: transaction.LOCK.UPDATE,
      of: ShoppingCart,
    },
    transaction,
  });
}

async function findLockedUser(User, cart, userId, transaction) {
  const user = await User.findByPk(cart.userId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!user) {
    throw new Error(`User ${userId} not found for cart ${cart.id}`);
  }

  return user;
}

function buildUserPurchaseUpdate(user, sessionsToAdd) {
  const userPurchaseUpdate = {
    hasPurchasedBefore: true,
    lastPurchaseDate: new Date(),
  };

  if (sessionsToAdd > 0 && user.role === 'user') {
    userPurchaseUpdate.role = 'client';
  }

  if (sessionsToAdd > 0 && isNonDeductingClient(user)) {
    userPurchaseUpdate.clientSource = 'swanstudios';
    userPurchaseUpdate.sessionBillingMode = 'paid_sessions';
  }

  return userPurchaseUpdate;
}

async function markCartCompleted({ cart, grantedBy, sessionsToAdd, fulfillment, transaction }) {
  await cart.update({
    status: 'completed',
    paymentStatus: 'paid',
    completedAt: new Date(),
    sessionsGranted: true,
    stripeSessionData: JSON.stringify({
      grantedBy,
      grantedAt: new Date().toISOString(),
      sessionsAdded: sessionsToAdd,
      productItemsFulfilled: fulfillment.productItemsFulfilled,
      orderId: fulfillment.orderId,
      previousCartStatus: cart.status,
    }),
  }, { transaction });
}

/**
 * Atomically grants sessions for a completed cart.
 * Uses DB transaction with row-level lock to prevent race conditions.
 * Idempotent: if sessionsGranted === true, returns early without granting.
 *
 * @param {number} cartId - ShoppingCart.id
 * @param {number} userId - User.id (owner of the cart)
 * @param {string} grantedBy - 'verify-session' | 'webhook' | 'reconciliation'
 * @returns {Promise<{granted: boolean, sessionsAdded: number, alreadyProcessed: boolean}>}
 */
export async function grantSessionsForCart(cartId, userId, grantedBy) {
  const transaction = await sequelize.transaction();

  try {
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();
    const { ProductVariant, Order, OrderItem } = await loadOptionalFulfillmentModels();

    // Fetch cart with row lock to prevent concurrent grant attempts
    const cart = await findLockedCart({
      ShoppingCart,
      CartItem,
      StorefrontItem,
      ProductVariant,
      User,
      cartId,
      userId,
      transaction,
    });

    if (!cart) {
      throw new Error(`Cart ${cartId} not found for user ${userId}`);
    }

    // IDEMPOTENCY CHECK: Only check sessionsGranted flag
    // Do NOT check status === 'completed' (webhook sets this before verify-session)
    if (cart.sessionsGranted === true) {
      await transaction.rollback();
      logger.info(`[SessionGrant] Cart ${cartId} already granted (idempotent, caller: ${grantedBy})`);
      return { granted: false, sessionsAdded: 0, alreadyProcessed: true };
    }

    const sessionsToAdd = calculateCartSessionCredits(cart.cartItems);

    const user = await findLockedUser(User, cart, userId, transaction);

    // Atomic session increment (not read-then-write)
    if (sessionsToAdd > 0) {
      await user.increment('availableSessions', {
        by: sessionsToAdd,
        transaction
      });
    }

    await user.update(buildUserPurchaseUpdate(user, sessionsToAdd), { transaction });

    const fulfillment = await createCartOrderIfPossible({
      cart,
      user,
      grantedBy,
      sessionsToAdd,
      transaction,
      Order,
      OrderItem,
      getCartItemSessionCredits,
    });

    await markCartCompleted({ cart, grantedBy, sessionsToAdd, fulfillment, transaction });

    await transaction.commit();

    logger.info(`[SessionGrant] Granted ${sessionsToAdd} sessions for cart ${cartId} (user ${userId}, caller: ${grantedBy})`);

    return {
      granted: true,
      sessionsAdded: sessionsToAdd,
      alreadyProcessed: false,
      productItemsFulfilled: fulfillment.productItemsFulfilled,
      orderId: fulfillment.orderId,
    };

  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Transaction may already be finished (committed/rolled back); log but don't mask original error
      logger.warn(`[SessionGrant] Rollback warning for cart ${cartId}: ${rollbackError.message}`);
    }
    logger.error(`[SessionGrant] Failed for cart ${cartId} (user ${userId}, caller: ${grantedBy}): ${error.message}`);
    throw error;
  }
}
