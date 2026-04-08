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
 *   - If false or unset: middleware passes through (all features open)
 *   - If true: enforces tier checks and returns 402
 *   - Admin/trainer roles ALWAYS bypass regardless of flag
 *
 * USAGE:
 *   import { requireTier } from '../middleware/requireTier.mjs';
 *   router.get('/analytics/full', protect, requireTier('pro'), controller);
 *   router.post('/trainer/message', protect, requireTier('elite', 'trainer.messaging'), controller);
 */

import { meetsMinimumTier, tierDisplayName, featureLabel, FEATURE_GATES } from '../config/tierCatalog.mjs';
import logger from '../utils/logger.mjs';

/**
 * Check if tier gating is enabled via environment variable.
 * Defaults to false (all features open) for safe rollout.
 */
function isGatingEnabled() {
  const flag = process.env.TIER_GATING_ENABLED;
  return flag === 'true' || flag === '1';
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

    // Get user's current tier from the user record
    const userTier = req.user.subscriptionTier || 'free';

    if (meetsMinimumTier(userTier, minimumTier)) {
      return next();
    }

    // Tier insufficient — return 402 Payment Required
    const requiredName = tierDisplayName(minimumTier);
    const currentName = tierDisplayName(userTier);

    logger.info(
      `[TierGating] User ${req.user.id} blocked: has ${userTier} (${currentName}), needs ${minimumTier} (${requiredName})` +
      (featureKey ? ` for feature ${featureKey}` : '')
    );

    return res.status(402).json({
      success: false,
      message: `This feature requires ${requiredName} or higher.`,
      code: 'TIER_REQUIRED',
      featureName: featureLabel(featureKey),
      feature: featureKey || null,
      requiredTier: minimumTier,
      currentTier: userTier,
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
