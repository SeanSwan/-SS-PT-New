/**
 * Admin Finance Routes - SwanStudios Financial Intelligence API
 * ============================================================
 * Production-ready financial analytics and business intelligence endpoints
 * Designed for the Revolutionary Admin Dashboard
 * 
 * Features:
 * - Real-time revenue analytics
 * - Transaction history and insights
 * - Business performance metrics
 * - Payment method analytics
 * - Customer lifecycle tracking
 * - Financial forecasting data
 * 
 * Security: Admin role required for all endpoints
 * Performance: Optimized queries with caching
 * Compliance: GDPR and financial data protection
 */

import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.mjs';
import { query, validationResult } from 'express-validator';
import { Op, literal, fn, col } from 'sequelize';
import { getShoppingCart, getCartItem, getStorefrontItem, getUser } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';
const TIME_RANGE_MS = Object.freeze({
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000
});
const TIME_RANGES = Object.keys(TIME_RANGE_MS);
const TRANSACTION_STATUSES = ['all', 'pending_manual_payment', 'paid', 'unpaid', 'failed', 'cancelled', 'refunded', 'no_payment_required'];
const TRANSACTION_SORT_FIELDS = ['lastCheckoutAttempt', 'completedAt', 'createdAt', 'updatedAt', 'total', 'paymentStatus', 'status'];

function sendInternalError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: INTERNAL_ERROR
  });
}

function getTimeRangeStart(timeRange = '30d', now = new Date()) {
  return new Date(now.getTime() - TIME_RANGE_MS[timeRange]);
}

function readInteger(value, fallback) {
  return Number.parseInt(String(value ?? fallback), 10);
}

function splitCsvList(value) {
  return value
    ? String(value).split(',').map(item => item.trim()).filter(Boolean)
    : [];
}

function validateRequest(message) {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message,
        errors: errors.array()
      });
    }
    next();
  };
}

const validateTimeRangeQuery = [
  query('timeRange').optional().isIn(TIME_RANGES).withMessage('Invalid time range'),
  validateRequest('Invalid finance query parameters')
];

const validateTransactionsQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(TRANSACTION_STATUSES).withMessage('Invalid transaction status'),
  query('startDate').optional().isISO8601().withMessage('Start date must be ISO-8601'),
  query('endDate').optional().isISO8601().withMessage('End date must be ISO-8601'),
  query('customerId').optional().isInt({ min: 1 }).withMessage('Customer ID must be a positive integer'),
  query('minAmount').optional().isFloat({ min: 0 }).withMessage('Minimum amount must be zero or greater'),
  query('maxAmount').optional().isFloat({ min: 0 }).withMessage('Maximum amount must be zero or greater'),
  query('sortBy').optional().isIn(TRANSACTION_SORT_FIELDS).withMessage('Invalid transaction sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage('Sort order must be ASC or DESC'),
  validateRequest('Invalid transaction query parameters')
];

const validateNotificationsQuery = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0, max: 10000 }).withMessage('Offset must be between 0 and 10000'),
  validateRequest('Invalid notification query parameters')
];

const validateExportQuery = [
  query('format').optional().isIn(['json', 'csv']).withMessage('Export format must be json or csv'),
  query('type').optional().isIn(['transactions']).withMessage('Invalid export type'),
  query('timeRange').optional().isIn(TIME_RANGES).withMessage('Invalid time range'),
  query('startDate').optional().isISO8601().withMessage('Start date must be ISO-8601'),
  query('endDate').optional().isISO8601().withMessage('End date must be ISO-8601'),
  validateRequest('Invalid export query parameters')
];

// Apply authentication and admin role requirement to all routes
router.use(protect);
router.use(authorize(['admin']));

/**
 * GET /api/admin/finance/overview
 * Comprehensive financial overview with key metrics
 */
router.get('/overview', validateTimeRangeQuery, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Get models
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();
    
    const now = new Date();
    const startDate = getTimeRangeStart(timeRange, now);
    
    // Current period revenue
    const currentRevenue = await ShoppingCart.sum('total', {
      where: {
        status: 'completed',
        paymentStatus: 'paid',
        completedAt: {
          [Op.gte]: startDate
        }
      }
    }) || 0;
    
    // Previous period for comparison
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousRevenue = await ShoppingCart.sum('total', {
      where: {
        status: 'completed',
        paymentStatus: 'paid',
        completedAt: {
          [Op.between]: [previousPeriodStart, startDate]
        }
      }
    }) || 0;
    
    // Calculate revenue change
    const revenueChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : currentRevenue > 0 ? 100 : 0;
    
    // Transaction count and average order value
    const transactionCount = await ShoppingCart.count({
      where: {
        status: 'completed',
        paymentStatus: 'paid',
        completedAt: {
          [Op.gte]: startDate
        }
      }
    });
    
    const averageOrderValue = transactionCount > 0 ? currentRevenue / transactionCount : 0;
    
    // New customers (users with first purchase in period)
    const newCustomers = await User.count({
      include: [{
        model: ShoppingCart,
        as: 'shoppingCarts',
        where: {
          status: 'completed',
          paymentStatus: 'paid',
          completedAt: {
            [Op.gte]: startDate
          }
        },
        required: true
      }],
      where: {
        hasPurchasedBefore: false
      }
    });
    
    // Top selling packages
    const topPackages = await StorefrontItem.findAll({
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: ShoppingCart,
          as: 'cart',
          where: {
            status: 'completed',
            paymentStatus: 'paid',
            completedAt: {
              [Op.gte]: startDate
            }
          }
        }]
      }],
      attributes: [
        'id',
        'name',
        'price',
        'itemType',
        [fn('SUM', col('cartItems.quantity')), 'totalSold'],
        [fn('SUM', literal('cartItems.quantity * cartItems.price')), 'totalRevenue']
      ],
      group: ['StorefrontItem.id'],
      order: [[literal('totalRevenue'), 'DESC']],
      limit: 5,
      raw: false
    });
    
    // Daily revenue trend for the period
    const dailyRevenue = await ShoppingCart.findAll({
      attributes: [
        [fn('DATE', col('completedAt')), 'date'],
        [fn('SUM', col('total')), 'revenue'],
        [fn('COUNT', col('id')), 'transactions']
      ],
      where: {
        status: 'completed',
        paymentStatus: 'paid',
        completedAt: {
          [Op.gte]: startDate
        }
      },
      group: [fn('DATE', col('completedAt'))],
      order: [[fn('DATE', col('completedAt')), 'ASC']],
      raw: true
    });
    
    // Recent high-value transactions
    const recentTransactions = await ShoppingCart.findAll({
      where: {
        status: 'completed',
        paymentStatus: 'paid',
        completedAt: {
          [Op.gte]: startDate
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['total', 'DESC']],
      limit: 10
    });
    
    // shopping_carts does not store payment method type; avoid synthetic analytics.
    const paymentMethods = {
      source: 'not_tracked',
      tracked: false,
      card: 0,
      digital_wallet: 0,
      bank_transfer: 0
    };
    
    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue: currentRevenue,
          revenueChange: Math.round(revenueChange * 100) / 100,
          transactionCount,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          newCustomers,
          conversionRate: 0.0 // Would be calculated from website analytics
        },
        topPackages: topPackages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
          type: pkg.itemType,
          soldCount: pkg.get('totalSold') || 0,
          revenue: pkg.get('totalRevenue') || 0
        })),
        dailyTrend: dailyRevenue,
        recentTransactions: recentTransactions.map(transaction => ({
          id: transaction.id,
          amount: transaction.total,
          date: transaction.completedAt,
          customer: transaction.user ? {
            name: `${transaction.user.firstName} ${transaction.user.lastName}`,
            email: transaction.user.email
          } : null,
          status: transaction.paymentStatus
        })),
        paymentMethods,
        timeRange,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error fetching financial overview:', error);
    return sendInternalError(res, 'Failed to fetch financial overview');
  }
});

/**
 * GET /api/admin/finance/transactions
 * ENHANCED: Detailed transaction history with comprehensive pending payment support
 * Now includes all checkout attempts and pending manual payments
 */
router.get('/transactions', validateTransactionsQuery, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      startDate,
      endDate,
      customerId,
      minAmount,
      maxAmount,
      sortBy = 'lastCheckoutAttempt',
      sortOrder = 'DESC'
    } = req.query;
    
    // Get models
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();
    
    const pageNumber = readInteger(page, 1);
    const limitNumber = readInteger(limit, 20);
    const offset = (pageNumber - 1) * limitNumber;
    
    // Build where conditions - ENHANCED to include all cart statuses
    const whereConditions = {};
    
    // Enhanced status filtering to include pending payments
    if (status !== 'all') {
      if (status === 'pending_manual_payment') {
        whereConditions.paymentStatus = 'pending_manual_payment';
      } else {
        whereConditions.paymentStatus = status;
      }
    }
    
    // Enhanced date filtering to use lastCheckoutAttempt for pending payments
    if (startDate || endDate) {
      const dateField = sortBy === 'completedAt' ? 'completedAt' : 'lastCheckoutAttempt';
      whereConditions[dateField] = {};
      if (startDate) whereConditions[dateField][Op.gte] = new Date(startDate);
      if (endDate) whereConditions[dateField][Op.lte] = new Date(endDate);
    }
    
    if (customerId) {
      whereConditions.userId = readInteger(customerId, 0);
    }
    
    if (minAmount || maxAmount) {
      whereConditions.total = {};
      if (minAmount) whereConditions.total[Op.gte] = Number(minAmount);
      if (maxAmount) whereConditions.total[Op.lte] = Number(maxAmount);
    }
    
    // Only include carts that have checkout attempts (have checkoutSessionId)
    whereConditions.checkoutSessionId = {
      [Op.not]: null
    };
    
    // Fetch transactions with enhanced data
    const { count, rows: transactions } = await ShoppingCart.findAndCountAll({
      where: whereConditions,
      distinct: true,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
        },
        {
          model: CartItem,
          as: 'cartItems',
          include: [{
            model: StorefrontItem,
            as: 'storefrontItem',
            attributes: ['name', 'itemType', 'sessions', 'description']
          }]
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: limitNumber,
      offset: offset
    });

    const transactionSummary = await ShoppingCart.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'totalTransactions'],
        [fn('COUNT', literal("CASE WHEN \"paymentStatus\" = 'pending_manual_payment' THEN 1 END")), 'pendingPayments'],
        [fn('COUNT', literal("CASE WHEN \"paymentStatus\" = 'paid' THEN 1 END")), 'completedPayments'],
        [fn('SUM', literal("CASE WHEN \"paymentStatus\" = 'pending_manual_payment' THEN total ELSE 0 END")), 'totalPendingValue']
      ],
      where: whereConditions,
      raw: true
    });
    
    console.log(`📊 [Admin Finance] Found ${transactions.length} transactions (${count} total)`);
    
    res.json({
      success: true,
      data: {
        transactions: transactions.map(transaction => {
          // Parse customer info if stored as JSON
          let customerInfo = {};
          try {
            customerInfo = transaction.customerInfo ? JSON.parse(transaction.customerInfo) : {};
          } catch (e) {
            // Fallback to user data
          }
          
          // Parse payment instructions if available
          let paymentInstructions = {};
          try {
            paymentInstructions = transaction.paymentInstructions ? JSON.parse(transaction.paymentInstructions) : {};
          } catch (e) {
            // No instructions available
          }
          
          return {
            id: transaction.checkoutSessionId || transaction.id,
            amount: transaction.total || 0,
            status: transaction.paymentStatus,
            date: transaction.completedAt || transaction.lastCheckoutAttempt || transaction.updatedAt,
            customer: {
              id: transaction.user?.id || customerInfo.userId,
              name: customerInfo.name || `${transaction.user?.firstName || ''} ${transaction.user?.lastName || ''}`.trim() || 'Unknown Customer',
              email: customerInfo.email || transaction.user?.email || 'unknown@email.com',
              phone: customerInfo.phone || transaction.user?.phone,
              role: transaction.user?.role
            },
            items: transaction.cartItems?.map(item => ({
              id: item.id,
              name: item.storefrontItem?.name || 'Unknown Item',
              type: item.storefrontItem?.itemType,
              sessions: item.storefrontItem?.sessions,
              quantity: item.quantity,
              price: item.price,
              description: item.storefrontItem?.description
            })) || [],
            checkoutSessionId: transaction.checkoutSessionId,
            paymentInstructions: paymentInstructions,
            createdAt: transaction.createdAt,
            lastAttempt: transaction.lastCheckoutAttempt,
            cartStatus: transaction.status
          };
        }),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: count,
          pages: Math.ceil(count / limitNumber)
        },
        summary: {
          totalTransactions: Number(transactionSummary?.totalTransactions || 0),
          pendingPayments: Number(transactionSummary?.pendingPayments || 0),
          completedPayments: Number(transactionSummary?.completedPayments || 0),
          totalPendingValue: Number(transactionSummary?.totalPendingValue || 0)
        }
      }
    });
    
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    console.error(`💥 [Admin Finance] Transaction fetch failed: ${error.message}`);
    return sendInternalError(res, 'Failed to fetch transactions');
  }
});

/**
 * GET /api/admin/finance/metrics
 * Advanced business metrics and KPIs
 */
router.get('/metrics', validateTimeRangeQuery, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Get models
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();
    
    const now = new Date();
    const periodMs = TIME_RANGE_MS[timeRange];
    const startDate = new Date(now.getTime() - periodMs);
    
    // Customer Lifetime Value (simplified calculation)
    const avgCustomerValue = await ShoppingCart.findOne({
      attributes: [[fn('AVG', col('total')), 'avgValue']],
      where: {
        status: 'completed',
        paymentStatus: 'paid'
      },
      raw: true
    });
    
    // Monthly Recurring Revenue (for subscription packages)
    const mrr = await CartItem.sum('price', {
      include: [{
        model: ShoppingCart,
        as: 'cart',
        where: {
          status: 'completed',
          paymentStatus: 'paid',
          completedAt: {
            [Op.gte]: startDate
          }
        }
      }, {
        model: StorefrontItem,
        as: 'storefrontItem',
        where: {
          itemType: 'TRAINING_PACKAGE_SUBSCRIPTION'
        }
      }]
    }) || 0;
    
    // Customer segmentation
    const customerSegments = await User.findAll({
      attributes: [
        'role',
        [fn('COUNT', col('id')), 'count'],
        // Correlated subquery — three bugs made the whole /finance/metrics panel 500:
        //   FROM ShoppingCarts   -> real table is snake_case `shopping_carts`
        //   status = "completed" -> double quotes = an IDENTIFIER; string literal needs 'single'
        //   userId = User.id     -> unquoted camelCase folds to lowercase; must be "userId"/"User"."id"
        // Sequelize aliases the outer User model as "User" (modelName). NOTE: raw correlated
        // SQL — verify on staging (Rule 55) before trusting the number; the shape is untestable
        // against a mocked sequelize.query.
        [fn('AVG', literal('(SELECT COALESCE(SUM(total), 0) FROM shopping_carts WHERE "userId" = "User"."id" AND status = \'completed\')')), 'avgSpent']
      ],
      group: ['role'],
      raw: true
    });
    
    // Package performance metrics
    const packageMetrics = await StorefrontItem.findAll({
      attributes: [
        'itemType',
        [fn('COUNT', col('cartItems.id')), 'sales'],
        [fn('SUM', literal('cartItems.quantity * cartItems.price')), 'revenue']
      ],
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: ShoppingCart,
          as: 'cart',
          where: {
            status: 'completed',
            paymentStatus: 'paid',
            completedAt: {
              [Op.gte]: startDate
            }
          }
        }]
      }],
      group: ['itemType'],
      raw: true
    });
    
    // Churn rate calculation (simplified)
    const totalCustomers = await User.count({
      where: {
        role: ['client', 'user']
      }
    });
    
    const activeCustomers = await User.count({
      distinct: true,
      col: 'User.id',
      include: [{
        model: ShoppingCart,
        as: 'shoppingCarts',
        where: {
          completedAt: {
            [Op.gte]: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // Active in last 90 days
          }
        }
      }]
    });
    
    const churnRate = totalCustomers > 0 ? ((totalCustomers - activeCustomers) / totalCustomers) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        businessMetrics: {
          customerLifetimeValue: avgCustomerValue?.avgValue || 0,
          monthlyRecurringRevenue: mrr,
          churnRate: Math.round(churnRate * 100) / 100,
          activeCustomers,
          totalCustomers
        },
        customerSegments: customerSegments.map(segment => ({
          role: segment.role,
          count: segment.count,
          averageSpent: Math.round((segment.avgSpent || 0) * 100) / 100
        })),
        packagePerformance: packageMetrics.map(metric => ({
          type: metric.itemType,
          sales: metric.sales || 0,
          revenue: metric.revenue || 0
        })),
        timeRange,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error fetching business metrics:', error);
    return sendInternalError(res, 'Failed to fetch business metrics');
  }
});

/**
 * GET /api/admin/finance/notifications
 * Financial alerts and notifications
 */
router.get('/notifications', validateNotificationsQuery, async (req, res) => {
  try {
    // Get models
    const ShoppingCart = getShoppingCart();
    const User = getUser();
    
    const notifications = [];
    
    // Check for large transactions in the last 24 hours
    const largeTransactions = await ShoppingCart.findAll({
      where: {
        status: 'completed',
        paymentStatus: 'paid',
        total: {
          [Op.gte]: 500 // Transactions over $500
        },
        completedAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName']
      }],
      order: [['completedAt', 'DESC']]
    });
    
    largeTransactions.forEach(transaction => {
      notifications.push({
        id: `hvp_${transaction.id}`,
        type: 'high_value_purchase',
        title: 'High Value Purchase',
        message: `${transaction.user?.firstName} ${transaction.user?.lastName} made a $${transaction.total} purchase`,
        amount: transaction.total,
        timestamp: transaction.completedAt,
        priority: 'high'
      });
    });
    
    // Check for failed payments (if tracking exists)
    // This would be expanded with actual payment failure tracking
    
    // Revenue milestones
    const todayRevenue = await ShoppingCart.sum('total', {
      where: {
        status: 'completed',
        paymentStatus: 'paid',
        completedAt: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    }) || 0;
    
    if (todayRevenue > 1000) {
      const dateStr = new Date().toISOString().slice(0, 10);
      notifications.push({
        id: `rev_milestone_${dateStr}`,
        type: 'revenue_milestone',
        title: 'Daily Revenue Milestone',
        message: `Daily revenue exceeded $1,000 (currently $${todayRevenue})`,
        amount: todayRevenue,
        timestamp: new Date(new Date().setHours(0, 0, 0, 0)),
        priority: 'medium'
      });
    }

    // Deterministic sort: timestamp DESC, then id DESC
    notifications.sort((a, b) => {
      const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return timeDiff !== 0 ? timeDiff : b.id.localeCompare(a.id);
    });

    const limit = readInteger(req.query.limit, 20);
    const offset = readInteger(req.query.offset, 0);
    const paginatedNotifications = notifications.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        pagination: { total: notifications.length, limit, offset, hasMore: offset + limit < notifications.length },
        unreadCount: notifications.length,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error fetching financial notifications:', error);
    return sendInternalError(res, 'Failed to fetch financial notifications');
  }
});

/**
 * GET /api/admin/finance/export
 * Export financial data for reporting
 */
router.get('/export', validateExportQuery, async (req, res) => {
  try {
    const { format = 'json', startDate, endDate, type = 'transactions', timeRange } = req.query;
    
    // Get models
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();
    
    const whereConditions = {
      status: 'completed',
      paymentStatus: 'paid'
    };
    
    if (startDate || endDate) {
      whereConditions.completedAt = {};
      if (startDate) whereConditions.completedAt[Op.gte] = new Date(startDate);
      if (endDate) whereConditions.completedAt[Op.lte] = new Date(endDate);
    } else if (timeRange) {
      whereConditions.completedAt = {
        [Op.gte]: getTimeRangeStart(timeRange)
      };
    }
    
    const transactions = await ShoppingCart.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: CartItem,
          as: 'cartItems',
          include: [{
            model: StorefrontItem,
            as: 'storefrontItem',
            attributes: ['name', 'itemType']
          }]
        }
      ],
      order: [['completedAt', 'DESC']]
    });
    
    const exportData = transactions.map(transaction => ({
      transactionId: transaction.id,
      date: transaction.completedAt,
      customerName: transaction.user ? `${transaction.user.firstName} ${transaction.user.lastName}` : 'Unknown',
      customerEmail: transaction.user?.email || 'Unknown',
      amount: transaction.total,
      status: transaction.paymentStatus,
      items: transaction.cartItems?.map(item => item.storefrontItem?.name).join(', ') || 'Unknown'
    }));
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Transaction ID,Date,Customer Name,Customer Email,Amount,Status,Items\n';
      const csvRows = exportData.map(row => 
        `${row.transactionId},${row.date},${row.customerName},${row.customerEmail},${row.amount},${row.status},"${row.items}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="swanstudios-financial-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeader + csvRows);
    } else {
      res.json({
        success: true,
        data: exportData,
        meta: {
          totalRecords: exportData.length,
          exportedAt: new Date().toISOString(),
          type,
          dateRange: { startDate, endDate, timeRange }
        }
      });
    }
    
  } catch (error) {
    logger.error('Error exporting financial data:', error);
    return sendInternalError(res, 'Failed to export financial data');
  }
});

/**
 * GET /api/admin/trainers
 * Get all trainers for admin management.
 * Includes admin users because admins can also function as trainers
 * (e.g., Sean Swan is both admin AND a trainer who takes clients).
 * @access Private (Admin Only)
 */
router.get('/trainers', async (req, res) => {
  try {
    // Get models
    const User = getUser();

    // Include both trainer-role AND admin-role users so admins
    // can assign clients to themselves and see them in My Training
    const trainers = await User.findAll({
      where: {
        role: { [Op.in]: ['trainer', 'admin'] }
      },
      attributes: [
        'id', 'firstName', 'lastName', 'email', 'phone', 'photo', 
        'specialties', 'certifications', 'bio', 'isActive', 'hourlyRate',
        'trainerType', 'createdAt', 'updatedAt', 'lastLoginAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    // Format trainers data for admin dashboard
    const formattedTrainers = trainers.map(trainer => {
      const certifications = splitCsvList(trainer.certifications);

      return {
        id: trainer.id,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        name: `${trainer.firstName} ${trainer.lastName}`,
        email: trainer.email,
        phone: trainer.phone,
        photo: trainer.photo,
        isActive: Boolean(trainer.isActive),
        specialty: splitCsvList(trainer.specialties),
        certifications,
        verified: false,
        verificationSource: 'not_tracked',
        status: trainer.isActive ? 'active' : 'inactive',
        joinedAt: trainer.createdAt,
        lastActive: trainer.lastLoginAt || trainer.updatedAt,
        hourlyRate: trainer.hourlyRate,
        trainerType: trainer.trainerType,
        stats: {
          activeClients: null,
          totalSessions: null,
          monthlyRevenue: null,
          rating: null,
          completedCertifications: certifications.length,
          source: 'not_tracked'
        },
        location: null,
        bio: trainer.bio || ''
      };
    });
    
    res.json({
      success: true,
      trainers: formattedTrainers
    });
    
  } catch (error) {
    logger.error('Error fetching trainers for admin:', error);
    return sendInternalError(res, 'Failed to fetch trainers');
  }
});

export default router;
