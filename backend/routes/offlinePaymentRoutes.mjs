/**
 * Offline Payment Routes
 * ======================
 * Creates orders for Check, Zelle, and Venmo payments.
 * Orders are created with 'pending' status and manually confirmed by admin.
 *
 * Endpoints:
 * - POST /api/payments/offline — Create an offline payment order
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import Order from '../models/Order.mjs';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Generate human-readable order number
function generateOrderNumber() {
  const date = new Date();
  const prefix = 'SS';
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

const VALID_METHODS = ['check', 'zelle', 'venmo'];

/**
 * POST /api/payments/offline
 * Create a pending order for offline payment (check/zelle/venmo).
 * Requires authentication.
 */
router.post('/offline', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { paymentMethod, items, customerInfo, total, fee } = req.body;

    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${VALID_METHODS.join(', ')}`,
      });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid total amount' });
    }

    const orderNumber = generateOrderNumber();
    const totalWithFee = Number(total) + Number(fee || 0);

    const order = await Order.create({
      userId,
      cartId: null, // Offline orders don't use cart (items stored in notes)
      orderNumber,
      totalAmount: totalWithFee,
      status: 'pending',
      paymentMethod,
      billingEmail: customerInfo?.email || req.user?.email || null,
      billingName: customerInfo?.name || null,
      notes: JSON.stringify({
        type: 'offline_payment',
        method: paymentMethod,
        items: items || [],
        originalTotal: total,
        processingFee: fee || 0,
        customerInfo,
        createdVia: 'checkout_payment_selector',
      }),
      idempotencyKey: randomUUID(),
    });

    logger.info(`[OfflinePayment] Order ${orderNumber} created: ${paymentMethod} for $${totalWithFee} by user ${userId}`);

    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
      },
      message: `Order placed successfully. Please complete your ${paymentMethod} payment.`,
    });
  } catch (err) {
    logger.error('[OfflinePayment] Error creating order:', err.message, err.stack);
    return res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

export default router;
