/**
 * ============================================================================
 * FILE: requireSubscription.mjs
 * PURPOSE: Middleware to gate AI features behind subscription tiers
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Checks if the authenticated user has the required
 * subscription tier to access AI features. Handles free trial logic,
 * monthly usage caps for free tier, and auto-creates trial subscriptions.
 *
 * HOW IT FITS IN THE APP: Inserted into AI route middleware chain:
 *   protect → aiKillSwitch → requireSubscription('pro') → aiRateLimiter → controller
 *
 * KEY DECISIONS: Admins and trainers always pass (they manage the platform).
 * Free tier gets 3 AI chats + 1 workout generation per month. Trial users
 * get full access for 30 days. Subscription auto-creates on first AI access.
 */

import logger from '../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Free Tier Limits
// PURPOSE: Monthly caps for non-paying users
// WHY: Generous enough to demonstrate value, limited enough to drive conversion
// ─────────────────────────────────────────────────────────────
const TIER_LIMITS = {
  free:  { aiMessagesPerMonth: 3,  aiGenerationsPerMonth: 1 },
  elite: { aiMessagesPerMonth: Infinity, aiGenerationsPerMonth: Infinity },
};

// Pro tier limits scale by donation amount — benevolent model
// $0 donation still gets AI access but very limited to prevent abuse
const PRO_DONATION_TIERS = [
  { minAmount: 0,    maxAmount: 0.99,  aiMessagesPerMonth: 10, aiGenerationsPerMonth: 2 },
  { minAmount: 1,    maxAmount: 4.99,  aiMessagesPerMonth: 15, aiGenerationsPerMonth: 3 },
  { minAmount: 5,    maxAmount: 9.98,  aiMessagesPerMonth: 25, aiGenerationsPerMonth: 4 },
  { minAmount: 9.99, maxAmount: 9999,  aiMessagesPerMonth: 40, aiGenerationsPerMonth: 10 },
];

/** Get Pro tier limits based on donation amount */
function getProLimits(donationAmount) {
  const amount = parseFloat(donationAmount) || 0;
  const tier = PRO_DONATION_TIERS.find(t => amount >= t.minAmount && amount <= t.maxAmount);
  return tier || PRO_DONATION_TIERS[0]; // Default to lowest if no match
}

/**
 * Middleware factory for subscription-gated routes.
 *
 * @param {string} minimumTier - Minimum tier required: 'pro' or 'elite'
 * @param {object} options - Additional options
 * @param {string} options.feature - Feature name for usage tracking ('chat' | 'generation')
 * @returns {Function} Express middleware
 */
export function requireSubscription(minimumTier = 'pro', options = {}) {
  const { feature = 'chat' } = options;

  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Role Bypass
      // PURPOSE: Admins and trainers always have full AI access
      // WHY: They manage the platform and need AI for client work
      // ─────────────────────────────────────────────────────────────
      if (user.role === 'admin' || user.role === 'trainer') {
        return next();
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Subscription Lookup
      // PURPOSE: Find or create the user's subscription record
      // ─────────────────────────────────────────────────────────────
      let Subscription;
      try {
        const mod = await import('../models/Subscription.mjs');
        Subscription = mod.default;
      } catch (err) {
        // Table may not exist yet — allow access gracefully
        logger.warn('[Subscription] Subscription model not available, allowing access:', err.message);
        return next();
      }

      let subscription = await Subscription.findOne({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
      });

      // Auto-create trial subscription on first AI access
      if (!subscription) {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + 30);

        subscription = await Subscription.create({
          userId: user.id,
          tier: 'free',
          status: 'trial',
          trialStartDate: now,
          trialEndDate: trialEnd,
        });

        logger.info(`[Subscription] Auto-created 30-day trial for user ${user.id}`);
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Trial Check
      // PURPOSE: Users in active trial get full access regardless of tier
      // ─────────────────────────────────────────────────────────────
      if (subscription.isInTrial()) {
        req.subscription = subscription;
        req.subscriptionAccess = 'trial';
        return next();
      }

      // If trial expired and still on free tier, update status
      if (subscription.status === 'trial' && subscription.isTrialExpired()) {
        subscription.status = 'active';
        await subscription.save();
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Paid Tier Check
      // PURPOSE: Pro and Elite tiers get full access to AI features
      // ─────────────────────────────────────────────────────────────
      // Support both old (supporter/premium) and new (pro/elite) tier names
      // during migration transition period
      const tierHierarchy = { free: 0, supporter: 1, pro: 1, premium: 2, elite: 2 };
      const userTierLevel = tierHierarchy[subscription.tier] || 0;
      const requiredTierLevel = tierHierarchy[minimumTier] || 1;

      // ─────────────────────────────────────────────────────────────
      // SECTION: Usage-Limited Access Check
      // PURPOSE: All tiers (free, pro, elite) have monthly caps
      // WHY: Pro has 30 msgs/month, Elite is unlimited, Free gets a taste
      // ─────────────────────────────────────────────────────────────
      if (userTierLevel >= requiredTierLevel && subscription.status === 'active') {
        const tier = subscription.tier;

        // Determine limits: Elite = unlimited, Pro = donation-scaled
        const limits = tier === 'elite'
          ? TIER_LIMITS.elite
          : tier === 'pro'
            ? getProLimits(subscription.amount)
            : TIER_LIMITS.free;

        // Elite tier — unlimited, skip usage tracking
        if (limits.aiMessagesPerMonth === Infinity) {
          req.subscription = subscription;
          req.subscriptionAccess = 'paid';
          return next();
        }

        // Pro tier — enforce monthly limits
        const now = new Date();
        const UserModel = (await import('../models/User.mjs')).default;
        const userData = await UserModel.findByPk(user.id);

        if (userData) {
          const resetDate = userData.aiUsageResetDate ? new Date(userData.aiUsageResetDate) : null;
          if (!resetDate || now >= resetDate) {
            const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            await userData.update({
              aiMessagesUsedThisMonth: 0,
              aiGenerationsUsedThisMonth: 0,
              aiUsageResetDate: nextReset,
            });
          }

          const messagesUsed = userData.aiMessagesUsedThisMonth || 0;
          const generationsUsed = userData.aiGenerationsUsedThisMonth || 0;

          if (feature === 'chat' && messagesUsed < limits.aiMessagesPerMonth) {
            await userData.increment('aiMessagesUsedThisMonth');
            req.subscription = subscription;
            req.subscriptionAccess = 'paid';
            req.aiUsageRemaining = {
              messages: limits.aiMessagesPerMonth - messagesUsed - 1,
              generations: limits.aiGenerationsPerMonth - generationsUsed,
            };
            return next();
          }

          if (feature === 'generation' && generationsUsed < limits.aiGenerationsPerMonth) {
            await userData.increment('aiGenerationsUsedThisMonth');
            req.subscription = subscription;
            req.subscriptionAccess = 'paid';
            req.aiUsageRemaining = {
              messages: limits.aiMessagesPerMonth - messagesUsed,
              generations: limits.aiGenerationsPerMonth - generationsUsed - 1,
            };
            return next();
          }
        }

        // Pro tier limit reached — upsell to Elite
        return res.status(402).json({
          success: false,
          message: `You've reached your ${tier === 'pro' ? 'Swan Pro' : 'monthly'} AI limit. Upgrade to Crystalline Swan ($24.99/mo) for unlimited AI!`,
          code: 'AI_LIMIT_REACHED',
          tier,
          limits,
          upgradeUrl: '/store/subscriptions',
        });
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Free Tier Usage Check
      // PURPOSE: Give free users a taste of AI (3 msgs, 1 generation/month)
      // ─────────────────────────────────────────────────────────────
      if (subscription.tier === 'free') {
        const limits = TIER_LIMITS.free;
        const now = new Date();
        const UserModel = (await import('../models/User.mjs')).default;
        const userData = await UserModel.findByPk(user.id);

        if (userData) {
          const resetDate = userData.aiUsageResetDate ? new Date(userData.aiUsageResetDate) : null;
          if (!resetDate || now >= resetDate) {
            const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            await userData.update({
              aiMessagesUsedThisMonth: 0,
              aiGenerationsUsedThisMonth: 0,
              aiUsageResetDate: nextReset,
            });
          }

          const messagesUsed = userData.aiMessagesUsedThisMonth || 0;
          const generationsUsed = userData.aiGenerationsUsedThisMonth || 0;

          if (feature === 'chat' && messagesUsed < limits.aiMessagesPerMonth) {
            await userData.increment('aiMessagesUsedThisMonth');
            req.subscription = subscription;
            req.subscriptionAccess = 'free_limited';
            req.aiUsageRemaining = {
              messages: limits.aiMessagesPerMonth - messagesUsed - 1,
              generations: limits.aiGenerationsPerMonth - generationsUsed,
            };
            return next();
          }

          if (feature === 'generation' && generationsUsed < limits.aiGenerationsPerMonth) {
            await userData.increment('aiGenerationsUsedThisMonth');
            req.subscription = subscription;
            req.subscriptionAccess = 'free_limited';
            req.aiUsageRemaining = {
              messages: limits.aiMessagesPerMonth - messagesUsed,
              generations: limits.aiGenerationsPerMonth - generationsUsed - 1,
            };
            return next();
          }
        }

        // Free tier limit reached
        return res.status(402).json({
          success: false,
          message: 'You\'ve reached your free tier AI limit for this month. Upgrade to Swan Pro ($9.99/mo) for 30 AI messages!',
          code: 'AI_SUBSCRIPTION_REQUIRED',
          tier: 'free',
          limits,
          trialExpired: subscription.isTrialExpired(),
          trialDaysRemaining: subscription.trialDaysRemaining(),
          upgradeUrl: '/store/subscriptions',
        });
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Subscription Expired / Past Due
      // ─────────────────────────────────────────────────────────────
      return res.status(402).json({
        success: false,
        message: subscription.status === 'past_due'
          ? 'Your subscription payment is past due. Please update your payment method.'
          : subscription.status === 'cancelled'
            ? 'Your subscription has been cancelled. Resubscribe to regain access.'
            : 'A subscription is required for this feature.',
        code: 'AI_SUBSCRIPTION_REQUIRED',
        tier: subscription.tier,
        status: subscription.status,
        upgradeUrl: '/store/subscriptions',
      });

    } catch (error) {
      logger.error('[Subscription] Error checking subscription:', error);
      // Fail open — don't block users if subscription check errors
      return next();
    }
  };
}

/**
 * Lightweight middleware to attach subscription info to request
 * without blocking. Used for frontend to show usage counters.
 */
export function attachSubscriptionInfo() {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role === 'admin' || req.user.role === 'trainer') {
        return next();
      }

      const Subscription = (await import('../models/Subscription.mjs')).default;
      const subscription = await Subscription.findOne({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']],
      });

      if (subscription) {
        req.subscription = subscription;
      }

      next();
    } catch {
      next();
    }
  };
}
