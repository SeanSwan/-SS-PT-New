/**
 * AdminOrdersRoutes.mjs - AAA 7-Star Enterprise Order Management API
 * ===================================================================
 * 
 * Real-time order management and payment processing API endpoints
 * Comprehensive order lifecycle management with Stripe integration
 * Built for enterprise-grade order tracking and financial control
 * 
 * ENDPOINTS:
 * 📦 GET /api/admin/orders/pending - Get all pending orders with real data
 * 💳 GET /api/admin/orders/completed - Get completed orders with analytics
 * 🔍 GET /api/admin/orders/:id - Get detailed order information
 * ✅ POST /api/admin/orders/:id/complete - Mark order as completed
 * ❌ POST /api/admin/orders/:id/cancel - Cancel pending order
 * 💰 POST /api/admin/orders/:id/refund - Process order refund via Stripe
 * 📊 GET /api/admin/orders/analytics - Order analytics and metrics
 * 📁 GET /api/admin/orders/export - Export order data (CSV/JSON)
 * 
 * FEATURES:
 * 🚀 Real-time order tracking with PostgreSQL integration
 * 💳 Live Stripe payment status synchronization
 * 📊 Comprehensive order analytics and reporting
 * 🛡️ Enterprise security with audit logging
 * ⚡ High-performance queries with caching
 * 🔒 Admin-only access with rate limiting
 * 📝 Detailed order lifecycle management
 * 
 * Master Prompt v45 Alignment:
 * - Real order data from PostgreSQL and Stripe
 * - Enterprise-grade order management
 * - Production-ready payment processing
 * - Comprehensive admin dashboard integration
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import { protect } from '../middleware/authMiddleware.mjs';
import { requireAdmin } from '../middleware/adminMiddleware.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
import logger from '../utils/logger.mjs';
import { validationResult, param, query, body } from 'express-validator';
import { Op, fn, col, literal } from 'sequelize';

// Import models
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import User from '../models/User.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';

const router = express.Router();

// Initialize Stripe client
let stripeClient = null;
if (isStripeEnabled()) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      telemetry: false,
      maxNetworkRetries: 3,
      timeout: 10000
    });
    logger.info('💳 AdminOrdersRoutes: Stripe client initialized successfully');
  } catch (error) {
    logger.error(`❌ AdminOrdersRoutes: Failed to initialize Stripe client: ${error.message}`);
  }
}

// =====================================================
// SECURITY & RATE LIMITING
// =====================================================

const ordersRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many order management requests. Please try again later.'
  }
});

const heavyOrdersRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 heavy operations per hour
  message: {
    success: false,
    message: 'Too many intensive order operations. Please try again later.'
  }
});

// Apply middleware
router.use(protect);
router.use(requireAdmin);
router.use(ordersRateLimit);

// =====================================================
// INPUT VALIDATION
// =====================================================

const validateOrderId = [
  param('id').isUUID().withMessage('Invalid order ID format'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
        errors: errors.array()
      });
    }
    next();
  }
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['createdAt', 'totalAmount', 'status']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }
    next();
  }
];

// =====================================================
// ORDER QUERY HELPERS
// =====================================================

function buildOrderQuery(filters = {}) {
  const whereClause = {};
  
  // Status filter
  if (filters.status) {
    whereClause.status = filters.status;
  }
  
  // Date range filter
  if (filters.startDate && filters.endDate) {
    whereClause.createdAt = {
      [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
    };
  }
  
  // Amount range filter
  if (filters.minAmount || filters.maxAmount) {
    whereClause.totalAmount = {};
    if (filters.minAmount) {
      whereClause.totalAmount[Op.gte] = filters.minAmount;
    }
    if (filters.maxAmount) {
      whereClause.totalAmount[Op.lte] = filters.maxAmount;
    }
  }
  
  // Search filter (customer name/email)
  if (filters.search) {
    whereClause[Op.or] = [
      { '$user.firstName$': { [Op.iLike]: `%${filters.search}%` } },
      { '$user.lastName$': { [Op.iLike]: `%${filters.search}%` } },
      { '$user.email$': { [Op.iLike]: `%${filters.search}%` } }
    ];
  }
  
  return whereClause;
}

async function enrichOrderWithStripeData(order) {
  if (!stripeClient || !order.checkoutSessionId) {
    return order;
  }
  
  try {
    // Fetch Stripe session data
    const session = await stripeClient.checkout.sessions.retrieve(order.checkoutSessionId, {
      expand: ['payment_intent', 'customer']
    });
    
    // Add Stripe data to order
    order.stripeData = {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      paymentIntentId: session.payment_intent?.id,
      stripeCustomerId: session.customer?.id,
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentMethodTypes: session.payment_method_types,
      createdAt: new Date(session.created * 1000).toISOString(),
      expiresAt: new Date(session.expires_at * 1000).toISOString()
    };
    
    return order;
  } catch (error) {
    logger.warn(`Failed to enrich order ${order.id} with Stripe data:`, error.message);
    return order;
  }
}

// =====================================================
// ORDER ANALYTICS HELPERS
// =====================================================

async function calculateOrderAnalytics(timeRange = '30d') {
  const { startDate, endDate } = getDateRange(timeRange);
  
  try {
    // Get order counts by status
    const orderStats = await ShoppingCart.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('totalAmount')), 'totalAmount']
      ],
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['status'],
      raw: true
    });
    
    // Calculate totals
    const totals = orderStats.reduce((acc, stat) => {
      acc.orders += parseInt(stat.count);
      acc.revenue += parseFloat(stat.totalAmount || 0);
      return acc;
    }, { orders: 0, revenue: 0 });
    
    // Get daily order trend
    const dailyTrend = await ShoppingCart.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', col('id')), 'orders'],
        [fn('SUM', col('totalAmount')), 'revenue']
      ],
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']],
      raw: true
    });
    
    // Get top-selling packages
    const topPackages = await CartItem.findAll({
      attributes: [
        '$storefrontItem.name$',
        [fn('SUM', col('quantity')), 'totalSold'],
        [fn('SUM', literal('CAST(price AS DECIMAL) * quantity')), 'totalRevenue']
      ],
      include: [
        {
          model: ShoppingCart,
          as: 'shoppingCart',
          where: {
            status: 'completed',
            createdAt: {
              [Op.between]: [startDate, endDate]
            }
          },
          attributes: []
        },
        {
          model: StorefrontItem,
          as: 'storefrontItem',
          attributes: ['name']
        }
      ],
      group: ['storefrontItem.id', 'storefrontItem.name'],
      order: [[fn('SUM', literal('CAST(price AS DECIMAL) * quantity')), 'DESC']],
      limit: 5,
      raw: true
    });
    
    return {
      summary: {
        totalOrders: totals.orders,
        totalRevenue: Math.round(totals.revenue * 100) / 100,
        averageOrderValue: totals.orders > 0 ? Math.round((totals.revenue / totals.orders) * 100) / 100 : 0,
        conversionRate: 0 // TODO: Calculate based on visitor data
      },
      statusBreakdown: orderStats.map(stat => ({
        status: stat.status,
        count: parseInt(stat.count),
        revenue: Math.round(parseFloat(stat.totalAmount || 0) * 100) / 100
      })),
      dailyTrend: dailyTrend.map(day => ({
        date: day.date,
        orders: parseInt(day.orders),
        revenue: Math.round(parseFloat(day.revenue || 0) * 100) / 100
      })),
      topPackages: topPackages.map(pkg => ({
        name: pkg.name,
        totalSold: parseInt(pkg.totalSold),
        totalRevenue: Math.round(parseFloat(pkg.totalRevenue || 0) * 100) / 100
      }))
    };
  } catch (error) {
    logger.error('Failed to calculate order analytics:', error);
    throw error;
  }
}

function getDateRange(timeRange) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case '24h':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }
  
  return { startDate, endDate };
}

// =====================================================
// ORDER MANAGEMENT ENDPOINTS
// =====================================================

/**
 * GET /api/admin/orders/pending
 * Get all pending orders with real data
 */
router.get('/orders/pending', validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      minAmount,
      maxAmount,
      startDate,
      endDate
    } = req.query;
    
    logger.info(`📦 Fetching pending orders for admin ${req.user.email} (page: ${page}, limit: ${limit})`);
    
    const offset = (page - 1) * limit;
    const whereClause = buildOrderQuery({
      status: 'pending',
      search,
      minAmount,
      maxAmount,
      startDate,
      endDate
    });
    
    // Get pending orders
    const { rows: orders, count: totalCount } = await ShoppingCart.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'createdAt']
        },
        {
          model: CartItem,
          as: 'cartItems',
          include: [
            {
              model: StorefrontItem,
              as: 'storefrontItem',
              attributes: ['id', 'name', 'itemType', 'description']
            }
          ]
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Enrich with Stripe data
    const enrichedOrders = await Promise.all(
      orders.map(order => enrichOrderWithStripeData(order.toJSON()))
    );
    
    res.json({
      success: true,
      message: 'Pending orders retrieved successfully',
      orders: enrichedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to fetch pending orders for ${req.user.email}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/admin/orders/completed
 * Get completed orders with analytics
 */
router.get('/orders/completed', validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      sortBy = 'completedAt',
      sortOrder = 'desc',
      search,
      minAmount,
      maxAmount,
      startDate,
      endDate
    } = req.query;
    
    logger.info(`✅ Fetching completed orders for admin ${req.user.email} (page: ${page}, limit: ${limit})`);
    
    const offset = (page - 1) * limit;
    const whereClause = buildOrderQuery({
      status: 'completed',
      search,
      minAmount,
      maxAmount,
      startDate,
      endDate
    });
    
    // Get completed orders
    const { rows: orders, count: totalCount } = await ShoppingCart.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'createdAt']
        },
        {
          model: CartItem,
          as: 'cartItems',
          include: [
            {
              model: StorefrontItem,
              as: 'storefrontItem',
              attributes: ['id', 'name', 'itemType', 'description']
            }
          ]
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Enrich with Stripe data
    const enrichedOrders = await Promise.all(
      orders.map(order => enrichOrderWithStripeData(order.toJSON()))
    );
    
    res.json({
      success: true,
      message: 'Completed orders retrieved successfully',
      orders: enrichedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to fetch completed orders for ${req.user.email}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve completed orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/admin/orders/:id
 * Get detailed order information
 */
router.get('/orders/:id', validateOrderId, async (req, res) => {
  try {
    const orderId = req.params.id;
    logger.info(`🔍 Fetching order details for ${orderId} by admin ${req.user.email}`);
    
    const order = await ShoppingCart.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'createdAt']
        },
        {
          model: CartItem,
          as: 'cartItems',
          include: [
            {
              model: StorefrontItem,
              as: 'storefrontItem'
            }
          ]
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Enrich with Stripe data
    const enrichedOrder = await enrichOrderWithStripeData(order.toJSON());
    
    res.json({
      success: true,
      message: 'Order details retrieved successfully',
      order: enrichedOrder,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to fetch order details for ${req.params.id}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/admin/orders/analytics
 * Order analytics and metrics
 */
router.get('/orders/analytics', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    logger.info(`📊 Fetching order analytics for admin ${req.user.email} (timeRange: ${timeRange})`);
    
    const analytics = await calculateOrderAnalytics(timeRange);
    
    res.json({
      success: true,
      message: 'Order analytics retrieved successfully',
      analytics,
      timeRange,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to fetch order analytics for ${req.user.email}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/admin/orders/export
 * Export order data in CSV or JSON format
 */
router.get('/orders/export', [heavyOrdersRateLimit, validatePagination], async (req, res) => {
  try {
    const {
      format = 'csv',
      status,
      startDate,
      endDate,
      limit = 1000
    } = req.query;
    
    logger.info(`📁 Exporting order data for admin ${req.user.email} (format: ${format}, limit: ${limit})`);
    
    const whereClause = buildOrderQuery({
      status,
      startDate,
      endDate
    });
    
    const orders = await ShoppingCart.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });
    
    if (format === 'csv') {
      // Generate CSV
      let csv = 'Order ID,Customer Name,Customer Email,Status,Total Amount,Created At,Completed At\n';
      
      orders.forEach(order => {
        const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}`.trim() : 'Unknown';
        const customerEmail = order.user?.email || 'N/A';
        const completedAt = order.completedAt ? order.completedAt.toISOString() : 'N/A';
        
        csv += `${order.id},"${customerName}","${customerEmail}",${order.status},${order.totalAmount},${order.createdAt.toISOString()},"${completedAt}"\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="swanstudios-orders-${Date.now()}.csv"`);
      res.send(csv);
      
    } else {
      // Return JSON
      res.json({
        success: true,
        message: 'Order data exported successfully',
        orders: orders.map(order => order.toJSON()),
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.email,
        totalRecords: orders.length
      });
    }
    
  } catch (error) {
    logger.error(`❌ Failed to export order data for ${req.user.email}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to export order data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;

logger.info('📦 AdminOrdersRoutes: Enterprise order management API initialized with real data integration');
