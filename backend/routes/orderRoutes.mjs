// backend/routes/orderRoutes.mjs
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
// 🚀 ENHANCED: Coordinated model imports with associations
import { 
  getOrder,
  getOrderItem,
  getShoppingCart,
  getCartItem,
  getStorefrontItem,
  getUser
} from '../models/index.mjs';

// 🎯 ENHANCED P0 FIX: Lazy loading models to prevent initialization race condition
// Models will be retrieved via getter functions inside each route handler when needed
import logger from '../utils/logger.mjs';
import { v4 as uuidv4 } from 'uuid';
// Temporarily disabled for deployment hotfix - will re-enable after verification
// import TrainingSessionService from '../services/TrainingSessionService.mjs';

const router = express.Router();

/**
 * Generate a unique order number
 */
function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SS-${timestamp}-${random}`;
}

/**
 * GET /api/orders
 * Get all orders for the authenticated user
 */
router.get('/', protect, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const Order = getOrder();
    const OrderItem = getOrderItem();
    
    const userId = req.user.id;
    
    const orders = await Order.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: OrderItem,
          as: 'orderItems'
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    logger.error(`Error fetching orders: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching orders'
    });
  }
});

/**
 * GET /api/orders/:id
 * Get a specific order for the authenticated user
 */
router.get('/:id', protect, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const Order = getOrder();
    const OrderItem = getOrderItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();
    
    const userId = req.user.id;
    const orderId = req.params.id;
    
    const order = await Order.findOne({
      where: { id: orderId, userId },
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: StorefrontItem,
              as: 'storefrontItem'
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    logger.error(`Error fetching order: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the order'
    });
  }
});

/**
 * POST /api/orders/create-from-cart
 * Create a new order from the current cart (without payment processing)
 * Useful for cash payments or manual checkout processes
 */
router.post('/create-from-cart', protect, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const Order = getOrder();
    const OrderItem = getOrderItem();
    
    const userId = req.user.id;
    
    // Retrieve the active shopping cart
    const cart = await ShoppingCart.findOne({
      where: { userId, status: 'active' },
      include: [{ 
        model: CartItem, 
        as: 'cartItems',
        include: [{ 
          model: StorefrontItem, 
          as: 'storefrontItem' 
        }]
      }]
    });
    
    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty'
      });
    }
    
    // Calculate the total order amount
    const totalAmount = cart.cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    // Create a new order
    const order = await Order.create({
      userId,
      cartId: cart.id,
      orderNumber: generateOrderNumber(),
      totalAmount,
      status: 'pending',
      paymentMethod: req.body.paymentMethod || 'manual',
      billingEmail: req.body.billingEmail,
      billingName: req.body.billingName,
      shippingAddress: req.body.shippingAddress,
      notes: req.body.notes
    });
    
    // Create order items from cart items
    const orderItems = await Promise.all(cart.cartItems.map(async (cartItem) => {
      return OrderItem.create({
        orderId: order.id,
        storefrontItemId: cartItem.storefrontItemId,
        name: cartItem.storefrontItem ? cartItem.storefrontItem.name : `Product #${cartItem.storefrontItemId}`,
        description: cartItem.storefrontItem ? cartItem.storefrontItem.description : null,
        quantity: cartItem.quantity,
        price: cartItem.price,
        subtotal: cartItem.price * cartItem.quantity,
        itemType: cartItem.storefrontItem ? cartItem.storefrontItem.packageType : null,
        imageUrl: cartItem.storefrontItem ? cartItem.storefrontItem.imageUrl : null
      });
    }));
    
    // Mark the cart as completed
    cart.status = 'completed';
    cart.completedAt = new Date();
    await cart.save();
    
    // Create a new empty cart for the user
    await ShoppingCart.create({
      userId,
      status: 'active'
    });
    
    // Return the created order
    const createdOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          as: 'orderItems'
        }
      ]
    });
    
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: createdOrder
    });
  } catch (error) {
    logger.error(`Error creating order: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating the order'
    });
  }
});

/**
 * PUT /api/orders/:id
 * Update an order's status (admin only)
 */
router.put('/:id', protect, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load models to prevent race condition
    const Order = getOrder();
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update order status'
      });
    }
    
    const orderId = req.params.id;
    const { status, notes } = req.body;
    
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update order
    const previousStatus = order.status;
    order.status = status || order.status;
    if (notes) order.notes = notes;
    
    if (status === 'completed' && !order.completedAt) {
      order.completedAt = new Date();
    }
    
    await order.save();
    
    // TEMPORARILY DISABLED FOR DEPLOYMENT HOTFIX
    // If order was just completed, create training sessions
    let sessionCreationResult = null;
    // if (status === 'completed' && previousStatus !== 'completed') {
    //   try {
    //     logger.info(`Order ${orderId} completed, creating training sessions for user ${order.userId}`);
    //     sessionCreationResult = await TrainingSessionService.createSessionsForOrder(orderId, order.userId);
    //     logger.info(`Created ${sessionCreationResult.created} training sessions for order ${orderId}`);
    //   } catch (sessionError) {
    //     logger.error(`Failed to create training sessions for order ${orderId}:`, sessionError);
    //     // Don't fail the order update if session creation fails
    //   }
    // }
    
    const response = {
      success: true,
      message: 'Order updated successfully',
      order
    };
    
    // Include session creation info if applicable
    if (sessionCreationResult) {
      response.sessions = sessionCreationResult;
      response.message += ` and ${sessionCreationResult.created} training sessions created`;
    }
    
    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Error updating order: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the order'
    });
  }
});

export default router;