/**
 * Admin Waiver Controller — Phase 5W-D
 * =====================================
 * Admin review + resolution for waiver records and pending matches.
 *
 * Contract: docs/ai-workflow/blueprints/WAIVER-CONSENT-QR-FLOW-CONTRACT.md §10.2
 *
 * Endpoints:
 * - GET    /api/admin/waivers              — list waiver records (paginated, filterable)
 * - GET    /api/admin/waivers/:id          — waiver record detail
 * - POST   /api/admin/waivers/matches/:matchId/approve  — approve pending match
 * - POST   /api/admin/waivers/matches/:matchId/reject   — reject pending match
 * - POST   /api/admin/waivers/:id/attach-user           — manual user link
 * - POST   /api/admin/waivers/:id/revoke                — revoke waiver
 */

import logger from '../utils/logger.mjs';
import { getModel, Op } from '../models/index.mjs';
import sequelize from '../database.mjs';

// ─── §11.2 Status Badge Computation ─────────────────────────
const BADGE_LABELS = {
  WAIVER_SIGNED: 'Waiver Signed',
  AI_CONSENT_SIGNED: 'AI Consent Signed',
  CONSENT_MISSING: 'Consent Missing',
  GUARDIAN_REQUIRED: 'Guardian Required',
  VERSION_OUTDATED: 'Version Outdated',
  PENDING_MATCH: 'Pending Match',
};

function computeBadges(record) {
  const badges = [];

  // Waiver Signed: record has signatureData + at least one accepted versionLink
  const hasAcceptedVersion = record.versionLinks?.some((vl) => vl.accepted);
  if (record.signatureData && hasAcceptedVersion) {
    badges.push(BADGE_LABELS.WAIVER_SIGNED);
  }

  // AI Consent Signed
  if (record.consentFlags?.aiConsentAccepted) {
    badges.push(BADGE_LABELS.AI_CONSENT_SIGNED);
  }

  // Consent Missing: liability not accepted
  if (!record.consentFlags?.liabilityAccepted) {
    badges.push(BADGE_LABELS.CONSENT_MISSING);
  }

  // Guardian Required: submitted by guardian but not acknowledged
  if (record.submittedByGuardian && !record.consentFlags?.guardianAcknowledged) {
    badges.push(BADGE_LABELS.GUARDIAN_REQUIRED);
  }

  // Version Outdated: accepted version link whose waiverVersion is retired OR requires re-consent
  const hasOutdated = record.versionLinks?.some(
    (vl) => vl.accepted && (vl.waiverVersion?.retiredAt || vl.waiverVersion?.requiresReconsent)
  );
  if (hasOutdated) {
    badges.push(BADGE_LABELS.VERSION_OUTDATED);
  }

  // Pending Match: record in pending_match status
  if (record.status === 'pending_match') {
    badges.push(BADGE_LABELS.PENDING_MATCH);
  }

  return badges;
}

// ─── Shared include definitions ──────────────────────────────
const userAttrs = ['id', 'firstName', 'lastName', 'email'];

const summaryIncludes = () => [
  { association: 'user', attributes: userAttrs },
  { association: 'consentFlags' },
  {
    association: 'pendingMatches',
    where: { status: 'pending_review' },
    required: false,
    include: [{ association: 'candidateUser', attributes: userAttrs }],
  },
];

const detailIncludes = () => [
  { association: 'user', attributes: userAttrs },
  { association: 'consentFlags' },
  {
    association: 'pendingMatches',
    include: [
      { association: 'candidateUser', attributes: userAttrs },
      { association: 'reviewedByUser', attributes: userAttrs },
    ],
  },
  {
    association: 'versionLinks',
    include: [
      {
        association: 'waiverVersion',
        attributes: ['id', 'waiverType', 'activityType', 'version', 'title', 'effectiveAt', 'retiredAt', 'requiresReconsent'],
      },
    ],
  },
];

// ─── 1. List Waiver Records ─────────────────────────────────
export const listWaiverRecords = async (req, res) => {
  try {
    const WaiverRecord = getModel('WaiverRecord');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.source) where.source = req.query.source;
    if (req.query.search) {
      const term = `%${req.query.search}%`;
      where[Op.or] = [
        { fullName: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { phone: { [Op.iLike]: term } },
      ];
    }

    const { rows, count } = await WaiverRecord.findAndCountAll({
      where,
      include: summaryIncludes(),
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      success: true,
      data: {
        records: rows,
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
      },
    });
  } catch (error) {
    logger.error('[AdminWaiverController] listWaiverRecords error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch waiver records' });
  }
};

// ─── 2. Waiver Record Detail ────────────────────────────────
export const getWaiverRecordDetail = async (req, res) => {
  try {
    const WaiverRecord = getModel('WaiverRecord');
    const record = await WaiverRecord.findByPk(req.params.id, {
      include: detailIncludes(),
    });

    if (!record) {
      return res.status(404).json({ success: false, error: 'Waiver record not found' });
    }

    const badges = computeBadges(record);

    return res.json({ success: true, data: { record, badges } });
  } catch (error) {
    logger.error('[AdminWaiverController] getWaiverRecordDetail error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch waiver record' });
  }
};

// ─── 3. Approve Match (§10.2) ───────────────────────────────
export const approveMatch = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const PendingWaiverMatch = getModel('PendingWaiverMatch');
    const WaiverRecord = getModel('WaiverRecord');

    const match = await PendingWaiverMatch.findByPk(req.params.matchId, {
      include: [{ association: 'waiverRecord' }],
      transaction,
    });

    if (!match) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Match not found' });
    }
    if (match.status !== 'pending_review') {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: `Match already resolved (${match.status})` });
    }
    // Guard: candidateUserId must be present
    if (!match.candidateUserId) {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: 'Cannot approve match with no candidate user' });
    }
    // Guard: parent waiver must be in actionable state
    if (match.waiverRecord.status === 'revoked' || match.waiverRecord.status === 'superseded') {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: `Cannot approve match — waiver is ${match.waiverRecord.status}`,
      });
    }

    // Approve match
    await match.update(
      { status: 'approved', reviewedByUserId: req.user.id, reviewedAt: new Date() },
      { transaction },
    );

    // Link waiver record to candidate user
    await WaiverRecord.update(
      { userId: match.candidateUserId, status: 'linked' },
      { where: { id: match.waiverRecordId }, transaction },
    );

    // Reject all other pending matches for same record
    await PendingWaiverMatch.update(
      { status: 'rejected', reviewedByUserId: req.user.id, reviewedAt: new Date() },
      {
        where: {
          waiverRecordId: match.waiverRecordId,
          id: { [Op.ne]: match.id },
          status: 'pending_review',
        },
        transaction,
      },
    );

    await transaction.commit();
    logger.info(`[AdminWaiverController] Match ${match.id} approved by admin ${req.user.id}`);
    return res.json({ success: true, message: 'Match approved and waiver linked' });
  } catch (error) {
    await transaction.rollback();
    logger.error('[AdminWaiverController] approveMatch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to approve match' });
  }
};

// ─── 4. Reject Match (§10.2) ────────────────────────────────
export const rejectMatch = async (req, res) => {
  try {
    const PendingWaiverMatch = getModel('PendingWaiverMatch');
    const match = await PendingWaiverMatch.findByPk(req.params.matchId, {
      include: [{ association: 'waiverRecord' }],
    });

    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }
    if (match.status !== 'pending_review') {
      return res.status(409).json({ success: false, error: `Match already resolved (${match.status})` });
    }
    // Guard: parent waiver state
    if (match.waiverRecord.status === 'revoked' || match.waiverRecord.status === 'superseded') {
      return res.status(409).json({
        success: false,
        error: `Cannot reject match — waiver is ${match.waiverRecord.status}`,
      });
    }

    await match.update({ status: 'rejected', reviewedByUserId: req.user.id, reviewedAt: new Date() });

    logger.info(`[AdminWaiverController] Match ${match.id} rejected by admin ${req.user.id}`);
    return res.json({ success: true, message: 'Match rejected' });
  } catch (error) {
    logger.error('[AdminWaiverController] rejectMatch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reject match' });
  }
};

// ─── 5. Manual Attach User (§10.2: /:id/attach-user) ───────
export const attachUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const WaiverRecord = getModel('WaiverRecord');
    const User = getModel('User');
    const PendingWaiverMatch = getModel('PendingWaiverMatch');
    const AiConsentLog = getModel('AiConsentLog');

    const { userId } = req.body;
    if (!userId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const record = await WaiverRecord.findByPk(req.params.id, { transaction });
    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Waiver record not found' });
    }
    if (record.status === 'linked') {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: 'Waiver already linked to a user' });
    }
    if (record.status === 'revoked' || record.status === 'superseded') {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: `Cannot attach user — waiver is ${record.status}`,
      });
    }

    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    // Guard: contract §11.3 says "manual attach to client"
    if (user.role !== 'client') {
      await transaction.rollback();
      return res.status(422).json({ success: false, error: `Cannot attach waiver to non-client user (role: ${user.role})` });
    }

    // Link waiver
    await record.update({ userId, status: 'linked' }, { transaction });

    // Reject all pending matches for this record
    await PendingWaiverMatch.update(
      { status: 'rejected', reviewedByUserId: req.user.id, reviewedAt: new Date() },
      { where: { waiverRecordId: record.id, status: 'pending_review' }, transaction },
    );

    // Audit: immutable record of admin override (§12 requirement 4)
    await AiConsentLog.create(
      {
        userId,
        action: 'override_used',
        sourceType: 'waiver_record',
        sourceId: record.id,
        actorUserId: req.user.id,
        reason: 'Manual attach by admin',
      },
      { transaction },
    );

    await transaction.commit();
    logger.info(`[AdminWaiverController] Waiver ${record.id} manually attached to user ${userId} by admin ${req.user.id}`);
    return res.json({ success: true, message: 'Waiver manually linked to user' });
  } catch (error) {
    await transaction.rollback();
    logger.error('[AdminWaiverController] attachUser error:', error);
    return res.status(500).json({ success: false, error: 'Failed to attach user' });
  }
};

// ─── 6. Revoke Waiver ──────────────────────────────────────
export const revokeWaiver = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const WaiverRecord = getModel('WaiverRecord');
    const AiConsentLog = getModel('AiConsentLog');
    const PendingWaiverMatch = getModel('PendingWaiverMatch');

    const record = await WaiverRecord.findByPk(req.params.id, {
      include: [{ association: 'consentFlags' }],
      transaction,
    });

    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Waiver record not found' });
    }
    if (record.status === 'revoked') {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: 'Waiver already revoked' });
    }

    // Revoke the waiver
    await record.update({ status: 'revoked' }, { transaction });

    // Force-close any pending matches to prevent future approve
    await PendingWaiverMatch.update(
      { status: 'rejected', reviewedByUserId: req.user.id, reviewedAt: new Date() },
      { where: { waiverRecordId: record.id, status: 'pending_review' }, transaction },
    );

    // Audit: unconditional immutable record of admin revocation (§12 requirement 4)
    // Use 'withdrawn' action when AI consent was active, 'override_used' otherwise
    await AiConsentLog.create(
      {
        userId: record.userId || null,
        action: record.consentFlags?.aiConsentAccepted ? 'withdrawn' : 'override_used',
        sourceType: 'waiver_record',
        sourceId: record.id,
        actorUserId: req.user.id,
        reason: record.consentFlags?.aiConsentAccepted
          ? 'Waiver revoked by admin (AI consent withdrawn)'
          : 'Waiver revoked by admin',
      },
      { transaction },
    );

    await transaction.commit();
    logger.info(`[AdminWaiverController] Waiver ${record.id} revoked by admin ${req.user.id}`);
    return res.json({ success: true, message: 'Waiver revoked' });
  } catch (error) {
    await transaction.rollback();
    logger.error('[AdminWaiverController] revokeWaiver error:', error);
    return res.status(500).json({ success: false, error: 'Failed to revoke waiver' });
  }
};

// ─── §7 5W-F: Mark Waiver Version as Requiring Re-Consent ─────
/**
 * POST /api/admin/waivers/versions/:versionId/mark-reconsent-required
 * Body: { reason?: string }
 * Sets requiresReconsent=true on a waiver version. Idempotent.
 * Audit: creates AiConsentLog entry for traceability.
 */
export const markReconsentRequired = async (req, res) => {
  try {
    const WaiverVersion = getModel('WaiverVersion');
    const AiConsentLog = getModel('AiConsentLog');
    const WaiverRecordVersion = getModel('WaiverRecordVersion');

    const versionId = Number(req.params.versionId);
    if (!Number.isFinite(versionId) || !Number.isInteger(versionId)) {
      return res.status(400).json({ success: false, error: 'Invalid versionId' });
    }

    const version = await WaiverVersion.findByPk(versionId);
    if (!version) {
      return res.status(404).json({ success: false, error: 'Waiver version not found' });
    }

    const alreadyRequired = version.requiresReconsent === true;

    if (!alreadyRequired) {
      await version.update({ requiresReconsent: true });
    }

    // Count impacted linked users (read-only count of accepted links for this version)
    const impactedCount = await WaiverRecordVersion.count({
      where: { waiverVersionId: versionId, accepted: true },
    });

    // Audit trail
    const reason = req.body?.reason || 'Admin marked version as requiring re-consent';
    await AiConsentLog.create({
      userId: null,
      action: 'override_used',
      sourceType: 'waiver_record',
      sourceId: versionId,
      actorUserId: req.user.id,
      reason,
      metadata: { endpoint: 'mark_reconsent_required', versionId, alreadyRequired },
    });

    logger.info(`[AdminWaiverController] Version ${versionId} marked requiresReconsent by admin ${req.user.id}`);
    return res.json({
      success: true,
      message: alreadyRequired
        ? 'Version already requires re-consent (no change)'
        : 'Version marked as requiring re-consent',
      alreadyRequired,
      impactedUserCount: impactedCount,
    });
  } catch (error) {
    logger.error('[AdminWaiverController] markReconsentRequired error:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark version as requiring re-consent' });
  }
};

// Named export for badge computation (used by tests and frontend contract)
export { computeBadges };
