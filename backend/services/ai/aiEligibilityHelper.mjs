/**
 * AI Eligibility Helper — Phase 5W-F
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
 * Consent sources (checked in order):
 *   1. AiPrivacyProfile (fast path — if valid, skip waiver check)
 *   2. WaiverRecord + version-aware eligibility (§7 5W-F)
 *
 * This helper does NOT validate overrideReason or other request-body fields.
 * Controllers are responsible for enforcing overrideReason when
 * allow_with_override_warning is returned.
 *
 * Phase 5W-F — Version-Aware Waiver Eligibility
 */
import logger from '../../utils/logger.mjs';
import { evaluateWaiverVersionEligibility } from '../waivers/waiverVersionEligibilityService.mjs';

/**
 * Check AI eligibility for a target user given the actor's role.
 *
 * @param {Object} params
 * @param {number} params.targetUserId - The client user being served
 * @param {number} params.actorUserId - The requester (trainer/admin/client)
 * @param {string} params.actorRole - 'admin' | 'trainer' | 'client'
 * @param {Object} params.models - Result of getAllModels()
 * @param {string} [params.featureType] - Optional feature identifier for future policy routing
 * @returns {Promise<{
 *   decision: 'allow' | 'allow_with_override_warning' | 'deny',
 *   reasonCode: string | null,
 *   consentSource: 'ai_privacy_profile' | 'waiver_signature' | 'none',
 *   requiresAuditOverride: boolean,
 *   warnings: string[]
 * }>}
 */
export async function checkAiEligibility({
  targetUserId,
  actorUserId,
  actorRole,
  models,
  featureType,
}) {
  const { AiPrivacyProfile } = models || {};

  const roleFallback = (reasonCode = 'AI_CONSENT_MISSING') => {
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
      reasonCode,
      consentSource: 'none',
      requiresAuditOverride: false,
      warnings: [],
    };
  };

  let noConsentReason = 'AI_CONSENT_MISSING';

  // ── Source 1: AiPrivacyProfile (fast path) ────────────────────
  if (AiPrivacyProfile) {
    const consentProfile = await AiPrivacyProfile.findOne({
      where: { userId: targetUserId },
    });

    if (consentProfile?.aiEnabled && !consentProfile.withdrawnAt) {
      return {
        decision: 'allow',
        reasonCode: null,
        consentSource: 'ai_privacy_profile',
        requiresAuditOverride: false,
        warnings: [],
      };
    }

    if (!consentProfile) {
      noConsentReason = 'AI_CONSENT_MISSING';
    } else if (!consentProfile.aiEnabled) {
      noConsentReason = 'AI_CONSENT_DISABLED';
    } else if (consentProfile.withdrawnAt) {
      noConsentReason = 'AI_CONSENT_WITHDRAWN';
    }
  } else {
    logger.debug('[AiEligibility] AiPrivacyProfile model not available', {
      targetUserId,
      actorUserId,
      actorRole,
      featureType: featureType || null,
    });
  }

  // ── Source 2: Waiver — version-aware check (5W-F) ─────────────
  const waiverEligibility = await evaluateWaiverVersionEligibility({
    targetUserId,
    models,
  });

  if (waiverEligibility.hasWaiverConsent && waiverEligibility.isCurrent) {
    return {
      decision: 'allow',
      reasonCode: null,
      consentSource: 'waiver_signature',
      requiresAuditOverride: false,
      warnings: [],
    };
  }

  // Waiver exists but version is outdated — use waiver-specific reason code
  if (waiverEligibility.hasWaiverConsent && !waiverEligibility.isCurrent) {
    return roleFallback('AI_WAIVER_VERSION_OUTDATED');
  }

  // No waiver consent source at all — check if we should use waiver-specific code
  if (waiverEligibility.reasonCode === 'AI_WAIVER_MISSING'
    && noConsentReason === 'AI_CONSENT_MISSING') {
    return roleFallback('AI_WAIVER_MISSING');
  }

  return roleFallback(noConsentReason);
}
