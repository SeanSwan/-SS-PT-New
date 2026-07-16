import {
  getCartItem,
  getOrder,
  getOrderItem,
  getShoppingCart,
  getStorefrontItem,
  getUser,
} from '../models/index.mjs';
import { createAdminNotification, createNotification } from './notificationController.mjs';
import unifiedSessionService from '../services/sessions/session.service.mjs';
import { generateSwanOrderNumber } from '../utils/orderNumber.mjs';
import logger from '../utils/logger.mjs';

export const createOrderFromCart = async (req, res) => {
  try {
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const Order = getOrder();
    const OrderItem = getOrderItem();

    const userId = req.user.id;

    const cart = await ShoppingCart.findOne({
      where: { userId, status: 'active' },
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem',
        }],
      }],
    });

    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty',
      });
    }

    const totalAmount = cart.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    const order = await Order.create({
      userId,
      cartId: cart.id,
      orderNumber: generateSwanOrderNumber(),
      totalAmount,
      status: 'pending',
      paymentMethod: req.body.paymentMethod || 'manual',
      billingEmail: req.body.billingEmail,
      billingName: req.body.billingName,
      shippingAddress: req.body.shippingAddress,
      notes: req.body.notes,
    });

    await Promise.all(cart.cartItems.map((cartItem) => OrderItem.create({
      orderId: order.id,
      storefrontItemId: cartItem.storefrontItemId,
      name: cartItem.storefrontItem ? cartItem.storefrontItem.name : `Product #${cartItem.storefrontItemId}`,
      description: cartItem.storefrontItem ? cartItem.storefrontItem.description : null,
      quantity: cartItem.quantity,
      price: cartItem.price,
      subtotal: cartItem.price * cartItem.quantity,
      itemType: cartItem.storefrontItem ? cartItem.storefrontItem.packageType : null,
      imageUrl: cartItem.storefrontItem ? cartItem.storefrontItem.imageUrl : null,
    })));

    cart.status = 'completed';
    cart.completedAt = new Date();
    await cart.save();

    await ShoppingCart.create({ userId, status: 'active' });

    const createdOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'orderItems' }],
    });

    try {
      const User = getUser();
      const orderUser = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName', 'email'] });
      await createNotification({
        userId,
        title: 'Order Confirmed',
        message: `Your order #${order.orderNumber} has been confirmed`,
        type: 'system',
        link: '/client-dashboard?tab=orders',
      });
      await createAdminNotification({
        title: 'New Order Received',
        message: `${orderUser?.firstName || 'A user'} placed order #${order.orderNumber} for $${totalAmount.toFixed(2)}`,
        type: 'admin',
      });
    } catch (notifErr) {
      logger.warn(`Order notification failed for order ${order.id}: ${notifErr.message}`);
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: createdOrder,
    });
  } catch (error) {
    logger.error(`Error creating order: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating the order',
    });
  }
};

export const applyOrderPayment = async (req, res) => {
  try {
    const Order = getOrder();
    const User = getUser();

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can apply payments',
      });
    }

    const orderId = req.params.id;
    const { method, reference, notes } = req.body;
    const validMethods = ['stripe', 'cash', 'venmo', 'check', 'other'];

    if (!method || !validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: `Payment method required. Valid methods: ${validMethods.join(', ')}`,
      });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentAppliedAt) {
      logger.info(`Payment already applied to order ${orderId}, returning idempotent response`);
      return res.status(200).json({
        success: true,
        alreadyPaid: true,
        message: 'Payment was already applied to this order',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentAppliedAt: order.paymentAppliedAt,
          paymentAppliedBy: order.paymentAppliedBy,
          paymentMethod: order.paymentMethod,
          paymentReference: order.paymentReference,
        },
      });
    }

    const previousStatus = order.status;
    order.paymentAppliedAt = new Date();
    order.paymentAppliedBy = req.user.id;
    order.paymentMethod = method;
    if (reference) order.paymentReference = reference;
    if (notes) order.notes = notes;
    order.status = 'completed';
    if (!order.completedAt) order.completedAt = new Date();

    await order.save();

    let sessionCreationResult = null;
    if (previousStatus !== 'completed') {
      try {
        logger.info(`Payment applied to order ${orderId}, allocating sessions for user ${order.userId}`);
        // Unified allocator = idempotent (FinancialTransaction-keyed) + row-locked,
        // so a double-submit / concurrent admin apply can't double-grant.
        sessionCreationResult = await unifiedSessionService.allocateSessionsFromOrder(orderId, order.userId);
        logger.info(`Successfully allocated ${sessionCreationResult.allocated} sessions for order ${orderId}`, {
          orderNumber: order.orderNumber,
          totalSessions: sessionCreationResult.totalSessions,
          userId: order.userId,
          appliedBy: req.user.id,
        });
      } catch (sessionError) {
        logger.error(`Failed to allocate sessions for order ${orderId}:`, {
          error: sessionError.message,
          orderId,
          userId: order.userId,
        });
      }
    }

    const admin = await User.findByPk(req.user.id, { attributes: ['id', 'firstName', 'lastName'] });
    const response = {
      success: true,
      alreadyPaid: false,
      message: `Payment applied successfully via ${method}`,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        paymentAppliedAt: order.paymentAppliedAt,
        paymentAppliedBy: order.paymentAppliedBy,
        paymentAppliedByName: admin ? `${admin.firstName} ${admin.lastName}` : null,
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference,
      },
    };

    if (sessionCreationResult) {
      response.sessions = {
        allocated: sessionCreationResult.allocated,
        totalSessions: sessionCreationResult.totalSessions,
      };
      response.message += ` and ${sessionCreationResult.allocated} sessions allocated`;
    }

    logger.info(`Admin ${req.user.id} applied ${method} payment to order ${orderId}`, {
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      reference,
    });

    try {
      await createNotification({
        userId: order.userId,
        title: 'Payment Confirmed',
        message: `Payment for order #${order.orderNumber} has been confirmed via ${method}`,
        type: 'system',
        link: '/client-dashboard?tab=orders',
      });
    } catch (notifErr) {
      logger.warn(`Payment notification failed for order ${orderId}: ${notifErr.message}`);
    }

    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Error applying payment to order: ${error.message}`, {
      orderId: req.params.id,
      adminId: req.user.id,
      error: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: 'An error occurred while applying payment',
    });
  }
};
