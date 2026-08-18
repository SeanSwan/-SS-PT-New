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

/**
 * Consent gate for routes where the DATA SUBJECT is not the requester.
 *
 * A trainer uploading a client's session audio discloses the *client's* voice
 * and injury history, so the client's consent is what governs — not the
 * trainer's. `resolveSubjectId` extracts that subject from the request, which
 * means this gate must be mounted AFTER any body parser (multer) that
 * populates it.
 *
 * `failOpenWhenMissing` exists because consent profiles are created only by the
 * consent flow and no backfill exists: a client who was never offered the flow
 * has no row at all. Failing closed on that would block every upload for every
 * pre-existing client. Fail-open therefore applies ONLY to the absent-row case
 * — an explicit `aiEnabled: false` or a withdrawal always blocks, which is the
 * case that carries legal weight. Same posture the chat path already takes.
 *
 * `skipWhenUnresolved` defers the "no usable subject id" case to the handler's
 * own validation, for routes that already reject it with a different error
 * envelope. It is safe only because such a handler rejects before any egress —
 * do not set it on a route that would proceed without a subject.
 *
 * @param {Function} getAiPrivacyProfile - Getter: () => AiPrivacyProfile model
 * @param {Function} resolveSubjectId - (req) => subject user id
 * @param {{ failOpenWhenMissing?: boolean, skipWhenUnresolved?: boolean, label?: string }} [options]
 */
export function requireSubjectAiConsent(getAiPrivacyProfile, resolveSubjectId, options = {}) {
  const { failOpenWhenMissing = false, skipWhenUnresolved = false, label = 'subject' } = options;

  return async (req, res, next) => {
    try {
      const subjectId = Number(resolveSubjectId(req));

      if (!Number.isInteger(subjectId) || subjectId <= 0) {
        if (skipWhenUnresolved) return next();
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid subject user id for the AI consent check.',
          code: 'AI_CONSENT_SUBJECT_UNRESOLVED',
        });
      }

      const AiPrivacyProfile = getAiPrivacyProfile();
      const profile = await AiPrivacyProfile.findOne({ where: { userId: subjectId } });

      if (!profile) {
        if (failOpenWhenMissing) {
          logger.info('[AI Consent] No profile for subject; proceeding (fail-open)', {
            label,
            subjectId,
          });
          return next();
        }
        return res.status(403).json({
          success: false,
          message: 'AI consent has not been granted for this account.',
          code: 'AI_CONSENT_MISSING',
        });
      }

      if (!profile.aiEnabled) {
        return res.status(403).json({
          success: false,
          message: 'AI features are disabled for this account. AI processing of their data is not permitted.',
          code: 'AI_CONSENT_DISABLED',
        });
      }

      if (profile.withdrawnAt) {
        return res.status(403).json({
          success: false,
          message: 'AI consent has been withdrawn for this account. AI processing of their data is not permitted.',
          code: 'AI_CONSENT_WITHDRAWN',
        });
      }

      req.aiConsentProfile = profile;
      next();
    } catch (error) {
      logger.error('[AI Consent] Error checking subject consent:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying AI consent status.',
      });
    }
  };
}
