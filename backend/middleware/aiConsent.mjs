/**
 * AI Consent & Kill Switch Middleware
 * ====================================
 * Guards AI routes with:
 *   1. Kill switch (env-based): AI_WORKOUT_GENERATION_ENABLED
 *   2. Per-user consent check via AiPrivacyProfile
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */
import logger from '../utils/logger.mjs';
import {
  CURRENT_CONSENT_VERSION,
  isConsentVersionCurrent,
} from '../config/consentVersion.mjs';

/**
 * Kill switch middleware.
 * Blocks all AI workout generation when AI_WORKOUT_GENERATION_ENABLED === 'false'.
 * Defaults to enabled if env var is not set (backward-compatible).
 */
export function aiKillSwitch(req, res, next) {
  const enabled = process.env.AI_WORKOUT_GENERATION_ENABLED;

  // Only disabled when explicitly set to 'false'
  if (enabled === 'false') {
    logger.info('[AI Kill Switch] AI workout generation is disabled via env var');
    return res.status(503).json({
      success: false,
      message: 'AI workout generation is temporarily disabled.',
      code: 'AI_FEATURE_DISABLED',
    });
  }

  next();
}

/**
 * Per-user AI consent middleware.
 * Requires an active AiPrivacyProfile with aiEnabled=true and no withdrawal.
 *
 * @param {Function} getAiPrivacyProfile - Getter function: () => AiPrivacyProfile model
 */
export function requireAiConsent(getAiPrivacyProfile) {
  return async (req, res, next) => {
    try {
      const userId = req.body?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      // Resolve target user (same logic as controller — clients target self)
      const requesterRole = req.user?.role;
      const requesterId = req.user?.id;
      const rawUserId = req.body?.userId;
      const targetUserId =
        rawUserId && Number.isFinite(Number(rawUserId))
          ? Number(rawUserId)
          : requesterRole === 'client'
            ? requesterId
            : null;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid userId',
        });
      }

      const AiPrivacyProfile = getAiPrivacyProfile();
      const profile = await AiPrivacyProfile.findOne({
        where: { userId: targetUserId },
      });

      if (!profile) {
        return res.status(403).json({
          success: false,
          message: 'AI consent has not been granted. Please complete the AI consent flow before using AI-powered features.',
          code: 'AI_CONSENT_MISSING',
        });
      }

      if (!profile.aiEnabled) {
        return res.status(403).json({
          success: false,
          message: 'AI features are currently disabled for this account.',
          code: 'AI_CONSENT_DISABLED',
        });
      }

      if (profile.withdrawnAt) {
        return res.status(403).json({
          success: false,
          message: 'AI consent has been withdrawn. Please re-consent to use AI-powered features.',
          code: 'AI_CONSENT_WITHDRAWN',
        });
      }

      // Owner decision Q5: a grant captured under a superseded disclosure does
      // not authorize processing. v1.0 told users their identity was "hidden"
      // and that they stayed "anonymous", while a STABLE pseudonym travelled
      // with their training, injury and medical-condition data. That
      // description was materially inaccurate, so the grant it produced cannot
      // stand in for informed consent.
      //
      // Until this landed, the gate checked aiEnabled and withdrawnAt and no
      // version, so every legacy grant kept working and the corrected
      // disclosure was cosmetic for exactly the population it was written for
      // (ox-alpha and GLM 5.3, post-ship panel). A null/missing version counts
      // as stale — those records are the most likely to predate the fix.
      if (!isConsentVersionCurrent(profile.consentVersion)) {
        return res.status(403).json({
          success: false,
          message: 'Our description of how Swan Coach uses your data has been corrected. '
            + 'Please review the updated disclosure and confirm to continue.',
          code: 'AI_CONSENT_STALE_VERSION',
          storedVersion: profile.consentVersion ?? null,
          requiredVersion: CURRENT_CONSENT_VERSION,
        });
      }

      // Attach profile to request for downstream use
      req.aiConsentProfile = profile;
      next();
    } catch (error) {
      logger.error('[AI Consent] Error checking consent:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying AI consent status.',
      });
    }
  };
}
