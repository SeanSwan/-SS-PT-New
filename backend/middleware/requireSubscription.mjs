/**
 * ============================================================================
 * FILE: requireSubscription.mjs
 * PURPOSE: AI access middleware — NO hard caps, anomaly detection only
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-05
 * ============================================================================
 *
 * PHILOSOPHY: AI is free for everyone. Tiers gate FEATURES, not AI access.
 * This middleware tracks usage for monitoring and detects bot/abuse patterns.
 * Normal users are NEVER blocked. Only automated scripts/bots get throttled.
 *
 * HOW IT FITS IN THE APP: Inserted into AI route middleware chain:
 *   protect → aiKillSwitch → requireSubscription('pro') → aiRateLimiter → controller
 *
 * WHAT CHANGED (2026-04-05): Removed all monthly message caps. Added anomaly
 * detection (100+ req/hour, 500+ req/day flags Sean). Only 50+ req/min
 * auto-throttles (definitely a bot). Sean decides everything else via admin dashboard.
 */

import logger from '../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Anomaly Detection Thresholds
// PURPOSE: Catch bots/scripts, NOT normal users
// These are intentionally HIGH — no normal human hits them
// ─────────────────────────────────────────────────────────────
const ANOMALY = {
  perMinuteHardLimit: 50,       // 50 req/min = definitely a bot → auto-cooldown
  perHourAlertThreshold: 100,   // 100 req/hour = flag for Sean to review
  perDayAlertThreshold: 500,    // 500 req/day = red flag for Sean
  cooldownMs: 15 * 60 * 1000,  // 15-minute cooldown for bots
};

// In-memory rate tracking (resets on server restart — fine for anomaly detection)
const userRateMap = new Map(); // userId → { minuteCount, minuteStart, hourCount, hourStart, dayCount, dayStart, cooldownUntil }

function trackAndCheckAnomaly(userId) {
  const now = Date.now();
  let entry = userRateMap.get(userId);

  if (!entry) {
    entry = { minuteCount: 0, minuteStart: now, hourCount: 0, hourStart: now, dayCount: 0, dayStart: now, cooldownUntil: null };
    userRateMap.set(userId, entry);
  }

  // Cooldown check
  if (entry.cooldownUntil && now < entry.cooldownUntil) {
    return { blocked: true, reason: 'cooldown', retryAfter: Math.ceil((entry.cooldownUntil - now) / 1000) };
  }

  // Reset windows
  if (now - entry.minuteStart > 60_000) { entry.minuteCount = 0; entry.minuteStart = now; }
  if (now - entry.hourStart > 3_600_000) { entry.hourCount = 0; entry.hourStart = now; }
  if (now - entry.dayStart > 86_400_000) { entry.dayCount = 0; entry.dayStart = now; }

  entry.minuteCount++;
  entry.hourCount++;
  entry.dayCount++;

  // Auto-throttle: 50+ per minute = definitely automated
  if (entry.minuteCount > ANOMALY.perMinuteHardLimit) {
    entry.cooldownUntil = now + ANOMALY.cooldownMs;
    logger.warn(`[Anomaly] User ${userId} hit ${entry.minuteCount} req/min — auto-cooldown 15min (likely bot)`);
    return { blocked: true, reason: 'rate_exceeded', retryAfter: ANOMALY.cooldownMs / 1000 };
  }

  // Flag for Sean (log warning, DON'T block)
  if (entry.hourCount === ANOMALY.perHourAlertThreshold) {
    logger.warn(`[Anomaly] User ${userId} hit ${entry.hourCount} req/hour — flagging for admin review`);
  }
  if (entry.dayCount === ANOMALY.perDayAlertThreshold) {
    logger.warn(`[Anomaly] User ${userId} hit ${entry.dayCount} req/day — RED FLAG for admin review`);
  }

  return { blocked: false, hourCount: entry.hourCount, dayCount: entry.dayCount };
}

/**
 * Middleware factory for subscription-aware AI routes.
 * NO hard caps — tracks usage for monitoring and detects anomalies.
 *
 * @param {string} minimumTier - For FEATURE gating (not AI caps): 'pro' or 'elite'
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
      // Admins and trainers always have full AI access — no tracking
      // ─────────────────────────────────────────────────────────────
      if (user.role === 'admin' || user.role === 'trainer') {
        return next();
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Anomaly Detection (bot protection only)
      // Normal users NEVER hit these thresholds
      // ─────────────────────────────────────────────────────────────
      const anomaly = trackAndCheckAnomaly(user.id);
      if (anomaly.blocked) {
        return res.status(429).json({
          success: false,
          message: 'Unusual activity detected. Please try again shortly.',
          code: 'AI_ANOMALY_DETECTED',
          retryAfter: anomaly.retryAfter,
        });
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Subscription Lookup
      // Find or auto-create subscription record
      // ─────────────────────────────────────────────────────────────
      let Subscription;
      try {
        const mod = await import('../models/Subscription.mjs');
        Subscription = mod.default;
      } catch (err) {
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
      // SECTION: Auto-revert cancelled subscriptions past billing period
      // ─────────────────────────────────────────────────────────────
      if (subscription.status === 'cancelled' && subscription.currentPeriodEnd) {
        if (new Date() >= new Date(subscription.currentPeriodEnd)) {
          subscription.tier = 'free';
          subscription.status = 'active';
          subscription.amount = null;
          await subscription.save();
          logger.info(`[Subscription] Reverted cancelled subscription to free for user ${user.id}`);
        }
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Track Usage (for admin dashboard, NOT for blocking)
      // ─────────────────────────────────────────────────────────────
      try {
        const UserModel = (await import('../models/User.mjs')).default;
        const userData = await UserModel.findByPk(user.id);

        if (userData) {
          const now = new Date();
          const resetDate = userData.aiUsageResetDate ? new Date(userData.aiUsageResetDate) : null;

          // Monthly reset
          if (!resetDate || now >= resetDate) {
            const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            await userData.update({
              aiMessagesUsedThisMonth: 0,
              aiGenerationsUsedThisMonth: 0,
              aiUsageResetDate: nextReset,
            });
          }

          // Increment usage counter (for monitoring only)
          if (feature === 'chat') await userData.increment('aiMessagesUsedThisMonth');
          if (feature === 'generation') await userData.increment('aiGenerationsUsedThisMonth');
        }
      } catch (trackErr) {
        // Usage tracking failure should NEVER block the user
        logger.warn('[Subscription] Usage tracking error (non-blocking):', trackErr.message);
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION: Attach subscription to request and allow access
      // AI is free for everyone — just attach tier info for model routing
      // ─────────────────────────────────────────────────────────────
      req.subscription = subscription;
      req.subscriptionAccess = subscription.isInTrial?.() ? 'trial'
        : subscription.tier === 'free' ? 'free'
        : 'paid';

      // Past due/cancelled but within billing period — still allow access
      if (subscription.status === 'past_due') {
        logger.warn(`[Subscription] User ${user.id} has past_due subscription — allowing access, Stripe will handle`);
      }

      return next();

    } catch (error) {
      logger.error('[Subscription] Error checking subscription:', error);
      // Fail open — NEVER block users if subscription check errors
      return next();
    }
  };
}

/**
 * Lightweight middleware to attach subscription info to request
 * without blocking. Used for frontend to show tier badges and features.
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
