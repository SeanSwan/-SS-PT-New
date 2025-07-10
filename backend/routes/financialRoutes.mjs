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
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// DEPLOYMENT TEST: Simple endpoint to verify financial routes are loaded
router.get('/test', (req, res) => {
  console.log('💡 Financial routes test endpoint hit - deployment confirmed!');
  res.json({
    success: true,
    message: 'Financial routes are working!',
    endpoint: '/api/financial/test',
    timestamp: new Date().toISOString(),
    deploymentStatus: 'NEW_CODE_DEPLOYED'
  });
});

// Apply authentication to all financial routes EXCEPT test endpoint
router.use(protect);

// DEPLOYMENT DEBUG: Log that financial routes are loaded
console.log('🔧 FINANCIAL ROUTES LOADED - track-checkout-start endpoint available');
logger.info('Financial routes module loaded with track-checkout-start endpoint');

/**
 * POST /api/financial/track-checkout-start
 * Track checkout initiation for admin dashboard analytics
 * Called when user begins checkout process for real-time monitoring
 */
router.post('/track-checkout-start', async (req, res) => {
  // DEPLOYMENT DEBUG: Log that endpoint is being hit
  console.log('🚨 track-checkout-start endpoint HIT - new code is deployed!');
  logger.info('track-checkout-start endpoint accessed', {
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // DEBUG: Log the exact request body to see what's missing
  console.log('🔍 [DEBUG] Request body received:', JSON.stringify(req.body, null, 2));
  logger.info('track-checkout-start request data', {
    body: req.body,
    hasSessionId: !!req.body.sessionId,
    hasCartId: !!req.body.cartId,
    hasAmount: !!req.body.amount,
    sessionIdValue: req.body.sessionId,
    cartIdValue: req.body.cartId,
    amountValue: req.body.amount
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
      console.log('⚠️ [VALIDATION ERROR] Missing required fields:', missingFields);
      console.log('🔍 [VALIDATION DEBUG] Received values:', {
        sessionId: sessionId || 'MISSING',
        cartId: cartId || 'MISSING',
        amount: amount || 'MISSING'
      });
      
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        details: {
          required: ['sessionId', 'cartId', 'amount'],
          missing: missingFields,
          received: {
            sessionId: sessionId || null,
            cartId: cartId || null,
            amount: amount || null
          }
        }
      });
    }

    // Create checkout tracking entry for admin analytics
    const trackingData = {
      userId,
      cartId: parseInt(cartId),
      stripePaymentIntentId: sessionId, // Use session ID as tracking reference
      amount: parseFloat(amount),
      currency: 'USD',
      status: 'checkout_started',
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
    res.status(500).json({
      success: false,
      message: 'Failed to track checkout start',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/financial/log-transaction
 * Log transaction to PostgreSQL FinancialTransaction table
 * Used by checkout components for comprehensive tracking
 */
router.post('/log-transaction', async (req, res) => {
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
      failureReason,
      ipAddress,
      userAgent
    } = req.body;

    // Validate required fields
    if (!stripePaymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Stripe Payment Intent ID is required'
      });
    }

    // Check if transaction already exists (prevent duplicates)
    let existingTransaction = await FinancialTransaction.findOne({
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
      ipAddress: ipAddress || req.ip || req.connection.remoteAddress,
      userAgent: userAgent || req.headers['user-agent']
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
    res.status(500).json({
      success: false,
      message: 'Failed to log transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/financial/update-metrics
 * Update business metrics in PostgreSQL for chart generation
 * Aggregates data for analytics dashboards
 */
router.post('/update-metrics', async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Failed to update business metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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

    // Build where clause
    const whereClause = {};
    
    // Non-admin users can only see their own transactions
    if (!adminView || req.user.role !== 'admin') {
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
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: adminView ? ['User'] : [] // Include user data for admin view
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
          ...(adminView && transaction.User ? {
            user: {
              id: transaction.User.id,
              name: `${transaction.User.firstName} ${transaction.User.lastName}`,
              email: transaction.User.email
            }
          } : {})
        })),
        pagination: {
          total: transactions.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: transactions.count > (parseInt(offset) + parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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

    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for analytics data'
      });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

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
          period: `${days} days`
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
    res.status(500).json({
      success: false,
      message: 'Failed to calculate metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;