/**
 * Admin Analytics Revenue Routes
 * ==============================
 *
 * Purpose:
 * - Provide revenue analytics and statistics for admin dashboards.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md
 *
 * Architecture Overview (ASCII):
 * Admin UI -> /api/admin/analytics/revenue -> Revenue analytics -> PostgreSQL
 * Admin UI -> /api/admin/analytics/statistics/revenue -> Revenue stats -> PostgreSQL
 *
 * Middleware Flow:
 * Request -> authenticateToken -> authorizeAdmin -> rateLimit -> handler -> response
 *
 * API Endpoints:
 * - GET /api/admin/analytics/revenue
 * - GET /api/admin/analytics/statistics/revenue
 *
 * Security:
 * - JWT auth required
 * - Admin role enforced
 * - Rate limiting applied
 *
 * WHY:
 * - Keep analytics endpoints for panels
 * - Keep statistics aliases for overview widgets
 *
 * Env:
 * - STRIPE_SECRET_KEY (optional)
 *
 * Testing:
 * - See ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md (testing checklist)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { Op } from 'sequelize';
import Stripe from 'stripe';

import { authenticateToken, authorizeAdmin } from '../../middleware/auth.mjs';
import sequelize from '../../database.mjs';
import User from '../../models/User.mjs';
import StorefrontItem from '../../models/StorefrontItem.mjs';
import SessionPackage from '../../models/SessionPackage.mjs';
import Order from '../../models/Order.mjs';
import OrderItem from '../../models/OrderItem.mjs';

const router = express.Router();

const analyticsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many analytics requests. Please try again later.',
  },
});

router.use(authenticateToken);
router.use(authorizeAdmin);
router.use(analyticsRateLimit);

let stripeClient = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

const getDateRangeFromTimeRange = (timeRange) => {
  const now = new Date();
  const startDate = new Date(now);

  switch (timeRange) {
    case '24h':
      startDate.setDate(now.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  const durationMs = now.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate);
  const prevStart = new Date(startDate.getTime() - durationMs);

  return { startDate, endDate: now, prevStart, prevEnd };
};

const calculateChangePercent = (currentValue, previousValue) => {
  if (!previousValue) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
};

const safeCount = async (model, label) => {
  try {
    return await model.count();
  } catch (error) {
    console.warn(`[Revenue Analytics] ${label} count unavailable:`, error.message);
    return 0;
  }
};

// =====================================================
// REVENUE ANALYTICS ENDPOINT
// =====================================================

router.get('/revenue', async (req, res) => {
  try {
    console.log('Revenue analytics API called');

    const { timeRange = '7d' } = req.query;
    const { startDate, endDate, prevStart, prevEnd } = getDateRangeFromTimeRange(timeRange);

    const revenueData = await generateRevenueAnalytics(startDate, endDate, prevStart, prevEnd);

    // Stripe as reconciliation-only: compare but never override DB values
    if (stripeClient) {
      try {
        const stripeData = await getStripeRevenueData(startDate, endDate);
        revenueData.stripeIntegration = true;

        if (stripeData && stripeData.totalRevenue) {
          const dbTotal = revenueData.overview.totalRevenue;
          const stripeTotal = stripeData.totalRevenue;
          const diff = Math.abs(dbTotal - stripeTotal);
          const threshold = Math.max(dbTotal, stripeTotal) * 0.05; // 5% tolerance

          if (diff > threshold) {
            revenueData.reconciliationWarning = true;
            revenueData.reconciliationDetails = {
              dbRevenue: dbTotal,
              stripeRevenue: stripeTotal,
              difference: diff,
              message: 'DB and Stripe revenue differ by more than 5%. Please investigate.',
            };
            console.warn(
              `[Revenue Analytics] Reconciliation mismatch: DB=$${dbTotal} vs Stripe=$${stripeTotal} (diff=$${diff})`
            );
          }
        }
      } catch (stripeError) {
        console.warn('Stripe data unavailable, using database data:', stripeError.message);
        revenueData.stripeIntegration = false;
      }
    }

    res.json({
      success: true,
      data: revenueData,
      timestamp: new Date().toISOString(),
      timeRange,
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

// =====================================================
// STATISTICS ALIAS ENDPOINTS (frontend expects /statistics/*)
// =====================================================

router.get('/statistics/revenue', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const { startDate, endDate, prevStart, prevEnd } = getDateRangeFromTimeRange(timeRange);

    const [currentRevenue, previousRevenue, trendRows] = await Promise.all([
      Order.sum('totalAmount', {
        where: {
          status: 'completed',
          createdAt: { [Op.between]: [startDate, endDate] },
        },
      }),
      Order.sum('totalAmount', {
        where: {
          status: 'completed',
          createdAt: { [Op.between]: [prevStart, prevEnd] },
        },
      }),
      Order.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
        ],
        where: {
          status: 'completed',
          createdAt: { [Op.between]: [startDate, endDate] },
        },
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
        raw: true,
      }),
    ]);

    const totalRevenue = Number(currentRevenue || 0);
    const changePercent = calculateChangePercent(totalRevenue, Number(previousRevenue || 0));

    res.json({
      success: true,
      data: {
        totalRevenue,
        changePercent: Number(changePercent.toFixed(1)),
        trend: trendRows.map((item) => Number(item.revenue || 0)),
        target: Math.round(totalRevenue * 1.15),
      },
    });
  } catch (error) {
    console.error('Statistics revenue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue statistics' });
  }
});

// =====================================================
// DATA GENERATION FUNCTIONS
// =====================================================

async function generateRevenueAnalytics(startDate, endDate, prevStart, prevEnd) {
  try {
    // ── Completed/paid statuses for revenue queries ──
    const revenueStatuses = { [Op.in]: ['completed', 'paid'] };
    const dateRange = { [Op.between]: [startDate, endDate] };
    const prevDateRange = { [Op.between]: [prevStart, prevEnd] };

    // ── Rolling 30-day window (for monthlyRecurring) ──
    const rolling30Start = new Date(endDate);
    rolling30Start.setDate(rolling30Start.getDate() - 30);

    // ── Fire all independent queries in parallel ──
    const [
      totalRevenueRaw,
      refundRevenueRaw,
      rolling30dRevenueRaw,
      totalTransactions,
      totalCustomers,
      prevRevenueRaw,
      prevTransactions,
      prevCustomers,
      revenueHistoryRows,
      topPackageRows,
    ] = await Promise.all([
      // 1. Total revenue (completed + paid) in period
      Order.sum('totalAmount', {
        where: { status: revenueStatuses, createdAt: dateRange },
      }),
      // 2. Refund revenue in period
      Order.sum('totalAmount', {
        where: { status: 'refunded', createdAt: dateRange },
      }),
      // 3. Rolling 30-day revenue
      Order.sum('totalAmount', {
        where: {
          status: revenueStatuses,
          createdAt: { [Op.between]: [rolling30Start, endDate] },
        },
      }),
      // 4. Total transaction count in period
      Order.count({
        where: { status: revenueStatuses, createdAt: dateRange },
      }),
      // 5. Distinct customers with completed orders in period
      Order.count({
        where: { status: revenueStatuses, createdAt: dateRange },
        distinct: true,
        col: 'userId',
      }),
      // 6. Previous-period revenue (for change calculation)
      Order.sum('totalAmount', {
        where: { status: revenueStatuses, createdAt: prevDateRange },
      }),
      // 7. Previous-period transaction count
      Order.count({
        where: { status: revenueStatuses, createdAt: prevDateRange },
      }),
      // 8. Previous-period customer count
      Order.count({
        where: { status: revenueStatuses, createdAt: prevDateRange },
        distinct: true,
        col: 'userId',
      }),
      // 9. Daily revenue history (GROUP BY DATE)
      Order.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'transactions'],
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'customers'],
        ],
        where: { status: revenueStatuses, createdAt: dateRange },
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
        raw: true,
      }),
      // 10. Top packages by revenue (from OrderItem)
      OrderItem.findAll({
        attributes: [
          'name',
          [sequelize.fn('SUM', sequelize.col('subtotal')), 'revenue'],
          [sequelize.fn('COUNT', sequelize.col('OrderItem.id')), 'count'],
        ],
        include: [{
          model: Order,
          as: 'order',
          attributes: [],
          where: { status: revenueStatuses, createdAt: dateRange },
        }],
        group: ['name'],
        order: [[sequelize.fn('SUM', sequelize.col('subtotal')), 'DESC']],
        limit: 10,
        raw: true,
      }).catch((err) => {
        console.warn('[Revenue Analytics] Top packages query failed, falling back:', err.message);
        return [];
      }),
    ]);

    // ── Derive computed values ──
    const totalRevenue = Number(totalRevenueRaw || 0);
    const refundRevenue = Number(refundRevenueRaw || 0);
    const netRevenue = totalRevenue - refundRevenue;
    const rolling30dRevenue = Number(rolling30dRevenueRaw || 0);
    const averageTransaction = totalTransactions > 0
      ? Math.round(netRevenue / totalTransactions)
      : 0;

    // Previous-period values
    const prevRevenue = Number(prevRevenueRaw || 0);

    // ── Build revenueHistory array ──
    const revenueHistory = revenueHistoryRows.map((row) => ({
      date: typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0],
      revenue: Math.round(Number(row.revenue || 0)),
      transactions: Number(row.transactions || 0),
      customers: Number(row.customers || 0),
      month: new Date(row.date).toLocaleString('default', { month: 'short' }),
    }));

    // ── Build topPackages with percentages ──
    const topPackageTotalRevenue = topPackageRows.reduce(
      (sum, row) => sum + Number(row.revenue || 0), 0
    );
    const topPackages = topPackageRows.map((row) => {
      const pkgRevenue = Math.round(Number(row.revenue || 0));
      return {
        name: row.name || 'Unknown Package',
        revenue: pkgRevenue,
        percentage: topPackageTotalRevenue > 0
          ? Number(((pkgRevenue / topPackageTotalRevenue) * 100).toFixed(1))
          : 0,
      };
    });

    // ── Conversion rate: customers / total users ──
    const totalUsers = await safeCount(User, 'User');
    const conversionRate = totalUsers > 0
      ? Number(((totalCustomers / totalUsers) * 100).toFixed(1))
      : 0;

    // ── Recent transactions (real data) ──
    const recentTransactions = await generateRecentTransactions(5);

    return {
      overview: {
        totalRevenue: Math.round(netRevenue),
        monthlyRecurring: Math.round(rolling30dRevenue),
        averageTransaction,
        totalCustomers,
        conversionRate,
        customerLifetimeValue: averageTransaction * 12,
      },
      changes: {
        revenue: Number(calculateChangePercent(netRevenue, prevRevenue).toFixed(1)),
        transactions: Number(calculateChangePercent(totalTransactions, prevTransactions).toFixed(1)),
        customers: Number(calculateChangePercent(totalCustomers, prevCustomers).toFixed(1)),
        conversion: 0, // conversion change requires historical user counts, omit synthetic
      },
      revenueHistory,
      topPackages,
      recentTransactions,
    };
  } catch (error) {
    console.error('Error generating revenue analytics:', error);
    throw error;
  }
}

async function generateRecentTransactions(count = 5) {
  try {
    const recentOrders = await Order.findAll({
      where: {
        status: { [Op.in]: ['completed', 'paid', 'processing', 'pending'] },
      },
      order: [['createdAt', 'DESC']],
      limit: count,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email'],
        },
        {
          model: OrderItem,
          as: 'orderItems',
          attributes: ['name'],
          limit: 1, // just grab the first item name for display
        },
      ],
    });

    return recentOrders.map((order) => {
      const user = order.user;
      const customerName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'
        : (order.billingName || 'Unknown');
      const customerEmail = user
        ? user.email
        : (order.billingEmail || '');
      const packageName = order.orderItems && order.orderItems.length > 0
        ? order.orderItems[0].name
        : (order.notes || 'Order');

      return {
        id: order.paymentId || `order_${order.id}`,
        customer: {
          name: customerName,
          email: customerEmail,
        },
        amount: Number(order.totalAmount || 0),
        date: order.createdAt.toISOString(),
        status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        package: packageName,
      };
    });
  } catch (error) {
    console.warn('[Revenue Analytics] Recent transactions query failed:', error.message);
    return [];
  }
}

async function getStripeRevenueData(startDate, endDate) {
  if (!stripeClient) return null;

  try {
    const charges = await stripeClient.charges.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });

    const totalRevenue =
      charges.data.reduce((sum, charge) => sum + (charge.amount_captured || 0), 0) / 100;

    const averageTransaction =
      charges.data.length > 0 ? totalRevenue / charges.data.length : 0;

    return {
      totalRevenue: Math.round(totalRevenue),
      averageTransaction: Math.round(averageTransaction),
      transactionCount: charges.data.length,
    };
  } catch (error) {
    console.warn('Stripe data fetch failed:', error.message);
    return null;
  }
}

export default router;
