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
import {
  hydrateCartCheckoutItems,
  readCartCheckoutSnapshot,
} from './cartCheckoutSnapshotService.mjs';

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
  const checkoutSnapshot = readCartCheckoutSnapshot(cart);
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
      ...(checkoutSnapshot && { checkoutSnapshot }),
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
export async function grantSessionsForCart(cartId, userId, grantedBy, { checkoutSessionId, amountTotalCents = null } = {}) {
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

    // IDEMPOTENCY FIRST — before the ownership check, deliberately.
    //
    // An already-granted cart needs no further work no matter WHICH session asks, so
    // answering "already done" is always correct and always safe. Running the
    // ownership check first meant a second session for an already-fulfilled cart
    // THREW instead: 500 -> Stripe retries forever -> the endpoint-disabling risk,
    // on a cart that was in fact correctly granted.
    //
    // That is reachable: a customer whose checkout crashed twice has two orphan
    // sessions naming one cart. The first adopts and grants; the second then sees a
    // cart holding a different id and threw. Found by attacking my own adoption
    // change (2026-08-16) — adoption writes an id where there was none, which makes
    // this ordering bug easier to hit than it was before.
    //
    // Do NOT check status === 'completed' here (the webhook sets that before
    // verify-session runs); `sessionsGranted` is the only true idempotency key.
    if (cart.sessionsGranted === true) {
      await transaction.rollback();
      logger.info(`[SessionGrant] Cart ${cartId} already granted (idempotent, caller: ${grantedBy})`);
      return { granted: false, sessionsAdded: 0, alreadyProcessed: true };
    }

    // ABSENCE IS NOT MISMATCH.
    //
    // This used to be `if (checkoutSessionId && cart.checkoutSessionId !== ...)`, which
    // treated a NULL cart session id as a mismatch and threw. That is exactly the
    // crash-window shape: v2PaymentRoutes nulls checkoutSessionId when it claims the
    // cart, creates a live payable Stripe session, then writes the id back. A process
    // death in between (deploy, OOM, recycle) leaves an unclaimed cart and a payable
    // session — so when the customer paid, this threw, the webhook 500'd, Stripe
    // retried the same failure forever, and sustained failures risk Stripe disabling
    // the endpoint and killing fulfilment for ALL sales. Money captured, nothing
    // granted (Kimi K3 CRITICAL-1, 2026-08-16).
    //
    // A cart holding NO session id is UNCLAIMED, so the first Stripe-signed event that
    // names it may adopt it. That is safe: `metadata.cartId` is written server-side at
    // session creation, and callers derive userId from `cart.userId`, never from the
    // event — so an adopted grant cannot cross users. A cart holding a DIFFERENT
    // session id is still a hard error.
    // A DIFFERENT session id is a TERMINAL condition, not a retryable error.
    //
    // This threw, and throwing was wrong for a PAID event. Reachable sequence: the
    // sweeper releases a stranded cart to `active`, the customer re-checks-out (which
    // writes a NEW checkoutSessionId), and then the ORIGINAL orphan session is paid.
    // The cart is not granted, so the idempotency short-circuit above does not apply,
    // and the throw 500s the webhook. Stripe then retries a signed, PAID event forever
    // against a state that can never change — which is precisely the endpoint-disabling
    // condition this whole fix family exists to avoid, and the customer's money is
    // captured with nothing fulfilled and nobody told (Kimi K3 H2, 2026-08-19).
    //
    // No redelivery can resolve it, so retrying is pure harm. Terminate and surface it:
    // captured money that can never own its cart is a refund decision for a human.
    if (checkoutSessionId && cart.checkoutSessionId && cart.checkoutSessionId !== checkoutSessionId) {
      await transaction.rollback();
      logger.error('[SessionGrant] TERMINAL — paid session does not own cart', {
        cartId,
        grantedBy,
        eventSessionId: checkoutSessionId,
        cartSessionId: cart.checkoutSessionId,
      });
      return {
        granted: false,
        sessionsAdded: 0,
        alreadyProcessed: false,
        unfulfillable: true,
        reason: 'SESSION_DOES_NOT_OWN_CART',
        alertContext: {
          cartId,
          userId: cart.userId,
          eventSessionId: checkoutSessionId,
          cartSessionId: cart.checkoutSessionId,
          amountTotalCents: amountTotalCents === null ? null : Number(amountTotalCents),
        },
      };
    }

    if (checkoutSessionId && !cart.checkoutSessionId) {
      // ADOPTION REQUIRES THE AMOUNTS TO AGREE.
      //
      // Adoption is reached exactly when the finalize write never happened, which is
      // also exactly when the checkout SNAPSHOT was never written — so hydration falls
      // through to LIVE cart rows. Meanwhile the sweeper deliberately returns the cart
      // to `active`, which makes it editable again. Compose the two and a customer can
      // pay a $60 orphan session, add a $5,000 package to the released cart, and have
      // the adoption branch grant the full $5,060 (Kimi K3 HIGH-1 / GLM-5.3 MEDIUM-1,
      // round 2 — found independently by both).
      //
      // The user-crossing argument for adoption is sound; it says nothing about VALUE
      // crossing. So require what Stripe actually charged to match what this cart is
      // worth right now. Honest recovery (cart untouched) still adopts and grants;
      // a mutated cart does not.
      // VERIFIABILITY, not equality. The first version of this guard compared
      // `session.amount_total` to `cart.total` and refused on any difference. Two
      // defects, both found by Kimi K3 on 2026-08-19:
      //
      //   (a) FALSE REFUSALS BY CONSTRUCTION. v2PaymentRoutes creates sessions with
      //       `automatic_tax` and `allow_promotion_codes`, so `amount_total` INCLUDES
      //       tax and REFLECTS discounts — while `cart.total` is written pre-tax
      //       (`const total = subtotal`) and pre-discount. Every taxable or
      //       promo-code cart therefore mismatched, and an HONEST crash-window
      //       payment was refused — the exact recovery this branch exists to serve.
      //
      //   (b) THE GUARD WAS SKIPPED when `cartTotalCents > 0` was false. Totals
      //       persistence is explicitly non-fatal in cartRoutes ("Failed to persist
      //       totals, continuing"), so a cart with a stale/zero total bypassed the
      //       check entirely and the original $5,060 over-grant survived intact.
      //
      // So: auto-grant ONLY when the amounts agree exactly — the clean, common case
      // of an untaxed, undiscounted cart that nobody touched. Everything else is
      // UNVERIFIABLE, not necessarily fraudulent, and must be held for a human rather
      // than silently granted or silently dropped. Unverifiable now includes a zero or
      // missing cart total, which used to mean "skip the check".
      const cartTotalCents = Math.round(Number(cart.total ?? 0) * 100);
      const amountKnown = amountTotalCents !== null;
      const totalKnown = Number.isFinite(cartTotalCents) && cartTotalCents > 0;
      const amountsAgree = amountKnown && totalKnown
        && Number(amountTotalCents) === cartTotalCents;

      if (!amountsAgree) {
        await transaction.rollback();
        logger.error('[SessionGrant] HOLDING adoption — cannot verify charged amount', {
          cartId,
          grantedBy,
          amountTotalCents: amountKnown ? Number(amountTotalCents) : null,
          cartTotalCents: totalKnown ? cartTotalCents : null,
          reasonDetail: !amountKnown
            ? 'no amount supplied by caller'
            : !totalKnown
              ? 'cart total missing or zero'
              : 'amount does not match cart total (tax/discount/mutation)',
        });
        return {
          granted: false,
          sessionsAdded: 0,
          alreadyProcessed: false,
          unfulfillable: true,
          alertContext: {
            cartId,
            userId: cart.userId,
            eventSessionId: checkoutSessionId,
            amountTotalCents: amountKnown ? Number(amountTotalCents) : null,
            cartTotalCents: totalKnown ? cartTotalCents : null,
          },
          adoptionRefused: true,
          reason: 'ADOPTION_UNVERIFIABLE',
        };
      }

      // Adopt the orphaned session so a later redelivery sees a claimed cart rather
      // than racing this same branch again.
      cart.checkoutSessionId = checkoutSessionId;
      logger.warn(`[SessionGrant] Cart ${cartId} adopted orphaned checkout session (crash-window recovery)`, {
        cartId,
        grantedBy,
        amountTotalCents: amountTotalCents === null ? null : Number(amountTotalCents),
      });
    }

    cart.cartItems = await hydrateCartCheckoutItems({
      cart,
      StorefrontItem,
      ProductVariant,
      transaction,
    });
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

    // Burn down any per-client "SwanStudios Special" in this cart, atomically
    // with the credit — so a one_time/n_times deal can't be re-purchased. Gated
    // on a cheap in-memory check of the already-loaded cart items, so ordinary
    // carts do ZERO extra work and have no dependency on the special feature.
    const cartHasSpecial = Array.isArray(cart.cartItems)
      && cart.cartItems.some((ci) => ci?.storefrontItem?.isSpecialOffer === true);
    if (cartHasSpecial) {
      try {
        const { default: CustomPackage } = await import('../models/CustomPackage.mjs');
        const { recordCartSpecialRedemptions } = await import('./specialOfferService.mjs');
        await recordCartSpecialRedemptions({
          cartItems: cart.cartItems,
          userId,
          CustomPackage,
          transaction,
        });
      } catch (specialErr) {
        // A special-redemption failure MUST abort the whole grant (don't credit
        // sessions for a deal we couldn't record) — rethrow into the outer catch.
        logger.error(`[SessionGrant] special redemption recording failed for cart ${cartId}: ${specialErr.message}`);
        throw specialErr;
      }
    }

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
