/**
 * Equipment Scan Review Outcome Service
 * =====================================
 * Best-effort persistence for trainer approval/rejection outcomes on scan
 * candidate ledger rows. Approval routes must continue to work if the optional
 * scan review ledger is unavailable.
 */
import { getEquipmentScanCandidate, getEquipmentScanSession } from '../models/index.mjs';
import appLogger from '../utils/logger.mjs';

const VALID_OUTCOMES = new Set(['approved', 'rejected']);
const VALID_CANDIDATE_STATUSES = new Set(['created_item', 'duplicate', 'possible']);
const COUNTER_FIELD_BY_STATUS = {
  approved: 'approvedCount',
  rejected: 'rejectedCount',
};
const CORRECTION_LIMITS = {
  name: 150,
  trainerLabel: 150,
  category: 50,
  resistanceType: 30,
  rejectionReason: 80,
};

const cleanString = (value, maxLength) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null
);

const toCount = value => (Number.isFinite(Number(value)) ? Number(value) : 0);
const toPositiveInteger = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};
const toCandidateIndex = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
};

function getModels(models) {
  if (models) return models;
  return {
    EquipmentScanCandidate: getEquipmentScanCandidate(),
    EquipmentScanSession: getEquipmentScanSession(),
  };
}

function sanitizeTrainerCorrection(correction = {}) {
  const sanitized = {};
  for (const [key, limit] of Object.entries(CORRECTION_LIMITS)) {
    const value = cleanString(correction[key], limit);
    if (value) sanitized[key] = value;
  }
  return sanitized;
}

async function markSessionReviewedIfComplete({ EquipmentScanSession, sessionId }) {
  if (!EquipmentScanSession?.findByPk || !EquipmentScanSession?.update) return;

  const session = await EquipmentScanSession.findByPk(sessionId, {
    attributes: ['id', 'approvedCount', 'rejectedCount', 'createdItemCount', 'reviewableCount'],
  });
  if (!session) return;

  const reviewedCount = toCount(session.approvedCount) + toCount(session.rejectedCount);
  const targetCount = toCount(session.reviewableCount) || toCount(session.createdItemCount);
  if (targetCount > 0 && reviewedCount >= targetCount) {
    await EquipmentScanSession.update(
      { status: 'reviewed' },
      { where: { id: sessionId, status: 'pending_review' } },
    );
  }
}

async function updateSessionReviewCounters({ EquipmentScanSession, sessionId, previousStatus, status }) {
  if (!EquipmentScanSession || !sessionId || previousStatus === status) return;

  const deltas = {};
  const previousCounter = COUNTER_FIELD_BY_STATUS[previousStatus];
  const nextCounter = COUNTER_FIELD_BY_STATUS[status];
  if (previousCounter) deltas[previousCounter] = (deltas[previousCounter] || 0) - 1;
  if (nextCounter) deltas[nextCounter] = (deltas[nextCounter] || 0) + 1;

  if (Object.keys(deltas).length > 0) {
    await EquipmentScanSession.increment(deltas, { where: { id: sessionId } });
  }
  await markSessionReviewedIfComplete({ EquipmentScanSession, sessionId });
}

async function applyCandidateReview({
  candidate,
  EquipmentScanSession,
  now,
  status,
  reviewedBy,
  trainerCorrection,
  equipmentItemId,
  duplicateOfItemId,
}) {
  const previousStatus = candidate.status;
  const reviewedAt = now();
  const updatePayload = {
    status,
    reviewedAt,
    reviewedBy,
    trainerCorrection: sanitizeTrainerCorrection(trainerCorrection),
  };
  if (equipmentItemId) updatePayload.equipmentItemId = equipmentItemId;
  if (duplicateOfItemId) updatePayload.duplicateOfItemId = duplicateOfItemId;

  await candidate.update(updatePayload);

  await updateSessionReviewCounters({
    EquipmentScanSession,
    sessionId: candidate.sessionId,
    previousStatus,
    status,
  });

  return { candidateId: candidate.id, sessionId: candidate.sessionId, status };
}

export async function recordEquipmentScanCandidateReview({
  models,
  logger = appLogger,
  now = () => new Date(),
  profileId,
  equipmentItemId,
  reviewedBy,
  status,
  trainerCorrection = {},
}) {
  if (!profileId || !equipmentItemId || !reviewedBy || !VALID_OUTCOMES.has(status)) return null;

  try {
    const { EquipmentScanCandidate, EquipmentScanSession } = getModels(models) || {};
    if (!EquipmentScanCandidate) return null;

    const candidate = await EquipmentScanCandidate.findOne({
      where: { equipmentItemId, profileId },
      order: [['createdAt', 'DESC']],
    });
    if (!candidate) return null;

    return await applyCandidateReview({
      candidate,
      EquipmentScanSession,
      now,
      status,
      reviewedBy,
      trainerCorrection,
    });
  } catch (error) {
    logger.warn('[EquipmentScanReviewOutcome] Failed to record scan candidate review outcome (non-fatal)', {
      error: error.message,
      profileId,
      equipmentItemId,
      reviewedBy,
    });
    return null;
  }
}

export async function recordEquipmentScanCandidateAction({
  models,
  logger = appLogger,
  now = () => new Date(),
  profileId,
  reviewSessionId,
  candidateIndex,
  candidateStatus,
  reviewedBy,
  status,
  equipmentItemId,
  duplicateOfItemId,
  trainerCorrection = {},
}) {
  const sessionId = toPositiveInteger(reviewSessionId);
  const normalizedCandidateIndex = toCandidateIndex(candidateIndex);
  const linkedEquipmentItemId = toPositiveInteger(equipmentItemId);
  const linkedDuplicateOfItemId = toPositiveInteger(duplicateOfItemId);

  if (
    !profileId
    || !sessionId
    || normalizedCandidateIndex === null
    || !reviewedBy
    || !VALID_OUTCOMES.has(status)
    || !VALID_CANDIDATE_STATUSES.has(candidateStatus)
  ) {
    return null;
  }

  try {
    const { EquipmentScanCandidate, EquipmentScanSession } = getModels(models) || {};
    if (!EquipmentScanCandidate) return null;

    const candidate = await EquipmentScanCandidate.findOne({
      where: {
        sessionId,
        profileId,
        candidateIndex: normalizedCandidateIndex,
        status: candidateStatus,
      },
      order: [['createdAt', 'DESC']],
    });
    if (!candidate) return null;

    return await applyCandidateReview({
      candidate,
      EquipmentScanSession,
      now,
      status,
      reviewedBy,
      trainerCorrection,
      equipmentItemId: linkedEquipmentItemId,
      duplicateOfItemId: linkedDuplicateOfItemId,
    });
  } catch (error) {
    logger.warn('[EquipmentScanReviewOutcome] Failed to record scan candidate action outcome (non-fatal)', {
      error: error.message,
      profileId,
      reviewSessionId: sessionId,
      candidateIndex: normalizedCandidateIndex,
      candidateStatus,
      reviewedBy,
      equipmentItemId: linkedEquipmentItemId,
      duplicateOfItemId: linkedDuplicateOfItemId,
    });
    return null;
  }
}