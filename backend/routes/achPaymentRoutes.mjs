/**
 * ACH Payment Routes
 * ==================
 * Creates Stripe PaymentIntents with `us_bank_account` payment method.
 * ACH transfers take 1-3 business days to process.
 *
 * Flow:
 * 1. Frontend calls POST /api/payments/ach/create-intent
 * 2. Backend creates PaymentIntent with us_bank_account
 * 3. Frontend uses Stripe.js to collect bank details & confirm
 * 4. Webhook receives payment_intent.processing → payment_intent.succeeded
 *
 * Endpoints:
 * - POST /api/payments/ach/create-intent — Create ACH PaymentIntent
 */
import express from 'express';
import Stripe from 'stripe';
import Decimal from 'decimal.js';
import { protect } from '../middleware/authMiddleware.mjs';
// Money-path rate limit: each accepted call mints a real Stripe PaymentIntent and
// an Order row. It was the only direct rail with no limiter (Kimi MEDIUM-1 / GLM M4).
import { checkoutSessionLimiter } from '../middleware/moneyPathRateLimits.mjs';
import { isPriceAccessGranted } from '../services/store/priceVisibilityService.mjs';
import Order from '../models/Order.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { generateSwanOrderNumber } from '../utils/orderNumber.mjs';
// NAMED import — validated at link time. Destructuring this off the default
// export binds `undefined` (it is not on the default object) and silently
// disables the ceiling below. See the note in cartRoutes.mjs.
import { MAX_CART_ITEM_QUANTITY, MAX_PAYMENT_LINE_ITEMS } from '../utils/cartHelpers.mjs';
import { resolveUnitPrice, UnpriceableItemError } from '../services/store/itemPricing.mjs';
import {
  claimIdempotentRecord,
} from '../utils/paymentIdempotency.mjs';
import {
  backfillMissingPaymentOrderItems,
  createPaymentOrderItems,
} from '../services/offlinePaymentOrderItems.mjs';

const router = express.Router();

let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  }
} catch (err) {
  logger.error('[ACH] Stripe init failed:', err.message);
}

/**
 * POST /api/payments/ach/create-intent
 * Create a Stripe PaymentIntent for ACH/eCheck
 */
router.post('/create-intent', protect, checkoutSessionLimiter, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ success: false, message: 'Payment processing unavailable' });
  }

  try {
    const userId = req.user.id;
    const { items, customerInfo, total, idempotencyKey } = req.body;

    if (!items?.length || !total) {
      return res.status(400).json({ success: false, message: 'Items and total are required' });
    }

    // A non-finite client total makes the $0.02 tolerance check below a no-op:
    // NaN comparisons are always false, so the guard silently stops guarding
    // (Kimi LOW-3). Reject before any Decimal work — `new Decimal('abc')` also
    // throws straight into the 500 handler, which is a 400-shaped problem.
    const clientTotalNumber = Number(total);
    if (!Number.isFinite(clientTotalNumber)) {
      return res.status(400).json({
        success: false,
        message: 'A valid order total is required',
        code: 'INVALID_TOTAL'
      });
    }

    // Per-line quantity is capped below, but the REQUEST is what overflows:
    // repeating a max-quantity line aggregates past Order.totalAmount's
    // DECIMAL(10,2) ceiling. Bound the line count too.
    if (items.length > MAX_PAYMENT_LINE_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `An order may contain at most ${MAX_PAYMENT_LINE_ITEMS} line items.`,
        code: 'TOO_MANY_LINE_ITEMS'
      });
    }

    // Launch P1-1: purchasing is invitation-only across all rails
    if (!(await isPriceAccessGranted(req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Store purchasing is by invitation. Contact SwanStudios to request access.',
        code: 'PRICE_ACCESS_REQUIRED'
      });
    }

    // Validate idempotency key (must be UUIDv4)
    if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing idempotency key' });
    }

    const existingOrder = await Order.findOne({ where: { userId, idempotencyKey } });
    if (existingOrder) {
      if (!existingOrder.paymentId) {
        return res.status(409).json({
          success: false,
          code: 'PAYMENT_ATTEMPT_INCOMPLETE',
          message: 'A matching payment attempt is still being prepared. Please retry shortly.',
        });
      }

      const existingIntent = await stripe.paymentIntents.retrieve(existingOrder.paymentId);
      const existingNotes = (() => {
        try {
          return existingOrder.notes ? JSON.parse(existingOrder.notes) : {};
        } catch {
          return {};
        }
      })();
      const existingItems = Array.isArray(existingNotes.items) ? existingNotes.items : items;
      // DELIBERATELY not filtered by isActive (unlike the pricing lookup below).
      // This is the idempotency REPLAY path: it backfills order-item rows for an
      // order that was ALREADY legitimately placed. An item retired after that
      // purchase must still resolve, or a real customer's completed order stops
      // reconciling. Do not "harden" this to match the pricing lookup.
      const existingDbItems = await StorefrontItem.findAll({
        where: { id: existingItems.map(i => i.storefrontItemId).filter(Boolean), isSpecialOffer: false },
      });
      await backfillMissingPaymentOrderItems({
        order: existingOrder,
        requestItems: existingItems,
        storefrontItems: existingDbItems,
        paymentMethod: 'ach',
        metadataSource: 'ach_payment',
      });

      logger.info(`[ACH] Idempotency hit: returning existing PaymentIntent ${existingOrder.paymentId} for order ${existingOrder.orderNumber}`);
      return res.json({
        success: true,
        clientSecret: existingIntent.client_secret,
        orderNumber: existingOrder.orderNumber,
        orderId: existingOrder.id,
        subtotal: existingNotes.subtotal ?? null,
        fee: existingNotes.fee ?? null,
        total: Number(existingOrder.totalAmount),
      });
    }

    // Server-side price validation (same as offlinePaymentRoutes).
    //
    // isActive:true (Kimi security audit F1 residual, SWA-129; ported to this rail
    // by GLM audit 2026-08-15 F3): a retired/unpublished item must not be
    // purchasable by id even though there is no per-item visibility model — an
    // id-guessing user should only be able to buy live catalog items. A filtered
    // item is absent from dbPriceMap and rejected below, so this fails closed.
    // The offline rail had this; this rail did not, which is the bug F3 names.
    const itemIds = items.map(i => i.storefrontItemId);
    const dbItems = await StorefrontItem.findAll({
      where: { id: itemIds, isSpecialOffer: false, isActive: true }
    });
    // Price via the SHARED resolver, not `new Decimal(i.price || 0)`. Packages carry
    // their real money in `totalCost` and `price` is nullable, so the old expression
    // produced a TRUTHY Decimal(0) that passed the not-found check and sold the item
    // for nothing (Kimi HIGH-2 / GLM §4.7, 2026-08-16). resolveUnitPrice throws
    // rather than returning 0 — an item we cannot price is not sellable.
    const dbItemMap = new Map(dbItems.map(i => [Number(i.id), i]));

    let serverTotal = new Decimal(0);
    for (const item of items) {
      const dbItem = dbItemMap.get(Number(item.storefrontItemId));
      if (!dbItem) {
        return res.status(400).json({ success: false, message: `Item ${item.storefrontItemId} not found` });
      }

      let unitPrice;
      try {
        unitPrice = resolveUnitPrice(dbItem);
      } catch (priceError) {
        if (priceError instanceof UnpriceableItemError) {
          logger.error('[ACH] Refusing to sell an unpriceable item', {
            storefrontItemId: item.storefrontItemId
          });
          return res.status(400).json({
            success: false,
            message: 'This item is not currently available for purchase',
            code: priceError.code
          });
        }
        throw priceError;
      }

      // Quantity must be a positive whole number (mirrors offlinePaymentRoutes).
      // Without this, `item.quantity || 1` priced a FRACTIONAL quantity: 0.06 of a
      // $1,000 package cleared the $0.02 client-total tolerance at $60 and minted
      // a real PaymentIntent. Reject rather than coerce — a request that asks for
      // 0.06 of a package is malformed, not roundable.
      // Number() not parseInt(): parseInt('2.5') and parseInt('2abc') both yield a
      // clean 2 and would silently price a malformed request. Number() yields 2.5
      // and NaN, which fail the integer test. typeof guard excludes `true` -> 1.
      const qty = (typeof item.quantity === 'number' || typeof item.quantity === 'string')
        ? Number(item.quantity)
        : NaN;
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for item ${item.storefrontItemId}`,
          code: 'INVALID_QUANTITY'
        });
      }

      // One ceiling, shared with the cart routes, the checkout gate and the
      // offline rail. The direct-item rails bypass the cart, so the cart's own
      // cap never covered them: an unbounded quantity overflows
      // Order.totalAmount — DECIMAL(10,2), max 99,999,999.99 — turning a
      // money-path request into a 500 and littering failed orders.
      if (qty > MAX_CART_ITEM_QUANTITY) {
        return res.status(400).json({
          success: false,
          message: `Quantity for item ${item.storefrontItemId} exceeds the ${MAX_CART_ITEM_QUANTITY} per-item limit`,
          code: 'QUANTITY_LIMIT_EXCEEDED'
        });
      }

      serverTotal = serverTotal.plus(unitPrice.times(qty));
    }

    // ACH fee: min(total * 0.008, $5)
    const fee = Decimal.min(serverTotal.times(0.008), new Decimal(5));
    const totalWithFee = serverTotal.plus(fee);
    const clientTotal = new Decimal(total);

    // Allow small rounding tolerance ($0.02)
    if (clientTotal.minus(serverTotal).abs().greaterThan(0.02)) {
      // Build line-item diff so frontend can show exactly what changed
      const changedItems = items.reduce((acc, clientItem) => {
        const dbItem = dbItems.find(i => i.id === clientItem.storefrontItemId);
        if (!dbItem) {
          acc.push({ id: clientItem.storefrontItemId, name: clientItem.name || 'Unavailable Item', expectedPrice: clientItem.price, actualPrice: 0, delta: -clientItem.price, status: 'REMOVED' });
        } else if (Number(dbItem.price) !== clientItem.price) {
          acc.push({ id: dbItem.id, name: dbItem.name, expectedPrice: clientItem.price, actualPrice: Number(dbItem.price), delta: Number(dbItem.price) - clientItem.price, status: 'PRICE_CHANGED' });
        }
        return acc;
      }, []);

      return res.status(409).json({
        success: false,
        code: 'PRICE_MISMATCH',
        message: 'Cart total has been recalculated based on real-time pricing.',
        actionRequired: 'CONFIRM_NEW_TOTAL',
        pricingData: {
          expectedTotal: clientTotal.toNumber(),
          updatedTotal: serverTotal.toNumber(),
          delta: serverTotal.minus(clientTotal).toNumber(),
          currency: 'USD',
          changedItems,
        },
      });
    }

    // Wrap Order + Stripe call in transaction to prevent ghost orders
    const orderNumber = generateSwanOrderNumber();
    const result = await sequelize.transaction(async (t) => {
      const { record: order, created } = await claimIdempotentRecord({
        model: Order,
        lookupWhere: { userId, idempotencyKey },
        transaction: t,
        createValues: {
          userId,
          orderNumber,
          totalAmount: totalWithFee.toNumber(),
          status: 'pending',
          paymentMethod: 'ach',
          idempotencyKey,
          notes: JSON.stringify({
            type: 'ach_payment',
            items,
            customerInfo,
            subtotal: serverTotal.toNumber(),
            fee: fee.toNumber(),
            idempotencyKey,
          }),
        },
      });

      if (!created) {
        await backfillMissingPaymentOrderItems({
          order,
          requestItems: items,
          storefrontItems: dbItems,
          paymentMethod: 'ach',
          metadataSource: 'ach_payment',
          transaction: t,
        });

        if (!order.paymentId) {
          return { order, paymentIntent: null, incomplete: true };
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentId);
        return { order, paymentIntent, reused: true };
      }

      await createPaymentOrderItems({
        order,
        requestItems: items,
        storefrontItems: dbItems,
        paymentMethod: 'ach',
        metadataSource: 'ach_payment',
        transaction: t,
      });

      // Create Stripe PaymentIntent with us_bank_account
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalWithFee.times(100).toNumber()), // cents
        currency: 'usd',
        payment_method_types: ['us_bank_account'],
        payment_method_options: {
          us_bank_account: {
            financial_connections: { permissions: ['payment_method'] },
          },
        },
        metadata: {
          orderId: order.id.toString(),
          orderNumber,
          userId: userId.toString(),
          source: 'swanstudios_ach',
        },
      }, {
        idempotencyKey, // Prevent duplicate PaymentIntents on network retry
      });

      // Store the PaymentIntent ID on the order
      await order.update({ paymentId: paymentIntent.id }, { transaction: t });

      return { order, paymentIntent };
    });

    if (result.incomplete) {
      return res.status(409).json({
        success: false,
        code: 'PAYMENT_ATTEMPT_INCOMPLETE',
        message: 'A matching payment attempt is still being prepared. Please retry shortly.',
      });
    }

    logger.info(`[ACH] PaymentIntent ${result.paymentIntent.id} ${result.reused ? 'reused' : 'created'} for order ${result.order.orderNumber}`);

    return res.json({
      success: true,
      clientSecret: result.paymentIntent.client_secret,
      orderNumber: result.order.orderNumber,
      orderId: result.order.id,
      subtotal: serverTotal.toNumber(),
      fee: fee.toNumber(),
      total: totalWithFee.toNumber(),
    });
  } catch (err) {
    // supportReference correlates the client's report to this log line. The raw
    // Stripe/Sequelize message stays SERVER-SIDE — it leaked schema names and
    // Stripe internals to any authenticated caller (Kimi LOW-1, 2026-08-16).
    // The v2 rail already returns only a generic detail; match it.
    const supportReference = `ERR-${Date.now().toString(36).toUpperCase()}`;
    logger.error('[ACH] Create intent error', {
      supportReference,
      errorName: err?.name || 'Error',
      errorType: err?.type || 'unknown',
      errorMessage: err?.message,
    });
    return res.status(500).json({
      success: false,
      code: 'PAYMENT_INTENT_FAILED',
      userMessage: 'We were unable to process your payment information.',
      retryable: ['rate_limit_error', 'api_connection_error'].includes(err?.type),
      supportReference,
    });
  }
});

export default router;
