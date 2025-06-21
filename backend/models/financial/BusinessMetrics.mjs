/**
 * BusinessMetrics Model - SwanStudios Business Intelligence
 * ========================================================
 * Aggregated business metrics for analytics and reporting
 * 
 * Features:
 * - Daily/weekly/monthly/yearly aggregations
 * - Revenue and customer analytics
 * - Package performance tracking
 * - Conversion rate monitoring
 * - Business health indicators
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../../database.mjs';

class BusinessMetrics extends Model {
  /**
   * Get formatted total revenue
   */
  getFormattedRevenue() {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(this.totalRevenue);
  }

  /**
   * Get customer retention rate
   */
  getRetentionRate() {
    if (this.totalCustomers === 0) return 0;
    return ((this.returningCustomers / this.totalCustomers) * 100).toFixed(2);
  }

  /**
   * Get new customer rate
   */
  getNewCustomerRate() {
    if (this.totalCustomers === 0) return 0;
    return ((this.newCustomers / this.totalCustomers) * 100).toFixed(2);
  }

  /**
   * Get revenue per customer
   */
  getRevenuePerCustomer() {
    if (this.totalCustomers === 0) return 0;
    return (this.totalRevenue / this.totalCustomers).toFixed(2);
  }

  /**
   * Get sessions per package ratio
   */
  getSessionsPerPackage() {
    if (this.packagesSold === 0) return 0;
    return (this.sessionsSold / this.packagesSold).toFixed(1);
  }

  /**
   * Check if this is a growth period
   */
  isGrowthPeriod(previousMetrics) {
    if (!previousMetrics) return null;
    return this.totalRevenue > previousMetrics.totalRevenue;
  }

  /**
   * Calculate growth rate compared to previous period
   */
  getGrowthRate(previousMetrics) {
    if (!previousMetrics || previousMetrics.totalRevenue === 0) return null;
    return (((this.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue) * 100).toFixed(2);
  }

  /**
   * Get business health score (0-100)
   */
  getHealthScore() {
    let score = 0;
    
    // Revenue score (40% weight)
    if (this.totalRevenue > 0) score += 40;
    
    // Transaction score (20% weight)
    if (this.totalTransactions > 0) score += 20;
    
    // Customer acquisition score (20% weight)
    if (this.newCustomers > 0) score += 20;
    
    // Conversion rate score (10% weight)
    if (this.conversionRate && this.conversionRate > 0) score += 10;
    
    // Low refund rate bonus (10% weight)
    if (this.refundRate < 5) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Static method to get metrics for date range
   */
  static async getMetricsForPeriod(startDate, endDate, period = 'daily') {
    return await this.findAll({
      where: {
        date: {
          [sequelize.Op.between]: [startDate, endDate]
        },
        period
      },
      order: [['date', 'ASC']]
    });
  }

  /**
   * Static method to get latest metrics
   */
  static async getLatestMetrics(period = 'daily') {
    return await this.findOne({
      where: { period },
      order: [['date', 'DESC']]
    });
  }

  /**
   * Static method to calculate metrics for a specific date
   */
  static async calculateMetricsForDate(date, period = 'daily') {
    const FinancialTransaction = sequelize.models.FinancialTransaction;
    const User = sequelize.models.User;
    const StorefrontItem = sequelize.models.StorefrontItem;
    
    // Define date range based on period
    let startDate, endDate;
    const targetDate = new Date(date);
    
    switch (period) {
      case 'daily':
        startDate = new Date(targetDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        // Start of week (Monday)
        startDate = new Date(targetDate);
        startDate.setDate(targetDate.getDate() - targetDate.getDay() + 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(targetDate.getFullYear(), 0, 1);
        endDate = new Date(targetDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        throw new Error('Invalid period specified');
    }

    // Calculate revenue metrics
    const revenueData = await FinancialTransaction.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
        [sequelize.fn('COALESCE', sequelize.fn('AVG', sequelize.col('amount')), 0), 'averageOrderValue']
      ],
      where: {
        status: 'succeeded',
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      raw: true
    });

    // Calculate customer metrics
    const newCustomers = await User.count({
      where: {
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      }
    });

    const returningCustomers = await FinancialTransaction.count({
      distinct: true,
      col: 'userId',
      include: [{
        model: User,
        where: {
          createdAt: {
            [sequelize.Op.lt]: startDate
          }
        }
      }],
      where: {
        status: 'succeeded',
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      }
    });

    const totalCustomers = await FinancialTransaction.count({
      distinct: true,
      col: 'userId',
      where: {
        status: 'succeeded',
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      }
    });

    // Create or update metrics record
    const metricsData = {
      date: targetDate.toISOString().split('T')[0],
      period,
      totalRevenue: parseFloat(revenueData.totalRevenue) || 0,
      totalTransactions: parseInt(revenueData.totalTransactions) || 0,
      averageOrderValue: parseFloat(revenueData.averageOrderValue) || 0,
      newCustomers,
      returningCustomers,
      totalCustomers,
      // These would be calculated from additional data sources
      conversionRate: 0, // Would come from website analytics
      refundRate: 0, // Would be calculated from refund data
      packagesSold: 0, // Would be calculated from cart items
      sessionsSold: 0, // Would be calculated from cart items
    };

    const [metrics, created] = await this.findOrCreate({
      where: { date: metricsData.date, period },
      defaults: metricsData
    });

    if (!created) {
      await metrics.update(metricsData);
    }

    return metrics;
  }

  /**
   * Static method to get metrics comparison
   */
  static async getMetricsComparison(currentDate, period = 'daily') {
    const current = await this.findOne({
      where: { date: currentDate, period }
    });

    if (!current) return null;

    // Calculate previous period date
    let previousDate;
    const date = new Date(currentDate);
    
    switch (period) {
      case 'daily':
        previousDate = new Date(date);
        previousDate.setDate(date.getDate() - 1);
        break;
      case 'weekly':
        previousDate = new Date(date);
        previousDate.setDate(date.getDate() - 7);
        break;
      case 'monthly':
        previousDate = new Date(date);
        previousDate.setMonth(date.getMonth() - 1);
        break;
      case 'yearly':
        previousDate = new Date(date);
        previousDate.setFullYear(date.getFullYear() - 1);
        break;
    }

    const previous = await this.findOne({
      where: { 
        date: previousDate.toISOString().split('T')[0], 
        period 
      }
    });

    return {
      current,
      previous,
      growthRate: previous ? current.getGrowthRate(previous) : null,
      isGrowth: previous ? current.isGrowthPeriod(previous) : null
    };
  }
}

BusinessMetrics.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date for these metrics'
  },
  period: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
    allowNull: false,
    defaultValue: 'daily',
    comment: 'Time period these metrics represent'
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total revenue for the period'
  },
  totalTransactions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of completed transactions'
  },
  averageOrderValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Average order value for the period'
  },
  newCustomers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of new customers acquired'
  },
  returningCustomers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of returning customers'
  },
  totalCustomers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total active customers'
  },
  conversionRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Conversion rate percentage'
  },
  refundRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Refund rate percentage'
  },
  packagesSold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of training packages sold'
  },
  sessionsSold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total training sessions sold'
  },
  topPackageId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'StorefrontItems',
      key: 'id'
    },
    comment: 'Best selling package for the period'
  },
  topPackageRevenue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Revenue from top selling package'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'BusinessMetrics',
  tableName: 'business_metrics',
  timestamps: true,
  indexes: [
    {
      fields: ['date', 'period'],
      unique: true,
      name: 'business_metrics_date_period_idx'
    },
    {
      fields: ['date'],
      name: 'business_metrics_date_idx'
    },
    {
      fields: ['period'],
      name: 'business_metrics_period_idx'
    },
    {
      fields: ['totalRevenue'],
      name: 'business_metrics_revenue_idx'
    }
  ]
});

export default BusinessMetrics;