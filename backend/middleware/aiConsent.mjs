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
      const requesterRole = String(req.user?.role || '').toLowerCase();
      const requesterId = req.user?.id;
      const rawUserId = req.body?.userId;

      // WHOSE consent record vouches for this request is decided by ROLE, never
      // by the request body. Three reviewers (ox-alpha, GLM 5.3, Kimi K3) found
      // the previous shape independently: body.userId was honoured for ANY role
      // whenever it parsed as a number, and the "clients target self" clamp only
      // applied when the body was silent. A client with withdrawn consent could
      // pass the gate by naming any consenting user — and aiWorkoutController
      // reads req.body.userId as the generation target, so the same request
      // could fetch another person's injuries and measurements.
      //
      // The old check also compared against the literal 'client', while the
      // Users.role enum carries BOTH 'client' and 'user' (default 'user') — the
      // same set authMiddleware treats as self-access. Anyone with role 'user'
      // skipped the clamp entirely.
      const isClientClass = requesterRole === 'client' || requesterRole === 'user';
      const bodyTarget = rawUserId && Number.isFinite(Number(rawUserId)) ? Number(rawUserId) : null;

      if (isClientClass && bodyTarget && Number(bodyTarget) !== Number(requesterId)) {
        logger.warn('[AI Consent] client attempted to target another user', {
          requesterId, attemptedTarget: bodyTarget, path: req.path,
        });
        return res.status(403).json({
          success: false,
          message: 'You can only use Swan Coach for your own profile.',
          code: 'AI_CONSENT_TARGET_FORBIDDEN',
        });
      }

      const targetUserId = isClientClass
        ? Number(requesterId)   // clients are hard-clamped to self, always
        : bodyTarget;           // staff may name a target; ownership is checked downstream

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
