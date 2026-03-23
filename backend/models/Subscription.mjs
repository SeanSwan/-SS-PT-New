/**
 * ============================================================================
 * FILE: Subscription.mjs
 * PURPOSE: SwanStudios 3-tier subscription model (Free/Supporter/Premium)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the Subscription Sequelize model that tracks
 * user subscription tier, billing status, trial periods, and payment method.
 *
 * HOW IT FITS IN THE APP: User → Subscription (1:1 active). Middleware checks
 * this model to gate AI features behind subscription tiers.
 *
 * KEY DECISIONS: Using ENUM strings for tier/status instead of separate tier
 * table — only 3 tiers, unlikely to change frequently. Pay-what-you-want
 * amount stored as DECIMAL for Supporter tier flexibility.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class Subscription extends Model {
  // ─────────────────────────────────────────────────────────────
  // SECTION: Instance Methods
  // ─────────────────────────────────────────────────────────────

  /** Check if subscription grants full AI access */
  hasFullAIAccess() {
    if (this.tier === 'free') return false;
    return this.status === 'active' || this.isInTrial();
  }

  /** Check if user is currently in their free trial period */
  isInTrial() {
    if (this.status !== 'trial') return false;
    if (!this.trialEndDate) return false;
    return new Date() < new Date(this.trialEndDate);
  }

  /** Check if trial has expired */
  isTrialExpired() {
    if (!this.trialEndDate) return false;
    return new Date() >= new Date(this.trialEndDate);
  }

  /** Days remaining in trial */
  trialDaysRemaining() {
    if (!this.trialEndDate) return 0;
    const diff = new Date(this.trialEndDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
}

Subscription.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK to users table',
    },
    tier: {
      type: DataTypes.ENUM('free', 'supporter', 'premium'),
      allowNull: false,
      defaultValue: 'free',
      comment: 'Subscription tier: free (limited AI), supporter (unlimited AI, pay-what-you-want), premium (+ human trainer)',
    },
    status: {
      type: DataTypes.ENUM('active', 'trial', 'past_due', 'cancelled', 'paused'),
      allowNull: false,
      defaultValue: 'trial',
      comment: 'Subscription lifecycle status',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Actual monthly amount (Supporter: pay-what-you-want min $1, Premium: fixed $10)',
    },
    trialStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When 30-day AI trial began',
    },
    trialEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Trial expiry date (trialStartDate + 30 days)',
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Current billing period start',
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Current billing period end',
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'Stripe subscription ID for recurring billing',
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stripe customer reference',
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.ENUM('stripe', 'zelle', 'venmo', 'manual'),
      allowNull: true,
      defaultValue: 'stripe',
    },
  },
  {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    timestamps: true,
  }
);

export default Subscription;
