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
import Order from '../models/Order.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import {
  claimIdempotentRecord,
} from '../utils/paymentIdempotency.mjs';

const router = express.Router();

let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  }
} catch (err) {
  logger.error('[ACH] Stripe init failed:', err.message);
}

// Generate human-readable order number
function generateOrderNumber() {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SS-${datePart}-${randomPart}`;
}

/**
 * POST /api/payments/ach/create-intent
 * Create a Stripe PaymentIntent for ACH/eCheck
 */
router.post('/create-intent', protect, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ success: false, message: 'Payment processing unavailable' });
  }

  try {
    const userId = req.user.id;
    const { items, customerInfo, total, idempotencyKey } = req.body;

    if (!items?.length || !total) {
      return res.status(400).json({ success: false, message: 'Items and total are required' });
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

    // Server-side price validation (same as offlinePaymentRoutes)
    const itemIds = items.map(i => i.storefrontItemId);
    const dbItems = await StorefrontItem.findAll({ where: { id: itemIds } });
    const dbPriceMap = new Map(dbItems.map(i => [i.id, new Decimal(i.price || 0)]));

    let serverTotal = new Decimal(0);
    for (const item of items) {
      const unitPrice = dbPriceMap.get(item.storefrontItemId);
      if (!unitPrice) {
        return res.status(400).json({ success: false, message: `Item ${item.storefrontItemId} not found` });
      }
      serverTotal = serverTotal.plus(unitPrice.times(item.quantity || 1));
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
    const orderNumber = generateOrderNumber();
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
            items,
            customerInfo,
            subtotal: serverTotal.toNumber(),
            fee: fee.toNumber(),
            idempotencyKey,
          }),
        },
      });

      if (!created) {
        if (!order.paymentId) {
          return { order, paymentIntent: null, incomplete: true };
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentId);
        return { order, paymentIntent, reused: true };
      }

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
    logger.error('[ACH] Create intent error:', err.message);
    return res.status(500).json({
      success: false,
      code: 'PAYMENT_INTENT_FAILED',
      userMessage: 'We were unable to process your payment information.',
      technicalMessage: err.message,
      errorType: err.type || 'unknown',
      retryable: ['rate_limit_error', 'api_connection_error'].includes(err.type),
      supportReference: `ERR-${Date.now().toString(36).toUpperCase()}`,
    });
  }
});

export default router;
