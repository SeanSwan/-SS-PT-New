/**
 * Waiver Version Eligibility Service — Phase 5W-F
 * =================================================
 * Version-aware waiver consent evaluation for AI features.
 *
 * "Current" version rule:
 *   - Both `core` and `ai_notice` waiverType must have a current version
 *     (effectiveAt <= NOW, retiredAt IS NULL) that the user has accepted
 *     via a linked WaiverRecord's WaiverRecordVersion link.
 *   - If any accepted required version has requiresReconsent=true,
 *     it counts as outdated until re-signed.
 *
 * Returns: { hasWaiverConsent, isCurrent, reasonCode, consentSource, details }
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §7, §10.3
 */
import { Op } from 'sequelize';

const REQUIRED_WAIVER_TYPES = ['core', 'ai_notice'];

/**
 * Evaluate whether a user's waiver consent is version-current for AI features.
 *
 * @param {Object} params
 * @param {number} params.targetUserId
 * @param {Object} params.models - getAllModels() result
 * @param {Date}   [params.now] - Override clock for testing
 * @returns {Promise<{
 *   hasWaiverConsent: boolean,
 *   isCurrent: boolean,
 *   reasonCode: 'AI_WAIVER_MISSING' | 'AI_WAIVER_VERSION_OUTDATED' | null,
 *   consentSource: 'waiver_signature' | 'none',
 *   details: {
 *     requiredVersionIds: number[],
 *     acceptedVersionIds: number[],
 *     missingRequiredVersionIds: number[],
 *     reconsentRequiredVersionIds: number[],
 *   }
 * }>}
 */
export async function evaluateWaiverVersionEligibility({
  targetUserId,
  models,
  now = new Date(),
}) {
  const { WaiverRecord, WaiverVersion, WaiverRecordVersion } = models || {};

  const emptyDetails = {
    requiredVersionIds: [],
    acceptedVersionIds: [],
    missingRequiredVersionIds: [],
    reconsentRequiredVersionIds: [],
  };

  // Guard: required models not available
  if (!WaiverRecord || !WaiverVersion || !WaiverRecordVersion) {
    return {
      hasWaiverConsent: false,
      isCurrent: false,
      reasonCode: 'AI_WAIVER_MISSING',
      consentSource: 'none',
      details: emptyDetails,
    };
  }

  // Step 1: Find all current required versions (core + ai_notice)
  const currentRequiredVersions = await WaiverVersion.findAll({
    where: {
      waiverType: { [Op.in]: REQUIRED_WAIVER_TYPES },
      effectiveAt: { [Op.lte]: now },
      retiredAt: null,
    },
    attributes: ['id', 'waiverType', 'requiresReconsent'],
  });

  const requiredVersionIds = currentRequiredVersions.map((v) => v.id);

  // If no current versions defined for required types, there's nothing to enforce
  if (requiredVersionIds.length === 0) {
    return {
      hasWaiverConsent: false,
      isCurrent: false,
      reasonCode: 'AI_WAIVER_MISSING',
      consentSource: 'none',
      details: { ...emptyDetails, requiredVersionIds: [] },
    };
  }

  // Check all required types have at least one current version
  const coveredTypes = new Set(currentRequiredVersions.map((v) => v.waiverType));
  const missingTypes = REQUIRED_WAIVER_TYPES.filter((t) => !coveredTypes.has(t));
  if (missingTypes.length > 0) {
    return {
      hasWaiverConsent: false,
      isCurrent: false,
      reasonCode: 'AI_WAIVER_MISSING',
      consentSource: 'none',
      details: { ...emptyDetails, requiredVersionIds },
    };
  }

  // Step 2: Find user's linked waiver record with AI consent
  const linkedWaiver = await WaiverRecord.findOne({
    where: { userId: targetUserId, status: 'linked' },
    include: [{
      association: 'consentFlags',
      where: { aiConsentAccepted: true },
      required: true,
    }],
    attributes: ['id'],
  });

  if (!linkedWaiver) {
    return {
      hasWaiverConsent: false,
      isCurrent: false,
      reasonCode: 'AI_WAIVER_MISSING',
      consentSource: 'none',
      details: { ...emptyDetails, requiredVersionIds },
    };
  }

  // Step 3: Check which required versions the user has accepted
  const acceptedLinks = await WaiverRecordVersion.findAll({
    where: {
      waiverRecordId: linkedWaiver.id,
      waiverVersionId: { [Op.in]: requiredVersionIds },
      accepted: true,
    },
    attributes: ['waiverVersionId'],
  });

  const acceptedVersionIds = acceptedLinks.map((l) => l.waiverVersionId);
  const missingRequiredVersionIds = requiredVersionIds.filter(
    (id) => !acceptedVersionIds.includes(id),
  );

  // Step 4: Check requiresReconsent on accepted versions
  const reconsentRequiredVersionIds = currentRequiredVersions
    .filter((v) => v.requiresReconsent && acceptedVersionIds.includes(v.id))
    .map((v) => v.id);

  const details = {
    requiredVersionIds,
    acceptedVersionIds,
    missingRequiredVersionIds,
    reconsentRequiredVersionIds,
  };

  // No current required versions accepted — check if user accepted ANY version (possibly retired)
  if (acceptedVersionIds.length === 0) {
    const anyAcceptedLink = await WaiverRecordVersion.findAll({
      where: { waiverRecordId: linkedWaiver.id, accepted: true },
      attributes: ['waiverVersionId'],
      limit: 1,
    });
    if (anyAcceptedLink.length > 0) {
      // User signed older/retired versions but none of the current ones → outdated
      return {
        hasWaiverConsent: true,
        isCurrent: false,
        reasonCode: 'AI_WAIVER_VERSION_OUTDATED',
        consentSource: 'waiver_signature',
        details,
      };
    }
    // Truly no accepted versions at all
    return {
      hasWaiverConsent: false,
      isCurrent: false,
      reasonCode: 'AI_WAIVER_MISSING',
      consentSource: 'none',
      details,
    };
  }

  // Has waiver consent but versions are outdated
  if (missingRequiredVersionIds.length > 0 || reconsentRequiredVersionIds.length > 0) {
    return {
      hasWaiverConsent: true,
      isCurrent: false,
      reasonCode: 'AI_WAIVER_VERSION_OUTDATED',
      consentSource: 'waiver_signature',
      details,
    };
  }

  // All current required versions accepted, no reconsent needed
  return {
    hasWaiverConsent: true,
    isCurrent: true,
    reasonCode: null,
    consentSource: 'waiver_signature',
    details,
  };
}
