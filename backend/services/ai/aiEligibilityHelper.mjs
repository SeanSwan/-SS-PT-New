/**
 * AI Eligibility Helper — Phase 5C-D
 * ====================================
 * Pure eligibility decision function for AI feature access.
 * Extracted from inline consent checks in aiWorkoutController / longHorizonController.
 *
 * Decision matrix (role-aware):
 *   admin  + consent → allow
 *   admin  + no consent → allow_with_override_warning (audited)
 *   trainer + consent → allow
 *   trainer + no consent → deny
 *   client + consent → allow
 *   client + no consent → deny
 *
 * This helper does NOT validate overrideReason or other request-body fields.
 * Controllers are responsible for enforcing overrideReason when
 * allow_with_override_warning is returned.
 *
 * 5W-E Swap Note:
 *   When waiver tables exist, this function gains a second consent source
 *   lookup (WaiverRecord with aiConsentAccepted=true). The function
 *   signature and return shape stay identical.
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import logger from '../../utils/logger.mjs';

/**
 * Check AI eligibility for a target user given the actor's role.
 *
 * @param {Object} params
 * @param {number} params.targetUserId - The client user being served
 * @param {number} params.actorUserId - The requester (trainer/admin/client)
 * @param {string} params.actorRole - 'admin' | 'trainer' | 'client'
 * @param {Object} params.models - Result of getAllModels()
 * @returns {Promise<{
 *   decision: 'allow' | 'allow_with_override_warning' | 'deny',
 *   reasonCode: string | null,
 *   consentSource: 'ai_privacy_profile' | 'none',
 *   requiresAuditOverride: boolean,
 *   warnings: string[]
 * }>}
 */
export async function checkAiEligibility({ targetUserId, actorUserId, actorRole, models }) {
  const { AiPrivacyProfile } = models || {};

  // If AiPrivacyProfile model is not registered, fall back based on role
  if (!AiPrivacyProfile) {
    logger.debug('[AiEligibility] AiPrivacyProfile model not available');
    if (actorRole === 'admin') {
      return {
        decision: 'allow_with_override_warning',
        reasonCode: null,
        consentSource: 'none',
        requiresAuditOverride: true,
        warnings: ['AI_CONSENT_OVERRIDE_USED'],
      };
    }
    return {
      decision: 'deny',
      reasonCode: 'AI_CONSENT_MISSING',
      consentSource: 'none',
      requiresAuditOverride: false,
      warnings: [],
    };
  }

  // Look up consent profile
  const consentProfile = await AiPrivacyProfile.findOne({
    where: { userId: targetUserId },
  });

  // ── No consent profile found ─────────────────────────────
  if (!consentProfile) {
    if (actorRole === 'admin') {
      return {
        decision: 'allow_with_override_warning',
        reasonCode: null,
        consentSource: 'none',
        requiresAuditOverride: true,
        warnings: ['AI_CONSENT_OVERRIDE_USED'],
      };
    }
    return {
      decision: 'deny',
      reasonCode: 'AI_CONSENT_MISSING',
      consentSource: 'none',
      requiresAuditOverride: false,
      warnings: [],
    };
  }

  // ── Consent disabled ──────────────────────────────────────
  if (!consentProfile.aiEnabled) {
    if (actorRole === 'admin') {
      return {
        decision: 'allow_with_override_warning',
        reasonCode: null,
        consentSource: 'none',
        requiresAuditOverride: true,
        warnings: ['AI_CONSENT_OVERRIDE_USED'],
      };
    }
    return {
      decision: 'deny',
      reasonCode: 'AI_CONSENT_DISABLED',
      consentSource: 'none',
      requiresAuditOverride: false,
      warnings: [],
    };
  }

  // ── Consent withdrawn ─────────────────────────────────────
  if (consentProfile.withdrawnAt) {
    if (actorRole === 'admin') {
      return {
        decision: 'allow_with_override_warning',
        reasonCode: null,
        consentSource: 'none',
        requiresAuditOverride: true,
        warnings: ['AI_CONSENT_OVERRIDE_USED'],
      };
    }
    return {
      decision: 'deny',
      reasonCode: 'AI_CONSENT_WITHDRAWN',
      consentSource: 'none',
      requiresAuditOverride: false,
      warnings: [],
    };
  }

  // ── Valid consent ─────────────────────────────────────────
  return {
    decision: 'allow',
    reasonCode: null,
    consentSource: 'ai_privacy_profile',
    requiresAuditOverride: false,
    warnings: [],
  };
}
