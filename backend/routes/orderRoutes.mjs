// backend/routes/orderRoutes.mjs
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import {
  getOrder,
  getOrderItem,
  getStorefrontItem,
  getUser,
} from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import sessionAllocationService from '../services/SessionAllocationService.mjs';
import { applyOrderPayment, createOrderFromCart } from '../controllers/orderController.mjs';

const router = express.Router();

/**
 * GET /api/orders
 * Get orders for the authenticated user, or all orders for admins.
 */
router.get('/', protect, async (req, res) => {
  try {
    const Order = getOrder();
    const OrderItem = getOrderItem();

    const isAdmin = req.user.role === 'admin';
    const { status, limit, method } = req.query;
    const where = {};

    if (!isAdmin) where.userId = req.user.id;
    if (status) where.status = status;
    if (method) where.paymentMethod = method;

    const orders = await Order.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit) || 100, 200),
      include: [{ model: OrderItem, as: 'orderItems' }],
    });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    logger.error(`Error fetching orders: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching orders',
    });
  }
});

/**
 * GET /api/orders/:id
 * Get a specific order for the authenticated user.
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const Order = getOrder();
    const OrderItem = getOrderItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();

    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [{ model: StorefrontItem, as: 'storefrontItem' }],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    logger.error(`Error fetching order: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the order',
    });
  }
});

/**
 * POST /api/orders/create-from-cart
 * Create a new order from the current cart without payment processing.
 */
router.post('/create-from-cart', protect, createOrderFromCart);

/**
 * PUT /api/orders/:id
 * Update an order's status. Admin only.
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const Order = getOrder();

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update order status',
      });
    }

    const orderId = req.params.id;
    const { status, notes } = req.body;
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const previousStatus = order.status;
    order.status = status || order.status;
    if (notes) order.notes = notes;
    if (status === 'completed' && !order.completedAt) order.completedAt = new Date();

    await order.save();

    let sessionCreationResult = null;
    if (status === 'completed' && previousStatus !== 'completed') {
      try {
        logger.info(`Order ${orderId} completed, allocating sessions for user ${order.userId}`);
        sessionCreationResult = await sessionAllocationService.allocateSessionsFromOrder(orderId, order.userId);
        logger.info(`Successfully allocated ${sessionCreationResult.allocated} sessions for order ${orderId}`, {
          orderNumber: order.orderNumber,
          totalSessions: sessionCreationResult.totalSessions,
          userId: order.userId,
        });
      } catch (sessionError) {
        logger.error(`Failed to allocate sessions for order ${orderId}:`, {
          error: sessionError.message,
          stack: sessionError.stack,
          orderId,
          userId: order.userId,
        });
        logger.error('SESSION ALLOCATION FAILURE - ADMIN ATTENTION REQUIRED', {
          orderId,
          userId: order.userId,
          orderNumber: order.orderNumber,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const response = {
      success: true,
      message: 'Order updated successfully',
      order,
    };

    if (sessionCreationResult) {
      response.sessions = {
        allocated: sessionCreationResult.allocated,
        totalSessions: sessionCreationResult.totalSessions,
        sessionIds: sessionCreationResult.sessions?.map((session) => session.id) || [],
        details: sessionCreationResult.orderDetails,
      };
      response.message += ` and ${sessionCreationResult.allocated} sessions allocated`;
    }

    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Error updating order: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the order',
    });
  }
});

/**
 * POST /api/orders/:id/apply-payment
 * Apply payment to an order. Admin only, idempotent.
 */
router.post('/:id/apply-payment', protect, applyOrderPayment);

export default router;
