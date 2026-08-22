/**
 * AI Consent Controller
 * =====================
 * Manages AI privacy consent: grant, withdraw, and read status.
 *
 * Access rules:
 *   - Clients can manage their own consent only
 *   - Trainers can read consent status for assigned clients only
 *   - Admins can manage consent for any user
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */
import { getAllModels } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { evaluateWaiverVersionEligibility } from '../services/waivers/waiverVersionEligibilityService.mjs';

// 2026-08-22 — v2.0 corrects the disclosure: v1.0 told users their identity was
// "hidden" and they were "anonymous", while de-identification assigns a STABLE
// pseudonym and forwards training, injury and medical-condition data. v1.0
// consents were therefore captured under a materially inaccurate description of
// processing. Both versions stay VALID so existing grants keep working, but
// CURRENT advances so a stored 1.0 is detectable as stale and can be re-prompted
// (owner decision Q5: re-consent all). Frontend copy lives in
// frontend/src/content/aiConsentCopy.ts — the two MUST be bumped together.
const CURRENT_CONSENT_VERSION = '2.0';
const VALID_CONSENT_VERSIONS = ['1.0', '2.0'];

function parsePositiveUserId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * POST /api/ai/consent/grant
 * Body: { userId?, consentVersion? }
 * Clients omit userId (self). Admins may specify userId.
 *
 * Validates target user exists and is a client before creating consent.
 * Admins and trainers must provide an explicit target userId.
 */
export const grantAiConsent = async (req, res) => {
  try {
    const requesterId = parsePositiveUserId(req.user?.id);
    const requesterRole = req.user?.role;

    if (!requesterId || !requesterRole) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const rawUserId = req.body?.userId;
    const targetUserId = resolveTargetUser(rawUserId, requesterId, requesterRole);

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Missing or invalid userId' });
    }

    // RBAC: clients can only manage their own consent
    if (requesterRole === 'client' && targetUserId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Trainers cannot grant consent on behalf of clients
    if (requesterRole === 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Trainers cannot grant AI consent on behalf of clients.',
      });
    }

    const models = getAllModels();
    const { AiPrivacyProfile, User } = models;

    // Validate target user exists and is a client (when granting for someone else)
    if (targetUserId !== requesterId) {
      const targetUser = await User.findByPk(targetUserId, { attributes: ['id', 'role'] });
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Target user not found.' });
      }
      if (targetUser.role !== 'client') {
        return res.status(400).json({ success: false, message: 'AI consent can only be granted for client accounts.' });
      }
    }

    // Validate consentVersion
    const consentVersion = req.body?.consentVersion || CURRENT_CONSENT_VERSION;
    if (!VALID_CONSENT_VERSIONS.includes(consentVersion)) {
      return res.status(400).json({ success: false, message: `Invalid consent version. Valid versions: ${VALID_CONSENT_VERSIONS.join(', ')}` });
    }

    const [profile, created] = await AiPrivacyProfile.findOrCreate({
      where: { userId: targetUserId },
      defaults: {
        aiEnabled: true,
        consentVersion,
        consentedAt: new Date(),
        withdrawnAt: null,
      },
    });

    if (!created) {
      await profile.update({
        aiEnabled: true,
        consentVersion,
        consentedAt: new Date(),
        withdrawnAt: null,
      });
    }

    logger.info('[AI Consent] Consent granted', { targetUserId, consentVersion, grantedBy: requesterId });

    return res.status(200).json({
      success: true,
      message: 'AI consent granted.',
      profile: {
        userId: profile.userId,
        aiEnabled: true,
        consentVersion,
        consentedAt: profile.consentedAt,
      },
    });
  } catch (error) {
    logger.error('[AI Consent] Error granting consent:', error);
    return res.status(500).json({ success: false, message: 'Failed to grant AI consent.' });
  }
};

/**
 * POST /api/ai/consent/withdraw
 * Body: { userId? }
 */
export const withdrawAiConsent = async (req, res) => {
  try {
    const requesterId = parsePositiveUserId(req.user?.id);
    const requesterRole = req.user?.role;

    if (!requesterId || !requesterRole) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const rawUserId = req.body?.userId;
    const targetUserId = resolveTargetUser(rawUserId, requesterId, requesterRole);

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Missing or invalid userId' });
    }

    if (requesterRole === 'client' && targetUserId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (requesterRole === 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Trainers cannot withdraw AI consent on behalf of clients.',
      });
    }

    const models = getAllModels();
    const { AiPrivacyProfile, User } = models;

    // Validate target user exists when withdrawing for someone else
    if (targetUserId !== requesterId) {
      const targetUser = await User.findByPk(targetUserId, { attributes: ['id'] });
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Target user not found.' });
      }
    }

    const profile = await AiPrivacyProfile.findOne({ where: { userId: targetUserId } });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'No AI consent record found for this user.',
      });
    }

    await profile.update({
      aiEnabled: false,
      withdrawnAt: new Date(),
    });

    logger.info('[AI Consent] Consent withdrawn', { targetUserId, withdrawnBy: requesterId });

    return res.status(200).json({
      success: true,
      message: 'AI consent withdrawn.',
      profile: {
        userId: profile.userId,
        aiEnabled: false,
        withdrawnAt: profile.withdrawnAt,
      },
    });
  } catch (error) {
    logger.error('[AI Consent] Error withdrawing consent:', error);
    return res.status(500).json({ success: false, message: 'Failed to withdraw AI consent.' });
  }
};

/**
 * GET /api/ai/consent/status
 * GET /api/ai/consent/status/:userId
 * Clients: own status only. Trainers: assigned clients. Admins: any.
 */
export const getAiConsentStatus = async (req, res) => {
  try {
    const requesterId = parsePositiveUserId(req.user?.id);
    const requesterRole = req.user?.role;

    if (!requesterId || !requesterRole) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // REV 3 (2026-04-30, Triage Slice 1): drop req.query?.userId entirely.
    // The paramless mount /api/ai/consent/status now ALWAYS returns the
    // authenticated user's own consent profile - no user-controlled
    // selector accepted on this mount. The /:userId mount continues to
    // accept the path param and run the downstream role-based gates at
    // lines 208-231 (client 403'd cross-user; trainer assignment-gated;
    // admin trusted by design).
    //
    // Village CRITICAL-01 (Sonnet 4.6 disputed by GPT-5.5 to HIGH-conditional):
    // attack surface reduction is mandatory regardless of severity. Removing
    // the query selector also makes the IDOR review trivial in future audits.
    const pathUserId = req.params?.userId;

    let targetUserId;
    if (!pathUserId) {
      // Paramless mount: ALWAYS the authenticated user's own profile.
      targetUserId = requesterId;
    } else {
      // Explicit /:userId mount: full role-based resolution + downstream
      // ownership/trainer-assignment gates at lines 208-231.
      targetUserId = resolveTargetUser(pathUserId, requesterId, requesterRole);
      if (!targetUserId) {
        return res.status(400).json({ success: false, message: 'Missing or invalid userId' });
      }
    }

    if (requesterRole === 'client' && targetUserId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const models = getAllModels();
    const { AiPrivacyProfile, User, ClientTrainerAssignment } = models;

    // Validate target user exists when querying someone else
    if (targetUserId !== requesterId) {
      const targetUser = await User.findByPk(targetUserId, { attributes: ['id'] });
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Target user not found.' });
      }
    }

    // Trainers: verify assignment before revealing consent status
    if (requesterRole === 'trainer' && targetUserId !== requesterId) {
      const assignment = await ClientTrainerAssignment.findOne({
        where: { clientId: targetUserId, trainerId: requesterId, status: 'active' },
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const profile = await AiPrivacyProfile.findOne({ where: { userId: targetUserId } });

    // 5W-F: Evaluate waiver version eligibility for the target user
    let waiverEligibility = null;
    try {
      const waiverResult = await evaluateWaiverVersionEligibility({ targetUserId, models });
      waiverEligibility = {
        isCurrent: waiverResult.isCurrent,
        reasonCode: waiverResult.reasonCode,
        requiresReconsent: waiverResult.details.reconsentRequiredVersionIds.length > 0,
      };
    } catch (waiverErr) {
      logger.warn('[AI Consent] Waiver eligibility check failed (non-blocking):', waiverErr.message);
    }

    if (!profile) {
      return res.status(200).json({
        success: true,
        consentGranted: false,
        profile: null,
        waiverEligibility,
      });
    }

    return res.status(200).json({
      success: true,
      consentGranted: profile.aiEnabled && !profile.withdrawnAt,
      profile: {
        userId: profile.userId,
        aiEnabled: profile.aiEnabled,
        consentVersion: profile.consentVersion,
        consentedAt: profile.consentedAt,
        withdrawnAt: profile.withdrawnAt,
      },
      waiverEligibility,
    });
  } catch (error) {
    logger.error('[AI Consent] Error reading consent status:', error);
    return res.status(500).json({ success: false, message: 'Failed to read AI consent status.' });
  }
};

/**
 * Resolve the target userId from raw input, respecting role rules.
 *
 * Behavior:
 *   - rawUserId provided + parses to integer  -> that integer
 *   - rawUserId provided + non-integer        -> null (caller returns 400)
 *   - rawUserId omitted                       -> requesterId (self)
 *
 * Self-default applies to all roles. Cross-user authorization is enforced
 * by the per-role gates in the calling controllers (clients 403'd cross-user;
 * trainers blocked outright on grant/withdraw and assignment-checked on
 * status; admins trusted by design). This matches the GET /consent/status
 * paramless mount which has always defaulted to self for all roles.
 *
 * Prior behavior (until 2026-04-30): admin/trainer with no userId returned
 * null, producing a 400 on the consent settings UI for non-client roles
 * because the consent settings page is a self-service surface that does
 * not send a userId. The 400 was a false-positive — a self-service surface
 * always means "act on the requester."
 */
function resolveTargetUser(rawUserId, requesterId, requesterRole) {
  if (rawUserId !== undefined && rawUserId !== null && rawUserId !== '') {
    return parsePositiveUserId(rawUserId);
  }
  return requesterId;
}
