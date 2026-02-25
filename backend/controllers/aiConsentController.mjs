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

const CURRENT_CONSENT_VERSION = '1.0';
const VALID_CONSENT_VERSIONS = ['1.0'];

/**
 * POST /api/ai/consent/grant
 * Body: { userId?, consentVersion? }
 * Clients omit userId (self). Admins may specify userId.
 *
 * Validates target user exists and is a client before creating consent.
 * Admin/trainer self-consent defaults to self when no userId provided.
 */
export const grantAiConsent = async (req, res) => {
  try {
    const requesterId = req.user?.id;
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
    const requesterId = req.user?.id;
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
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId || !requesterRole) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const rawUserId = req.params?.userId || req.query?.userId;
    const targetUserId = resolveTargetUser(rawUserId, requesterId, requesterRole);

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Missing or invalid userId' });
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

    if (!profile) {
      return res.status(200).json({
        success: true,
        consentGranted: false,
        profile: null,
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
    });
  } catch (error) {
    logger.error('[AI Consent] Error reading consent status:', error);
    return res.status(500).json({ success: false, message: 'Failed to read AI consent status.' });
  }
};

/**
 * Resolve the target userId from raw input, respecting role rules.
 *
 * Behavior by role:
 *   - client:  defaults to self (requesterId) when userId is omitted
 *   - trainer: requires explicit userId (returns null if omitted → 400)
 *   - admin:   requires explicit userId (returns null if omitted → 400)
 *
 * This is intentional: trainers and admins must specify which user they are
 * acting on. Clients always act on themselves.
 */
function resolveTargetUser(rawUserId, requesterId, requesterRole) {
  if (rawUserId) {
    const parsed = Number(rawUserId);
    return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : null;
  }
  // Clients default to self
  if (requesterRole === 'client') return requesterId;
  return null;
}
