/**
 * Offline Payment Routes
 * ======================
 * Creates orders for Check, Zelle, and Venmo payments.
 * Orders are created with 'pending' status and manually confirmed by admin.
 *
 * Security: Server-side price validation using Decimal.js (9-Brain Phase 2 consensus).
 * The server queries the database for source-of-truth prices and recalculates
 * totals — never trusts client-provided total/fee.
 *
 * Endpoints:
 * - POST /api/payments/offline — Create an offline payment order
 */
import express from 'express';
import Decimal from 'decimal.js';
import { protect } from '../middleware/authMiddleware.mjs';
import { isPriceAccessGranted } from '../services/store/priceVisibilityService.mjs';
import Order from '../models/Order.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { generateSwanOrderNumber } from '../utils/orderNumber.mjs';
import { buildWindowedStripeIdempotencyKey } from '../utils/stripeIdempotency.mjs';
import {
  claimIdempotentRecord,
} from '../utils/paymentIdempotency.mjs';
import {
  backfillMissingOfflineOrderItems,
  createOfflineOrderItems,
} from '../services/offlinePaymentOrderItems.mjs';

const router = express.Router();

const VALID_METHODS = ['check', 'zelle', 'venmo'];

/** Server-side fee calculation matching frontend PaymentFeeCalculator */
function calculateServerFee(method, subtotal) {
  const total = new Decimal(subtotal);
  switch (method) {
    case 'check': return new Decimal(0);
    case 'zelle': return new Decimal(0);
    case 'venmo': return total.mul('0.019').plus('0.10');
    default: return new Decimal(0);
  }
}

/** Calculate server-side total from database prices */
async function calculateServerTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Items array is required and must not be empty');
  }

  const itemIds = items.map(i => i.storefrontItemId).filter(Boolean);
  if (itemIds.length === 0) {
    throw new Error('All items must have a storefrontItemId');
  }

  // Query database for source-of-truth prices.
  // isActive:true (Kimi security audit F1 residual, SWA-129): a retired/
  // unpublished item must not be purchasable by id even though there is no
  // per-item visibility model — an id-guessing user should only be able to
  // buy live catalog items. Items absent from this result are rejected
  // downstream (unknown price), so this fails closed.
  const dbItems = await StorefrontItem.findAll({
    where: { id: itemIds, isSpecialOffer: false, isActive: true },
    attributes: [
      'id',
      'price',
      'name',
      'description',
      'packageType',
      'sessions',
      'totalSessions',
      'imageUrl',
    ],
  });

  const priceMap = new Map();
  for (const item of dbItems) {
    priceMap.set(Number(item.id), new Decimal(item.price));
  }

  let total = new Decimal(0);
  for (const item of items) {
    const dbPrice = priceMap.get(Number(item.storefrontItemId));
    if (!dbPrice) {
      throw new Error(`Item ${item.storefrontItemId} not found in storefront`);
    }
    const qty = parseInt(item.quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`Invalid quantity for item ${item.storefrontItemId}`);
    }
    total = total.plus(dbPrice.mul(qty));
  }

  return { subtotal: total, storefrontItems: dbItems };
}

/**
 * POST /api/payments/offline
 * Create a pending order for offline payment (check/zelle/venmo).
 * Requires authentication. Server validates all prices against database.
 */
router.post('/offline', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Launch P1-1: purchasing is invitation-only across all rails
    if (!(await isPriceAccessGranted(req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Store purchasing is by invitation. Contact SwanStudios to request access.',
        code: 'PRICE_ACCESS_REQUIRED'
      });
    }

    const { paymentMethod, items, customerInfo, total: clientTotal, fee: clientFee, idempotencyKey } = req.body;

    // ── Input Validation ──
    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${VALID_METHODS.join(', ')}`,
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items array is required' });
    }

    for (const item of items) {
      if (!item.storefrontItemId) {
        return res.status(400).json({ success: false, message: 'Each item must have a storefrontItemId' });
      }
      if (!item.quantity || parseInt(item.quantity, 10) < 1) {
        return res.status(400).json({ success: false, message: 'Each item must have a valid quantity' });
      }
    }

    // ── Server-Side Price Validation ──
    let calculatedSubtotal;
    let storefrontItems;
    try {
      const resolvedItems = await calculateServerTotal(items);
      calculatedSubtotal = resolvedItems.subtotal;
      storefrontItems = resolvedItems.storefrontItems;
    } catch (err) {
      logger.warn('[OfflinePayment] Server-side item validation failed:', err.message);
      return res.status(400).json({
        success: false,
        message: 'Could not validate payment items. Please refresh your cart and try again.',
      });
    }

    const calculatedFee = calculateServerFee(paymentMethod, calculatedSubtotal);
    const calculatedTotal = calculatedSubtotal.plus(calculatedFee);
    const expectedTotal = new Decimal(clientTotal || 0).plus(new Decimal(clientFee || 0));

    // Exact decimal equality — no tolerance (9-Brain Phase 2 consensus)
    if (!calculatedTotal.equals(expectedTotal)) {
      logger.warn('[OfflinePayment] Price mismatch detected', {
        userId,
        clientTotal,
        clientFee,
        expectedTotal: expectedTotal.toNumber(),
        calculatedSubtotal: calculatedSubtotal.toNumber(),
        calculatedFee: calculatedFee.toNumber(),
        calculatedTotal: calculatedTotal.toNumber(),
        items: items.map(i => ({ id: i.storefrontItemId, clientPrice: i.price })),
      });

      return res.status(409).json({
        success: false,
        code: 'PRICE_MISMATCH',
        message: 'Prices have been updated. Please review your new total.',
        updatedSubtotal: calculatedSubtotal.toNumber(),
        updatedFee: calculatedFee.toNumber(),
        updatedTotal: calculatedTotal.toNumber(),
      });
    }

    const effectiveIdempotencyKey = idempotencyKey || buildWindowedStripeIdempotencyKey(
      `offline-payment:${userId}:${paymentMethod}`,
      {
        total: calculatedTotal.toNumber(),
        items: items.map(i => ({
          storefrontItemId: i.storefrontItemId,
          quantity: parseInt(i.quantity, 10),
        })),
      }
    );

    const existingOrder = await Order.findOne({ where: { userId, idempotencyKey: effectiveIdempotencyKey } });
    if (existingOrder) {
      await backfillMissingOfflineOrderItems({
        order: existingOrder,
        requestItems: items,
        storefrontItems,
        paymentMethod,
      });

      logger.info(`[OfflinePayment] Idempotency hit: returning existing order ${existingOrder.orderNumber}`);
      return res.json({
        success: true,
        order: {
          id: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          totalAmount: existingOrder.totalAmount,
          status: existingOrder.status,
          paymentMethod: existingOrder.paymentMethod,
        },
        message: `Order already placed. Your ${paymentMethod} payment is pending confirmation.`,
      });
    }

    // ── Create Order ──
    const orderNumber = generateSwanOrderNumber();

    const { order, created } = await sequelize.transaction(async (transaction) => {
      const claim = await claimIdempotentRecord({
        model: Order,
        lookupWhere: { userId, idempotencyKey: effectiveIdempotencyKey },
        transaction,
        createValues: {
          userId,
          cartId: null,
          orderNumber,
          totalAmount: calculatedTotal.toNumber(),
          status: 'pending',
          paymentMethod,
          billingEmail: customerInfo?.email || req.user?.email || null,
          billingName: customerInfo?.name || null,
          notes: JSON.stringify({
            type: 'offline_payment',
            method: paymentMethod,
            items: items.map(i => ({ storefrontItemId: i.storefrontItemId, quantity: i.quantity, name: i.name })),
            subtotal: calculatedSubtotal.toNumber(),
            processingFee: calculatedFee.toNumber(),
            customerInfo,
            createdVia: 'checkout_payment_selector',
          }),
          idempotencyKey: effectiveIdempotencyKey,
        },
      });

      if (claim.created) {
        await createOfflineOrderItems({
          order: claim.record,
          requestItems: items,
          storefrontItems,
          paymentMethod,
          transaction,
        });
      } else {
        await backfillMissingOfflineOrderItems({
          order: claim.record,
          requestItems: items,
          storefrontItems,
          paymentMethod,
          transaction,
        });
      }

      return { order: claim.record, created: claim.created };
    });

    logger.info(`[OfflinePayment] Order ${order.orderNumber} ${created ? 'created' : 'reused'}: ${paymentMethod} for $${calculatedTotal.toNumber()} by user ${userId}`);

    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
      },
      message: created
        ? `Order placed successfully. Please complete your ${paymentMethod} payment.`
        : `Order already placed. Your ${paymentMethod} payment is pending confirmation.`,
    });
  } catch (err) {
    logger.error('[OfflinePayment] Error creating order:', err.message, err.stack);
    return res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

export default router;
