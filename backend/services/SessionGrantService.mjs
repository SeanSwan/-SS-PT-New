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

    // Fetch cart with row lock to prevent concurrent grant attempts
    const cart = await ShoppingCart.findOne({
      where: { id: cartId, userId },
      include: [
        {
          model: CartItem,
          as: 'cartItems',
          include: [{ model: StorefrontItem, as: 'storefrontItem' }]
        },
        {
          model: User,
          as: 'user'
        }
      ],
      lock: transaction.LOCK.UPDATE,
      transaction
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

    // Calculate sessions from cart items
    const sessionsToAdd = cart.cartItems.reduce((sum, item) => {
      return sum + ((item.storefrontItem?.sessions || 0) * (item.quantity || 0));
    }, 0);

    // Lock user row before incrementing to prevent lost updates
    const user = await User.findByPk(cart.userId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!user) {
      throw new Error(`User ${userId} not found for cart ${cartId}`);
    }

    // Atomic session increment (not read-then-write)
    if (sessionsToAdd > 0) {
      await user.increment('availableSessions', {
        by: sessionsToAdd,
        transaction
      });
    }

    // Update user purchase flags
    await user.update({
      hasPurchasedBefore: true,
      lastPurchaseDate: new Date()
    }, { transaction });

    // Update cart with idempotency flag + completion
    await cart.update({
      status: 'completed',
      paymentStatus: 'paid',
      completedAt: new Date(),
      sessionsGranted: true,
      stripeSessionData: JSON.stringify({
        grantedBy,
        grantedAt: new Date().toISOString(),
        sessionsAdded: sessionsToAdd,
        previousCartStatus: cart.status
      })
    }, { transaction });

    await transaction.commit();

    logger.info(`[SessionGrant] Granted ${sessionsToAdd} sessions for cart ${cartId} (user ${userId}, caller: ${grantedBy})`);

    return { granted: true, sessionsAdded: sessionsToAdd, alreadyProcessed: false };

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
