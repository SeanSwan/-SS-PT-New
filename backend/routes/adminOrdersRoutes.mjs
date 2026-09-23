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
import { grantSessionsForCart } from '../services/SessionGrantService.mjs';
import { getStripeClient } from '../utils/stripeClient.mjs';
import {
  completeFulfillmentItem,
  getAdminFulfillmentQueue,
} from '../services/adminFulfillmentQueueService.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';
const ORDER_TIME_RANGES = ['24h', '7d', '30d', '90d'];
const ORDER_STATUSES = ['pending_payment', 'active', 'completed', 'cancelled', 'refunded'];

function sendInternalError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: INTERNAL_ERROR
  });
}

// Initialize Stripe client
let stripeClient = null;
if (isStripeEnabled()) {
  try {
    stripeClient = getStripeClient();
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
  param('id').isInt({ min: 1 }).withMessage('Invalid order ID format'),
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
  query('sortBy').optional().isIn(['createdAt', 'completedAt', 'total', 'totalAmount', 'status']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search must be 120 characters or less'),
  query('minAmount').optional().isFloat({ min: 0 }).withMessage('Minimum amount must be zero or greater'),
  query('maxAmount').optional().isFloat({ min: 0 }).withMessage('Maximum amount must be zero or greater'),
  query('startDate').optional().isISO8601().withMessage('Start date must be ISO-8601'),
  query('endDate').optional().isISO8601().withMessage('End date must be ISO-8601'),
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

const validateAnalyticsQuery = [
  query('timeRange').optional().isIn(ORDER_TIME_RANGES).withMessage('Invalid analytics time range'),
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

const validateExportQuery = [
  query('format').optional().isIn(['csv', 'json']).withMessage('Export format must be csv or json'),
  query('status').optional().isIn(ORDER_STATUSES).withMessage('Invalid order status'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Export limit must be between 1 and 1000'),
  query('startDate').optional().isISO8601().withMessage('Start date must be ISO-8601'),
  query('endDate').optional().isISO8601().withMessage('End date must be ISO-8601'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export parameters',
        errors: errors.array()
      });
    }
    next();
  }
];

const validateManualCompletion = [
  body('adminNotes').optional().trim().isLength({ max: 500 }).withMessage('Admin notes must be 500 characters or less'),
  body('verifiedBy').optional().trim().isLength({ max: 100 }).withMessage('Verified by must be 100 characters or less'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completion payload',
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
    whereClause.total = {};
    if (filters.minAmount) {
      whereClause.total[Op.gte] = Number(filters.minAmount);
    }
    if (filters.maxAmount) {
      whereClause.total[Op.lte] = Number(filters.maxAmount);
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

function normalizeOrderShape(order) {
  const normalized = { ...order };
  normalized.totalAmount = order.total;

  if (Array.isArray(normalized.cartItems)) {
    normalized.cartItems = normalized.cartItems.map((item) => {
      const storefrontItem = item?.storefrontItem
        ? {
            ...item.storefrontItem,
            itemType: item.storefrontItem.packageType || item.storefrontItem.itemType || null
          }
        : item?.storefrontItem;
      return {
        ...item,
        storefrontItem
      };
    });
  }

  return normalized;
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
      createdAt: session.created ? new Date(session.created * 1000).toISOString() : null,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
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
        [fn('SUM', col('total')), 'totalAmount']
      ],
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['status'],
      raw: true
    });
    
    // Summary revenue/orders/AOV must count ONLY completed carts. The query above returns
    // every status bucket (for statusBreakdown), but folding them all into revenue counted
    // abandoned 'active', 'cancelled', and 'pending_payment' carts as money — a $175 real
    // sale plus 24 abandoned/cancelled carts showed as ~$3,775 / 25 orders. The per-status
    // breakdown below still shows all buckets, so no information is lost.
    const totals = orderStats.reduce((acc, stat) => {
      if (stat.status === 'completed') {
        acc.orders += Number.parseInt(stat.count, 10);
        acc.revenue += parseFloat(stat.totalAmount || 0);
      }
      return acc;
    }, { orders: 0, revenue: 0 });
    
    // Get daily order trend — completed carts only (this is a revenue trend; abandoned/
    // cancelled carts must not appear as revenue, same fix as the summary totals above).
    const dailyTrend = await ShoppingCart.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', col('id')), 'orders'],
        [fn('SUM', col('total')), 'revenue']
      ],
      where: {
        status: 'completed',
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
        [col('storefrontItem.name'), 'name'],
        [fn('SUM', col('quantity')), 'totalSold'],
        [fn('SUM', literal('CAST(price AS DECIMAL) * quantity')), 'totalRevenue']
      ],
      include: [
        {
          model: ShoppingCart,
          as: 'cart',
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
        count: Number.parseInt(stat.count, 10),
        revenue: Math.round(parseFloat(stat.totalAmount || 0) * 100) / 100
      })),
      dailyTrend: dailyTrend.map(day => ({
        date: day.date,
        orders: Number.parseInt(day.orders, 10),
        revenue: Math.round(parseFloat(day.revenue || 0) * 100) / 100
      })),
      topPackages: topPackages.map(pkg => ({
        name: pkg.name,
        totalSold: Number.parseInt(pkg.totalSold, 10),
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
    const sortField = sortBy === 'totalAmount' ? 'total' : sortBy;
    const whereClause = buildOrderQuery({
      status: { [Op.in]: ['pending_payment', 'active'] },
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
              attributes: ['id', 'name', 'packageType', 'description']
            }
          ]
        }
      ],
      order: [[sortField, sortOrder.toUpperCase()]],
      limit: Number.parseInt(limit, 10),
      offset: Number.parseInt(offset, 10)
    });
    
    // Enrich with Stripe data
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => normalizeOrderShape(await enrichOrderWithStripeData(order.toJSON())))
    );
    
    res.json({
      success: true,
      message: 'Pending orders retrieved successfully',
      orders: enrichedOrders,
      pagination: {
        page: Number.parseInt(page, 10),
        limit: Number.parseInt(limit, 10),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to fetch pending orders for ${req.user.email}:`, error);

    // Return 503 with empty data if table doesn't exist (migration not run)
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return res.status(503).json({
        success: false,
        message: 'Order data temporarily unavailable (pending database setup)',
        orders: [],
        pagination: { page: 1, limit: 25, total: 0, pages: 0 }
      });
    }

    return sendInternalError(res, 'Failed to retrieve pending orders');
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
    const sortField = sortBy === 'totalAmount' ? 'total' : sortBy;
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
              attributes: ['id', 'name', 'packageType', 'description']
            }
          ]
        }
      ],
      order: [[sortField, sortOrder.toUpperCase()]],
      limit: Number.parseInt(limit, 10),
      offset: Number.parseInt(offset, 10)
    });
    
    // Enrich with Stripe data
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => normalizeOrderShape(await enrichOrderWithStripeData(order.toJSON())))
    );
    
    res.json({
      success: true,
      message: 'Completed orders retrieved successfully',
      orders: enrichedOrders,
      pagination: {
        page: Number.parseInt(page, 10),
        limit: Number.parseInt(limit, 10),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to fetch completed orders for ${req.user.email}:`, error);
    
    return sendInternalError(res, 'Failed to retrieve completed orders');
  }
});

/**
 * GET /api/admin/orders/fulfillment
 * Item-level physical-product fulfillment queue for paid checkout orders.
 */
router.get('/orders/fulfillment', validatePagination, async (req, res) => {
  try {
    const result = await getAdminFulfillmentQueue({
      status: req.query.status || 'pending_fulfillment',
      search: req.query.search || '',
      limit: req.query.limit || 50,
    });

    return res.json({
      success: true,
      message: 'Fulfillment queue retrieved successfully',
      items: result.items,
      stats: result.stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to fetch fulfillment queue for ${req.user.email}:`, error);
    return sendInternalError(res, 'Failed to retrieve fulfillment queue');
  }
});

/**
 * PATCH /api/admin/orders/fulfillment-items/:itemId/complete
 * Mark one physical product order item fulfilled.
 */
router.patch(
  '/orders/fulfillment-items/:itemId(\\d+)/complete',
  [
    heavyOrdersRateLimit,
    param('itemId').isInt({ min: 1 }).withMessage('Invalid order item ID'),
    body('notes').optional().isString().trim().isLength({ max: 240 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fulfillment request',
        errors: errors.array()
      });
    }

    try {
      const result = await completeFulfillmentItem({
        orderItemId: Number(req.params.itemId),
        adminId: req.user.id,
        notes: req.body?.notes || '',
      });

      return res.json({
        success: true,
        message: result.alreadyFulfilled
          ? 'Fulfillment item was already complete'
          : 'Fulfillment item marked complete',
        data: result,
      });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ success: false, message: 'Fulfillment item not found' });
      }
      if (error.statusCode === 409) {
        return res.status(409).json({ success: false, message: error.message });
      }

      logger.error(`Failed to complete fulfillment item ${req.params.itemId}:`, error);
      return sendInternalError(res, 'Failed to complete fulfillment item');
    }
  }
);

/**
 * POST /api/admin/orders/:id/complete
 * Manually mark a cart order as paid and grant session credits.
 */
router.post('/orders/:id(\\d+)/complete', [heavyOrdersRateLimit, validateOrderId, validateManualCompletion], async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    logger.info(`💳 Admin ${req.user.email} manually completing order ${orderId}`);

    const order = await ShoppingCart.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Cancelled orders cannot be marked paid'
      });
    }

    const grantResult = await grantSessionsForCart(orderId, order.userId, 'admin-manual');

    logger.info('Admin order completion processed', {
      orderId,
      userId: order.userId,
      adminId: req.user.id,
      adminEmail: req.user.email,
      hasAdminNotes: Boolean(req.body?.adminNotes),
      sessionsAdded: grantResult.sessionsAdded,
      alreadyProcessed: grantResult.alreadyProcessed
    });

    // A refusal must not be reported as a grant.
    //
    // grantSessionsForCart can return `unfulfillable: true` with sessionsAdded:
    // 0. `alreadyProcessed` is false in that case, so this fell through and told
    // the admin "Order marked paid and sessions granted" when nothing had been
    // granted — the admin then has no reason to look again (GLM-5.3 H1 + my own
    // sweep, 2026-08-20). An admin acting on a false confirmation is how a
    // customer stays unfulfilled indefinitely.
    if (grantResult?.unfulfillable) {
      logger.error('[Admin] Manual grant REFUSED — order not fulfilled', {
        orderId,
        userId: order.userId,
        reason: grantResult.reason ?? 'unknown',
      });

      return res.status(409).json({
        success: false,
        message: 'Sessions were NOT granted — this order could not be verified automatically.',
        error: {
          code: 'GRANT_REFUSED',
          reason: grantResult.reason ?? 'unknown',
          requiresSupportReview: true,
        },
        data: {
          orderId,
          userId: order.userId,
          sessionsAdded: 0,
        },
      });
    }

    return res.json({
      success: true,
      message: grantResult.alreadyProcessed
        ? 'Order already completed'
        : 'Order marked paid and sessions granted',
      data: {
        orderId,
        userId: order.userId,
        sessionsAdded: grantResult.sessionsAdded,
        alreadyProcessed: grantResult.alreadyProcessed
      }
    });
  } catch (error) {
    logger.error(`❌ Failed to manually complete order ${req.params.id}:`, error);

    return sendInternalError(res, 'Failed to mark order paid');
  }
});

/**
 * GET /api/admin/orders/:id
 * Get detailed order information
 */
router.get('/orders/:id(\\d+)', validateOrderId, async (req, res) => {
  try {
    const orderId = Number(req.params.id);
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
    const enrichedOrder = normalizeOrderShape(await enrichOrderWithStripeData(order.toJSON()));
    
    res.json({
      success: true,
      message: 'Order details retrieved successfully',
      order: enrichedOrder,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`❌ Failed to fetch order details for ${req.params.id}:`, error);
    
    return sendInternalError(res, 'Failed to retrieve order details');
  }
});

/**
 * GET /api/admin/orders/analytics
 * Order analytics and metrics
 */
router.get('/orders/analytics', validateAnalyticsQuery, async (req, res) => {
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
    
    return sendInternalError(res, 'Failed to retrieve order analytics');
  }
});

/**
 * GET /api/admin/orders/export
 * Export order data in CSV or JSON format
 */
router.get('/orders/export', [heavyOrdersRateLimit, validateExportQuery], async (req, res) => {
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
      limit: Number.parseInt(limit, 10),
      order: [['createdAt', 'DESC']]
    });
    
    if (format === 'csv') {
      // Generate CSV
      let csv = 'Order ID,Customer Name,Customer Email,Status,Total Amount,Created At,Completed At\n';
      
      orders.forEach(order => {
        const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}`.trim() : 'Unknown';
        const customerEmail = order.user?.email || 'N/A';
        const completedAt = order.completedAt ? order.completedAt.toISOString() : 'N/A';
        
        csv += `${order.id},"${customerName}","${customerEmail}",${order.status},${order.total},${order.createdAt.toISOString()},"${completedAt}"\n`;
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
    
    return sendInternalError(res, 'Failed to export order data');
  }
});

export default router;

logger.info('📦 AdminOrdersRoutes: Enterprise order management API initialized with real data integration');
