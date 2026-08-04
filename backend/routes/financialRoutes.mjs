/**
 * Financial Routes - PostgreSQL Data Persistence for Charts & Analytics
 * ====================================================================
 * Comprehensive financial data API for checkout integration with PostgreSQL
 * 
 * Features:
 * - Transaction logging to FinancialTransaction model
 * - Business metrics updates to BusinessMetrics model  
 * - Real-time analytics data for charts/graphs
 * - Admin dashboard financial intelligence
 * - Client progress tracking data
 * 
 * Database Models Used:
 * - FinancialTransaction.mjs (individual transaction records)
 * - BusinessMetrics.mjs (aggregated metrics for charts)
 * 
 * Master Prompt v28.6 Compliance:
 * ✅ Production-ready error handling
 * ✅ PostgreSQL data persistence for analytics
 * ✅ Comprehensive logging for business intelligence
 * ✅ Security validation and authentication
 */

import express from 'express';
import FinancialTransaction from '../models/financial/FinancialTransaction.mjs';
import BusinessMetrics from '../models/financial/BusinessMetrics.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { getTaxRate, calculateForwardTax, calculateTax } from '../utils/taxCalculator.mjs';
import { getAllModels } from '../models/index.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';

function sendInternalError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: INTERNAL_ERROR,
  });
}

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function parsePositiveAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

// Authenticated availability check for financial routes.
router.get('/test', protect, (_req, res) => {
  res.json({
    success: true,
    message: 'Financial routes are available',
    timestamp: new Date().toISOString()
  });
});

// Apply authentication to all financial routes.
router.use(protect);

// Log route registration without emitting deployment marker strings.
logger.info('Financial routes module loaded with track-checkout-start endpoint');

/**
 * POST /api/financial/track-checkout-start
 * Track checkout initiation for admin dashboard analytics
 * Called when user begins checkout process for real-time monitoring
 */
router.post('/track-checkout-start', async (req, res) => {
  logger.info('track-checkout-start endpoint accessed', {
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  logger.info('track-checkout-start request data', {
    hasSessionId: !!req.body.sessionId,
    hasCartId: !!req.body.cartId,
    hasAmount: !!req.body.amount
  });
  
  try {
    const userId = req.user.id;
    const {
      sessionId,
      cartId,
      amount,
      sessionCount,
      timestamp
    } = req.body;

    // Validate required fields with detailed error messaging
    const missingFields = [];
    if (!sessionId) missingFields.push('sessionId');
    if (!cartId) missingFields.push('cartId');
    if (!amount) missingFields.push('amount');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        details: {
          required: ['sessionId', 'cartId', 'amount'],
          missing: missingFields
        }
      });
    }

    const normalizedCartId = parsePositiveInteger(cartId);
    if (!normalizedCartId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cart id',
        error: { code: 'INVALID_CART_ID' }
      });
    }

    const normalizedAmount = parsePositiveAmount(amount);
    if (!normalizedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
        error: { code: 'INVALID_AMOUNT' }
      });
    }

    // Create checkout tracking entry for admin analytics
    const trackingData = {
      userId,
      cartId: normalizedCartId,
      stripePaymentIntentId: sessionId, // Use session ID as tracking reference
      amount: normalizedAmount,
      currency: 'USD',
      status: 'pending', // enum_financial_transactions_status has no 'checkout_started' — every tracking insert threw (drift sweep 2026-08-04); checkout-start context lives in metadata.source
      description: `Checkout initiated - ${sessionCount || 0} sessions`,
      metadata: JSON.stringify({
        sessionCount: sessionCount || 0,
        checkoutStartedAt: timestamp || new Date().toISOString(),
        source: 'genesis_checkout_tracking'
      }),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Log the checkout start event
    const trackingRecord = await FinancialTransaction.create(trackingData);

    logger.info(`Checkout tracking started: ${trackingRecord.id} for user ${userId}, cart ${cartId}, amount ${amount}`);

    // Update business metrics for real-time dashboard
    try {
      // Note: Business metrics will be calculated in batch processes
      // This tracking creates the raw data for later aggregation
      logger.info(`Checkout metrics data created for future aggregation on ${new Date().toISOString().split('T')[0]}`);
    } catch (metricsError) {
      logger.warn('Failed to log metrics info:', metricsError.message);
      // Don't fail the tracking for metrics errors
    }

    res.json({
      success: true,
      message: 'Checkout start tracked successfully',
      data: {
        trackingId: trackingRecord.id,
        sessionId,
        cartId,
        amount: trackingRecord.amount,
        timestamp: trackingRecord.createdAt
      }
    });

  } catch (error) {
    logger.error('Error tracking checkout start:', error);
    return sendInternalError(res, 'Failed to track checkout start');
  }
});

/**
 * POST /api/financial/log-transaction
 * Write a row to the FinancialTransaction ledger.
 *
 * ⚠ ADMIN-ONLY since 2026-07-28 (launch audit, SWA-75). Until then this was
 * `protect`-only — any authenticated user — and it:
 *   1. UPDATED an existing transaction matched ONLY on stripePaymentIntentId,
 *      with NO ownership check. Supplying another user's payment-intent id let a
 *      client overwrite that row's status, refundAmount, feeAmount, netAmount,
 *      processedAt, failureReason and metadata — i.e. mark a real payment
 *      refunded or failed, or restate its amounts.
 *   2. CREATED rows from a client-supplied `amount`, so a user could fabricate
 *      ledger entries attributed to themselves.
 *   3. Accepted client-supplied `ipAddress`/`userAgent`, letting the caller
 *      forge the audit trail of their own write.
 *
 * The authoritative writer for real payments is the SIGNATURE-VERIFIED Stripe
 * webhook (`backend/webhooks/stripeWebhook.mjs`); manual/offline payments go
 * through `offlinePaymentRoutes` which validates prices server-side and creates
 * a PENDING order for admin confirmation. No client ever needs this endpoint,
 * and no frontend code calls it — the only `/api/financial/*` call in the app is
 * `/track-checkout-start`.
 *
 * Kept rather than deleted so an operator retains a manual reconciliation path;
 * gated so a client cannot reach it.
 */
router.post('/log-transaction', adminOnly, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      cartId,
      orderId,
      stripePaymentIntentId,
      stripeChargeId,
      amount,
      currency = 'USD',
      status,
      paymentMethod,
      paymentMethodDetails,
      description,
      metadata,
      refundAmount,
      feeAmount,
      netAmount,
      processedAt,
      failureReason
    } = req.body;
    // NOTE: ipAddress / userAgent are deliberately absent above. They are
    // OBSERVED from the request below, so a caller cannot forge the origin of
    // its own ledger write.

    // Validate required fields
    if (!stripePaymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Stripe Payment Intent ID is required'
      });
    }

    // Check if transaction already exists (prevent duplicates)
    const existingTransaction = await FinancialTransaction.findOne({
      where: { stripePaymentIntentId }
    });

    if (existingTransaction) {
      // Update existing transaction
      await existingTransaction.update({
        status: status || existingTransaction.status,
        paymentMethod: paymentMethod || existingTransaction.paymentMethod,
        paymentMethodDetails: paymentMethodDetails || existingTransaction.paymentMethodDetails,
        refundAmount: refundAmount || existingTransaction.refundAmount,
        feeAmount: feeAmount || existingTransaction.feeAmount,
        netAmount: netAmount || existingTransaction.netAmount,
        processedAt: processedAt || existingTransaction.processedAt,
        failureReason: failureReason || existingTransaction.failureReason,
        metadata: metadata ? JSON.stringify(metadata) : existingTransaction.metadata
      });

      logger.info(`Updated existing transaction: ${stripePaymentIntentId}`);

      return res.json({
        success: true,
        message: 'Transaction updated successfully',
        data: {
          transactionId: existingTransaction.id,
          stripePaymentIntentId: existingTransaction.stripePaymentIntentId,
          status: existingTransaction.status
        }
      });
    }

    // Create new transaction record
    const transactionData = {
      userId,
      cartId,
      orderId,
      stripePaymentIntentId,
      stripeChargeId,
      amount: parseFloat(amount) || 0,
      currency: currency || 'USD',
      status: status || 'pending',
      paymentMethod,
      paymentMethodDetails: paymentMethodDetails ? JSON.stringify(paymentMethodDetails) : null,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
      refundAmount: parseFloat(refundAmount) || 0,
      feeAmount: parseFloat(feeAmount) || 0,
      netAmount: parseFloat(netAmount) || (parseFloat(amount) - parseFloat(feeAmount || 0)),
      processedAt: processedAt ? new Date(processedAt) : null,
      failureReason,
      // Audit fields are OBSERVED, never accepted from the request body — a
      // caller must not be able to forge the origin of its own ledger write.
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    };

    const transaction = await FinancialTransaction.create(transactionData);

    logger.info(`Created new transaction: ${transaction.id} for user ${userId}`);

    res.json({
      success: true,
      message: 'Transaction logged successfully',
      data: {
        transactionId: transaction.id,
        stripePaymentIntentId: transaction.stripePaymentIntentId,
        status: transaction.status,
        amount: transaction.amount,
        createdAt: transaction.createdAt
      }
    });

  } catch (error) {
    logger.error('Error logging transaction:', error);
    return sendInternalError(res, 'Failed to log transaction');
  }
});

/**
 * POST /api/financial/update-metrics
 * Update business metrics in PostgreSQL for chart generation
 * Aggregates data for analytics dashboards
 */
// ⚠ ADMIN-ONLY since 2026-07-28 (launch audit, SWA-75). Was `protect`-only, so
// any authenticated user could write BusinessMetrics rows that the admin revenue
// dashboards read. Its sibling /calculate-metrics already enforced admin inline;
// this one was missed.
router.post('/update-metrics', adminOnly, async (req, res) => {
  try {
    const {
      transactionData,
      date,
      period = 'daily'
    } = req.body;

    if (!transactionData || !date) {
      return res.status(400).json({
        success: false,
        message: 'Transaction data and date are required'
      });
    }

    // Calculate metrics for the specified date and period
    const metrics = await BusinessMetrics.calculateMetricsForDate(date, period);

    logger.info(`Updated business metrics for ${date} (${period})`);

    res.json({
      success: true,
      message: 'Business metrics updated successfully',
      data: {
        date: metrics.date,
        period: metrics.period,
        totalRevenue: metrics.totalRevenue,
        totalTransactions: metrics.totalTransactions,
        averageOrderValue: metrics.averageOrderValue,
        newCustomers: metrics.newCustomers,
        totalCustomers: metrics.totalCustomers
      }
    });

  } catch (error) {
    logger.error('Error updating business metrics:', error);
    return sendInternalError(res, 'Failed to update business metrics');
  }
});

/**
 * GET /api/financial/transactions
 * Get transaction history for charts and analytics
 */
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      startDate, 
      endDate, 
      status, 
      limit = 50, 
      offset = 0,
      adminView = false 
    } = req.query;
    const limitNumber = Math.min(parsePositiveInteger(limit) || 50, 100);
    const offsetNumber = parseNonNegativeInteger(offset) ?? 0;
    const wantsAdminView = adminView === true || adminView === 'true';

    // Build where clause
    const whereClause = {};
    
    // Non-admin users can only see their own transactions
    if (!wantsAdminView || req.user.role !== 'admin') {
      whereClause.userId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        [FinancialTransaction.sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const transactions = await FinancialTransaction.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: limitNumber,
      offset: offsetNumber,
      include: wantsAdminView ? ['User'] : [] // Include user data for admin view
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.rows.map(transaction => ({
          id: transaction.id,
          stripePaymentIntentId: transaction.stripePaymentIntentId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod,
          description: transaction.description,
          createdAt: transaction.createdAt,
          processedAt: transaction.processedAt,
          formattedAmount: transaction.getFormattedAmount(),
          statusDisplay: transaction.getStatusDisplay(),
          paymentMethodDisplay: transaction.getPaymentMethodDisplay(),
          ...(wantsAdminView && transaction.User ? {
            user: {
              id: transaction.User.id,
              name: `${transaction.User.firstName} ${transaction.User.lastName}`,
              email: transaction.User.email
            }
          } : {})
        })),
        pagination: {
          total: transactions.count,
          limit: limitNumber,
          offset: offsetNumber,
          hasMore: transactions.count > (offsetNumber + limitNumber)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching transactions:', error);
    return sendInternalError(res, 'Failed to fetch transactions');
  }
});

/**
 * GET /api/financial/metrics
 * Get business metrics for charts and analytics
 */
router.get('/metrics', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      period = 'daily',
      adminOnly = false 
    } = req.query;

    // Check admin access for sensitive metrics
    if (adminOnly && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for this data'
      });
    }

    let metrics;

    if (startDate && endDate) {
      // Get metrics for date range
      metrics = await BusinessMetrics.getMetricsForPeriod(
        new Date(startDate), 
        new Date(endDate), 
        period
      );
    } else {
      // Get latest metrics
      metrics = await BusinessMetrics.getLatestMetrics(period);
      metrics = metrics ? [metrics] : [];
    }

    // Format metrics for chart consumption
    const chartData = metrics.map(metric => ({
      date: metric.date,
      period: metric.period,
      totalRevenue: parseFloat(metric.totalRevenue),
      totalTransactions: metric.totalTransactions,
      averageOrderValue: parseFloat(metric.averageOrderValue),
      newCustomers: metric.newCustomers,
      returningCustomers: metric.returningCustomers,
      totalCustomers: metric.totalCustomers,
      conversionRate: parseFloat(metric.conversionRate) || 0,
      refundRate: parseFloat(metric.refundRate),
      packagesSold: metric.packagesSold,
      sessionsSold: metric.sessionsSold,
      // Calculated fields for charts
      formattedRevenue: metric.getFormattedRevenue(),
      retentionRate: parseFloat(metric.getRetentionRate()),
      revenuePerCustomer: parseFloat(metric.getRevenuePerCustomer()),
      healthScore: metric.getHealthScore()
    }));

    res.json({
      success: true,
      data: {
        metrics: chartData,
        summary: chartData.length > 0 ? {
          totalRevenue: chartData.reduce((sum, m) => sum + m.totalRevenue, 0),
          totalTransactions: chartData.reduce((sum, m) => sum + m.totalTransactions, 0),
          totalCustomers: Math.max(...chartData.map(m => m.totalCustomers)),
          averageHealthScore: chartData.reduce((sum, m) => sum + m.healthScore, 0) / chartData.length
        } : null
      }
    });

  } catch (error) {
    logger.error('Error fetching business metrics:', error);
    return sendInternalError(res, 'Failed to fetch business metrics');
  }
});

/**
 * GET /api/financial/analytics
 * Get advanced analytics data for charts and dashboards
 */
router.get('/analytics', async (req, res) => {
  try {
    const { 
      period = 'daily',
      days = 30 
    } = req.query;
    const dayCount = Math.min(parsePositiveInteger(days) || 30, 365);

    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for analytics data'
      });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - dayCount);

    // Get revenue analytics
    const revenueData = await FinancialTransaction.getRevenueForPeriod(startDate, endDate);
    
    // Get payment method breakdown
    const paymentMethodData = await FinancialTransaction.getPaymentMethodBreakdown(startDate, endDate);
    
    // Get top customers
    const topCustomers = await FinancialTransaction.getTopCustomers(startDate, endDate, 10);
    
    // Get metrics for the period
    const metrics = await BusinessMetrics.getMetricsForPeriod(startDate, endDate, period);

    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue: parseFloat(revenueData.totalRevenue) || 0,
          transactionCount: parseInt(revenueData.transactionCount) || 0,
          averageOrderValue: parseFloat(revenueData.averageAmount) || 0,
          period: `${dayCount} days`
        },
        paymentMethods: paymentMethodData.map(method => ({
          method: method.paymentMethod || 'unknown',
          count: parseInt(method.dataValues.count) || 0,
          totalAmount: parseFloat(method.dataValues.totalAmount) || 0,
          percentage: 0 // Will be calculated on frontend
        })),
        topCustomers: topCustomers.map(customer => ({
          userId: customer.userId,
          totalSpent: parseFloat(customer.dataValues.totalSpent) || 0,
          transactionCount: parseInt(customer.dataValues.transactionCount) || 0,
          averageSpent: parseFloat(customer.dataValues.averageSpent) || 0
        })),
        trends: metrics.map(metric => ({
          date: metric.date,
          revenue: parseFloat(metric.totalRevenue),
          transactions: metric.totalTransactions,
          customers: metric.totalCustomers,
          newCustomers: metric.newCustomers
        }))
      }
    });

  } catch (error) {
    logger.error('Error fetching analytics data:', error);
    return sendInternalError(res, 'Failed to fetch analytics data');
  }
});

/**
 * POST /api/financial/calculate-metrics
 * Manually trigger metrics calculation for specific date
 * Useful for backfilling data or real-time updates
 */
router.post('/calculate-metrics', async (req, res) => {
  try {
    const { date, period = 'daily' } = req.body;

    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required to calculate metrics'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const metrics = await BusinessMetrics.calculateMetricsForDate(date, period);

    logger.info(`Manually calculated metrics for ${date} (${period}) by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Metrics calculated successfully',
      data: {
        date: metrics.date,
        period: metrics.period,
        totalRevenue: metrics.totalRevenue,
        totalTransactions: metrics.totalTransactions,
        newCustomers: metrics.newCustomers,
        totalCustomers: metrics.totalCustomers
      }
    });

  } catch (error) {
    logger.error('Error calculating metrics:', error);
    return sendInternalError(res, 'Failed to calculate metrics');
  }
});

/**
 * GET /api/financial/tax/rate
 * Get current tax rate for a state (default: CA)
 */
router.get('/tax/rate', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const stateCode = (req.query.state || 'CA').toUpperCase();
    const taxRate = await getTaxRate(stateCode);

    res.json({
      success: true,
      data: {
        stateCode,
        taxRate,
        taxPercentage: (taxRate * 100).toFixed(2) + '%',
      }
    });
  } catch (error) {
    logger.error('Error fetching tax rate:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tax rate' });
  }
});

/**
 * GET /api/financial/tax/calculator
 * Calculate tax on all active packages + revenue summary
 * Returns tax liability data for the CA Tax Calculator widget
 */
router.get('/tax/calculator', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const stateCode = (req.query.state || 'CA').toUpperCase();
    const taxRate = await getTaxRate(stateCode);

    // Get all active storefront packages
    const { StorefrontItem, Order, ShoppingCart } = getAllModels();

    const packages = StorefrontItem ? await StorefrontItem.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    }) : [];

    // Calculate tax for each package
    const packageTaxBreakdown = packages.map(pkg => {
      const price = parseFloat(pkg.price || pkg.totalCost || 0);
      const tax = calculateForwardTax(price, taxRate);
      return {
        id: pkg.id,
        name: pkg.name,
        packageType: pkg.packageType,
        sessions: pkg.sessions || pkg.totalSessions,
        price,
        taxAmount: tax.taxAmount,
        totalWithTax: tax.netAfterTax,
      };
    });

    // Get completed orders for revenue tax liability
    let revenueData = { totalRevenue: 0, totalTaxLiability: 0, orderCount: 0, lastOrder: null };

    if (Order) {
      try {
        const { Op } = (await import('sequelize')).default || await import('sequelize');
        const completedOrders = await Order.findAll({
          where: { status: { [Op.in]: ['completed', 'processing'] } },
          order: [['createdAt', 'DESC']],
          limit: 100,
        });

        let totalRevenue = 0;
        for (const order of completedOrders) {
          totalRevenue += parseFloat(order.totalAmount || 0);
        }

        const totalTaxLiability = parseFloat((totalRevenue * taxRate).toFixed(2));

        revenueData = {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTaxLiability,
          orderCount: completedOrders.length,
          lastOrder: completedOrders.length > 0 ? {
            id: completedOrders[0].id,
            amount: parseFloat(completedOrders[0].totalAmount || 0),
            taxOnOrder: parseFloat((parseFloat(completedOrders[0].totalAmount || 0) * taxRate).toFixed(2)),
            date: completedOrders[0].createdAt,
          } : null,
        };
      } catch (orderErr) {
        logger.warn('Could not fetch orders for tax calc:', orderErr.message);
      }
    }

    // Also check completed shopping carts as alternative revenue source
    if (ShoppingCart && revenueData.orderCount === 0) {
      try {
        const completedCarts = await ShoppingCart.findAll({
          where: { status: 'completed' },
          order: [['updatedAt', 'DESC']],
          limit: 100,
        });

        let totalRevenue = 0;
        for (const cart of completedCarts) {
          totalRevenue += parseFloat(cart.total || 0);
        }

        revenueData = {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTaxLiability: parseFloat((totalRevenue * taxRate).toFixed(2)),
          orderCount: completedCarts.length,
          lastOrder: completedCarts.length > 0 ? {
            id: completedCarts[0].id,
            amount: parseFloat(completedCarts[0].total || 0),
            taxOnOrder: parseFloat((parseFloat(completedCarts[0].total || 0) * taxRate).toFixed(2)),
            date: completedCarts[0].updatedAt,
          } : null,
        };
      } catch (cartErr) {
        logger.warn('Could not fetch carts for tax calc:', cartErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        stateCode,
        taxRate,
        taxPercentage: (taxRate * 100).toFixed(2) + '%',
        packages: packageTaxBreakdown,
        revenue: revenueData,
      }
    });
  } catch (error) {
    logger.error('Error calculating tax:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate tax data' });
  }
});

export default router;
