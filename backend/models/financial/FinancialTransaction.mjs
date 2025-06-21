/**
 * FinancialTransaction Model - SwanStudios Financial Intelligence
 * =============================================================
 * Comprehensive transaction tracking with Stripe integration
 * 
 * Features:
 * - Complete payment lifecycle tracking
 * - Stripe Payment Intent integration
 * - Fraud detection support
 * - Refund and chargeback tracking
 * - Business intelligence analytics
 * - GDPR compliant data structure
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../../database.mjs';

class FinancialTransaction extends Model {
  /**
   * Get transaction status display
   */
  getStatusDisplay() {
    const statusMap = {
      'pending': 'Pending',
      'processing': 'Processing',
      'succeeded': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded',
      'partially_refunded': 'Partially Refunded'
    };
    return statusMap[this.status] || this.status;
  }

  /**
   * Get formatted amount
   */
  getFormattedAmount() {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency || 'USD'
    }).format(this.amount);
  }

  /**
   * Get net amount after fees
   */
  getNetAmount() {
    return this.netAmount || (this.amount - (this.feeAmount || 0));
  }

  /**
   * Check if transaction is successful
   */
  isSuccessful() {
    return this.status === 'succeeded';
  }

  /**
   * Check if transaction is refundable
   */
  isRefundable() {
    return this.status === 'succeeded' && !this.refundAmount;
  }

  /**
   * Get payment method display name
   */
  getPaymentMethodDisplay() {
    const methodMap = {
      'card': 'Credit/Debit Card',
      'apple_pay': 'Apple Pay',
      'google_pay': 'Google Pay',
      'bank_transfer': 'Bank Transfer',
      'ach_debit': 'ACH Transfer'
    };
    return methodMap[this.paymentMethod] || this.paymentMethod || 'Unknown';
  }

  /**
   * Get transaction age in days
   */
  getDaysOld() {
    return Math.floor((new Date() - new Date(this.createdAt)) / (1000 * 60 * 60 * 24));
  }

  /**
   * Parse metadata safely
   */
  getParsedMetadata() {
    try {
      return this.metadata ? JSON.parse(this.metadata) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Parse payment method details safely
   */
  getParsedPaymentMethodDetails() {
    try {
      return this.paymentMethodDetails ? JSON.parse(this.paymentMethodDetails) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Static method to get revenue for period
   */
  static async getRevenueForPeriod(startDate, endDate) {
    const result = await this.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageAmount']
      ],
      where: {
        status: 'succeeded',
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      raw: true
    });
    
    return result[0] || {
      totalRevenue: 0,
      transactionCount: 0,
      averageAmount: 0
    };
  }

  /**
   * Static method to get payment method breakdown
   */
  static async getPaymentMethodBreakdown(startDate, endDate) {
    return await this.findAll({
      attributes: [
        'paymentMethod',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ],
      where: {
        status: 'succeeded',
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      group: ['paymentMethod'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']]
    });
  }

  /**
   * Static method to get top customers by spend
   */
  static async getTopCustomers(startDate, endDate, limit = 10) {
    return await this.findAll({
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalSpent'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageSpent']
      ],
      where: {
        status: 'succeeded',
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      group: ['userId'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit
    });
  }
}

FinancialTransaction.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who made the transaction'
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Orders',
      key: 'id'
    },
    comment: 'Associated order if applicable'
  },
  cartId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ShoppingCarts',
      key: 'id'
    },
    comment: 'Shopping cart used for this transaction'
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    comment: 'Stripe Payment Intent ID for tracking'
  },
  stripeChargeId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Stripe Charge ID for completed payments'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Transaction amount in USD'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
    comment: 'Transaction currency code'
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'processing',
      'succeeded',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded'
    ),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Current transaction status'
  },
  paymentMethod: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Payment method used (card, digital_wallet, etc.)'
  },
  paymentMethodDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON string with payment method details'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Transaction description'
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON string with additional transaction metadata'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Total refunded amount'
  },
  feeAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Processing fees'
  },
  netAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Net amount after fees'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the transaction was processed'
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for transaction failure'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address for fraud detection'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent for fraud detection'
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
  modelName: 'FinancialTransaction',
  tableName: 'financial_transactions',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
      name: 'financial_transactions_user_idx'
    },
    {
      fields: ['status'],
      name: 'financial_transactions_status_idx'
    },
    {
      fields: ['createdAt'],
      name: 'financial_transactions_created_idx'
    },
    {
      fields: ['stripePaymentIntentId'],
      name: 'financial_transactions_stripe_pi_idx'
    },
    {
      fields: ['amount'],
      name: 'financial_transactions_amount_idx'
    },
    {
      fields: ['paymentMethod'],
      name: 'financial_transactions_method_idx'
    }
  ],
  hooks: {
    beforeCreate: (transaction, options) => {
      // Calculate net amount if not provided
      if (!transaction.netAmount && transaction.amount) {
        transaction.netAmount = transaction.amount - (transaction.feeAmount || 0);
      }
      
      // Set processed timestamp for succeeded transactions
      if (transaction.status === 'succeeded' && !transaction.processedAt) {
        transaction.processedAt = new Date();
      }
    },
    beforeUpdate: (transaction, options) => {
      // Update net amount if amount or fees change
      if (transaction.changed('amount') || transaction.changed('feeAmount')) {
        transaction.netAmount = transaction.amount - (transaction.feeAmount || 0);
      }
      
      // Set processed timestamp when status changes to succeeded
      if (transaction.changed('status') && transaction.status === 'succeeded' && !transaction.processedAt) {
        transaction.processedAt = new Date();
      }
    }
  }
});

export default FinancialTransaction;