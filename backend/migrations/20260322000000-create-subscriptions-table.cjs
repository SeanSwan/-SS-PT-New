'use strict';

/**
 * Migration: Create subscriptions table + add subscription fields to users
 * Purpose: SwanStudios 3-tier subscription system (Free/Supporter/Premium)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create subscriptions table
    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public."subscriptions"') AS exists`
    );

    if (!tableExists[0][0]?.exists) {
      await queryInterface.createTable('subscriptions', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'FK to users table',
        },
        tier: {
          type: Sequelize.ENUM('free', 'supporter', 'premium'),
          allowNull: false,
          defaultValue: 'free',
          comment: 'Current subscription tier',
        },
        status: {
          type: Sequelize.ENUM('active', 'trial', 'past_due', 'cancelled', 'paused'),
          allowNull: false,
          defaultValue: 'trial',
          comment: 'Subscription lifecycle status',
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Actual amount paid (pay-what-you-want for Supporter)',
        },
        trialStartDate: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When 30-day AI trial started',
        },
        trialEndDate: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Trial expiry (trialStartDate + 30 days)',
        },
        currentPeriodStart: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Current billing period start',
        },
        currentPeriodEnd: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Current billing period end',
        },
        stripeSubscriptionId: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Stripe subscription ID for recurring billing',
        },
        stripeCustomerId: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Stripe customer ID',
        },
        cancelledAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When subscription was cancelled',
        },
        cancelReason: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'User-provided cancellation reason',
        },
        paymentMethod: {
          type: Sequelize.ENUM('stripe', 'zelle', 'venmo', 'manual'),
          allowNull: true,
          defaultValue: 'stripe',
          comment: 'Payment method for subscription',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });

      // Index for fast user subscription lookups
      await queryInterface.addIndex('subscriptions', ['userId'], {
        name: 'idx_subscriptions_userId',
      });
      await queryInterface.addIndex('subscriptions', ['stripeSubscriptionId'], {
        name: 'idx_subscriptions_stripeSubId',
        unique: true,
        where: { stripeSubscriptionId: { [Sequelize.Op.ne]: null } },
      });
    }

    // 2. Add subscription tracking fields to users table (safe — check before adding)
    const userColumns = await queryInterface.describeTable('users');

    if (!userColumns.subscriptionTier) {
      await queryInterface.addColumn('users', 'subscriptionTier', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'free',
        comment: 'Current tier: free, supporter, premium',
      });
    }

    if (!userColumns.aiMessagesUsedThisMonth) {
      await queryInterface.addColumn('users', 'aiMessagesUsedThisMonth', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'AI chat messages used in current month (free tier cap)',
      });
    }

    if (!userColumns.aiGenerationsUsedThisMonth) {
      await queryInterface.addColumn('users', 'aiGenerationsUsedThisMonth', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'AI workout generations used in current month (free tier cap)',
      });
    }

    if (!userColumns.aiUsageResetDate) {
      await queryInterface.addColumn('users', 'aiUsageResetDate', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Next date to reset monthly AI usage counters',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove user columns
    const userColumns = await queryInterface.describeTable('users');
    if (userColumns.subscriptionTier) await queryInterface.removeColumn('users', 'subscriptionTier');
    if (userColumns.aiMessagesUsedThisMonth) await queryInterface.removeColumn('users', 'aiMessagesUsedThisMonth');
    if (userColumns.aiGenerationsUsedThisMonth) await queryInterface.removeColumn('users', 'aiGenerationsUsedThisMonth');
    if (userColumns.aiUsageResetDate) await queryInterface.removeColumn('users', 'aiUsageResetDate');

    // Drop subscriptions table
    await queryInterface.dropTable('subscriptions');
  },
};
