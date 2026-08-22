/**
 * ============================================================================
 * FILE: requireTier.mjs
 * PURPOSE: Feature-gating middleware — returns 402 when tier is insufficient
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Checks the authenticated user's subscription tier against a minimum
 * requirement and returns 402 Payment Required if insufficient. The
 * frontend's 402 interceptor (api.service.ts) catches this and shows
 * the FrostedPaywall via PaywallContext.
 *
 * HOW IT DIFFERS FROM requireSubscription.mjs:
 *   requireSubscription = AI access (fail-open, anomaly detection only)
 *   requireTier         = Feature gating (returns 402, frontend shows paywall)
 *
 * FEATURE FLAG: TIER_GATING_ENABLED (env var)
 *   - If false, 0, or off: middleware passes through (emergency kill-switch)
 *   - Otherwise: enforces tier checks and returns 402
 *   - Admin/trainer roles ALWAYS bypass regardless of flag
 *
 * USAGE:
 *   import { requireTier } from '../middleware/requireTier.mjs';
 *   router.get('/analytics/full', protect, requireTier('pro'), controller);
 *   router.post('/trainer/message', protect, requireTier('elite', 'trainer.messaging'), controller);
 */

import { meetsMinimumTier, tierDisplayName, featureLabel, FEATURE_GATES } from '../config/tierCatalog.mjs';
import logger from '../utils/logger.mjs';

const TRIAL_EFFECTIVE_TIER = 'elite';

const isActiveTrialSubscription = (subscription) => {
  if (!subscription || subscription.status !== 'trial' || !subscription.trialEndDate) return false;
  return new Date() < new Date(subscription.trialEndDate);
};

/**
 * Resolve the user's CURRENT entitlement from the Subscription table (server truth).
 * Caches result on req._resolvedEntitlement so multiple requireTier calls on the
 * same request don't repeat the DB query.
 *
 * A live trial intentionally receives an elite-equivalent effective tier because
 * the Ascension copy promises a 30-day trial of premium features. The actual tier
 * is still returned in 402 responses for transparency and debugging.
 */
export async function resolveCurrentEntitlement(req) {
  if (req._resolvedEntitlement) return req._resolvedEntitlement;

  let actualTier = req.user?.subscriptionTier || 'free';
  let status = null;
  let isTrial = false;

  try {
    const { default: Subscription } = await import('../models/Subscription.mjs');
    const sub = await Subscription.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      attributes: ['tier', 'status', 'trialEndDate'],
    });

    if (sub) {
      actualTier = sub.tier || actualTier;
      status = sub.status || null;
      isTrial = isActiveTrialSubscription(sub);
    }
  } catch (error) {
    // Fallback to JWT claim on DB error — never 500 a feature gate because the
    // entitlement read path had a transient problem. The gate remains fail-closed
    // for insufficient tiers based on the best available claim.
    logger.warn('[TierGating] Failed to resolve subscription from DB; using request claim', {
      userId: req.user?.id,
      errorName: error instanceof Error ? error.name : typeof error,
    });
  }

  req._resolvedEntitlement = {
    actualTier,
    effectiveTier: isTrial ? TRIAL_EFFECTIVE_TIER : actualTier,
    status,
    isTrial,
  };

  return req._resolvedEntitlement;
}

/**
 * Check if tier gating is enabled via environment variable.
 * Defaults to enabled so premium promises are enforced by the backend. Set
 * TIER_GATING_ENABLED=false only as an emergency rollback switch.
 */
export function isGatingEnabled() {
  const flag = String(process.env.TIER_GATING_ENABLED || '').trim().toLowerCase();
  return !['false', '0', 'off', 'disabled'].includes(flag);
}

/**
 * Middleware factory for feature-level tier gating.
 *
 * @param {string} minimumTier - Required tier: 'free', 'pro', or 'elite'
 * @param {string} [featureKey] - Optional feature key for the 402 response (helps frontend show context)
 * @returns {Function} Express middleware
 */
export function requireTier(minimumTier, featureKey) {
  return async (req, res, next) => {
    // Admin and trainer roles always bypass tier gating
    if (req.user?.role === 'admin' || req.user?.role === 'trainer') {
      return next();
    }

    // If gating is disabled, pass through
    if (!isGatingEnabled()) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Resolve entitlement from DB (not JWT — JWT can be stale after upgrade)
    const entitlement = await resolveCurrentEntitlement(req);
    const { actualTier, effectiveTier, isTrial } = entitlement;

    if (meetsMinimumTier(effectiveTier, minimumTier)) {
      return next();
    }

    // Tier insufficient — return 402 Payment Required
    const requiredName = tierDisplayName(minimumTier);
    const currentName = tierDisplayName(actualTier);

    logger.info(
      `[TierGating] User ${req.user.id} blocked: has ${actualTier} (${currentName}), needs ${minimumTier} (${requiredName})` +
      (featureKey ? ` for feature ${featureKey}` : '')
    );

    return res.status(402).json({
      success: false,
      message: `This feature requires ${requiredName} or higher.`,
      code: 'TIER_REQUIRED',
      featureName: featureLabel(featureKey),
      feature: featureKey || null,
      requiredTier: minimumTier,
      currentTier: actualTier,
      effectiveTier,
      isTrial,
      upgradeUrl: '/ascension',
    });
  };
}

/**
 * Convenience: gate by feature key (looks up minimum tier from FEATURE_GATES).
 *
 * @param {string} featureKey - Key from FEATURE_GATES (e.g., 'trainer.messaging')
 * @returns {Function} Express middleware
 */
export function requireFeature(featureKey) {
  const minimumTier = FEATURE_GATES[featureKey] || 'free';
  return requireTier(minimumTier, featureKey);
}
