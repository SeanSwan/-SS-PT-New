/**
 * ============================================================================
 * FILE: modelSelector.mjs
 * PURPOSE: Tier-based Gemini model routing — cheaper model for free users
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-05
 * ============================================================================
 *
 * Routes AI requests to appropriate Gemini model based on subscription tier:
 *   - Free/low-Guardian → Flash-Lite (cheapest, 1000 free req/day)
 *   - Guardian $5+ / Elite → Flash 2.5 (better quality)
 *   - Admin/Trainers → Best available (env override or Flash 2.5)
 *
 * Village fix: Uses Number.isFinite() to guard against Sequelize DECIMAL
 * strings returning NaN from parseFloat.
 */

const DEFAULT_ADMIN_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Resolve the Gemini model to use based on user role and subscription tier.
 *
 * @param {object|null|undefined} subscription - User's subscription record (from req.subscription)
 * @param {object|null|undefined} user - User record (from req.user)
 * @returns {string} Gemini model identifier
 */
export function resolveModelForTier(subscription, user) {
  // Admin and trainers always get the best model
  if (user?.role === 'admin' || user?.role === 'trainer') {
    return DEFAULT_ADMIN_MODEL;
  }

  const tier = subscription?.tier ?? 'free';

  // Elite tier — always Flash 2.5
  if (tier === 'elite') return 'gemini-2.5-flash';

  // Guardian (pro) tier — Flash 2.5 for $5+ donors, Flash-Lite for lower
  if (tier === 'pro') {
    // Sequelize DECIMAL columns can serialize as strings — coerce safely
    const raw = Number(subscription?.amount ?? 0);
    const amount = Number.isFinite(raw) ? raw : 0;
    if (amount >= 5) return 'gemini-2.5-flash';
  }

  // Free tier and low-donation Guardian → cheapest model
  return 'gemini-2.0-flash-lite';
}
