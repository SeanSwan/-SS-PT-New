/**
 * Equipment Scan Review Persistence
 * =================================
 * Best-effort durable ledger for V2 multi-item scan sessions and candidates.
 * Scanner responses stay backward-compatible even if the ledger table has not
 * been migrated yet.
 */
import {
  getEquipmentScanCandidate,
  getEquipmentScanSession,
} from '../models/index.mjs';
import appLogger from '../utils/logger.mjs';

const CANDIDATE_FIELD_LIMITS = {
  suggestedName: 150,
  suggestedCategory: 50,
  resistanceType: 30,
  visibility: 30,
  dedupeKey: 180,
  matchType: 40,
};

const cleanString = (value, maxLength) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null
);

const count = (value) => (Array.isArray(value) ? value.length : 0);

function getModels(models) {
  if (models) return models;
  return {
    EquipmentScanSession: getEquipmentScanSession(),
    EquipmentScanCandidate: getEquipmentScanCandidate(),
  };
}

function candidateRow({ sessionId, profileId, status, candidateIndex, candidate, itemId, duplicateOfItemId, matchType }) {
  return {
    sessionId,
    profileId,
    equipmentItemId: itemId ?? null,
    duplicateOfItemId: duplicateOfItemId ?? null,
    candidateIndex,
    status,
    suggestedName: cleanString(candidate?.suggestedName || candidate?.name, CANDIDATE_FIELD_LIMITS.suggestedName) || 'Unknown Equipment',
    suggestedCategory: cleanString(candidate?.suggestedCategory || candidate?.category, CANDIDATE_FIELD_LIMITS.suggestedCategory),
    resistanceType: cleanString(candidate?.resistanceType, CANDIDATE_FIELD_LIMITS.resistanceType),
    confidence: typeof candidate?.confidence === 'number' ? candidate.confidence : null,
    visibility: cleanString(candidate?.visibility, CANDIDATE_FIELD_LIMITS.visibility),
    quantity: Number.isFinite(Number(candidate?.quantity)) ? Math.max(1, Math.trunc(Number(candidate.quantity))) : null,
    boundingBox: candidate?.boundingBox || null,
    dedupeKey: cleanString(candidate?.dedupeKey, CANDIDATE_FIELD_LIMITS.dedupeKey),
    matchType: cleanString(matchType || candidate?.matchType, CANDIDATE_FIELD_LIMITS.matchType),
    candidateData: candidate || null,
  };
}

export async function persistEquipmentScanReviewSession({
  models,
  logger = appLogger,
  profile,
  trainerId,
  photoUrl,
  scanSession,
  createdCandidateRecords = [],
  duplicateCandidates = [],
}) {
  if (!profile?.id || !trainerId || !scanSession) return null;

  let session = null;

  try {
    const resolvedModels = getModels(models);
    const EquipmentScanSession = resolvedModels?.EquipmentScanSession;
    const EquipmentScanCandidate = resolvedModels?.EquipmentScanCandidate;
    if (!EquipmentScanSession || !EquipmentScanCandidate) return null;

    const possibleItems = Array.isArray(scanSession.possibleItems) ? scanSession.possibleItems : [];
    const candidateCount = count(scanSession.candidates)
      || createdCandidateRecords.length + duplicateCandidates.length + possibleItems.length;
    session = await EquipmentScanSession.create({
      profileId: profile.id,
      trainerId,
      photoUrl: photoUrl || null,
      schemaVersion: cleanString(scanSession.schemaVersion, 80),
      promptVersion: cleanString(scanSession.promptVersion, 120),
      imageQuality: cleanString(scanSession.imageQuality, 30),
      sceneSummary: cleanString(scanSession.sceneSummary, 1000),
      model: cleanString(scanSession.model, 120),
      latencyMs: Number.isFinite(Number(scanSession.latencyMs)) ? Math.trunc(Number(scanSession.latencyMs)) : null,
      candidateCount,
      reviewableCount: count(scanSession.items),
      possibleItemCount: possibleItems.length,
      duplicateCount: duplicateCandidates.length,
      createdItemCount: createdCandidateRecords.length,
      status: 'pending_review',
      rawResponse: scanSession.rawResponse || null,
    });

    const rows = [
      ...createdCandidateRecords.map((record, index) => candidateRow({
        sessionId: session.id,
        profileId: profile.id,
        status: 'created_item',
        candidateIndex: Number.isInteger(record.candidateIndex) ? record.candidateIndex : index,
        candidate: record.candidate,
        itemId: record.itemId,
      })),
      ...duplicateCandidates.map((candidate, index) => candidateRow({
        sessionId: session.id,
        profileId: profile.id,
        status: 'duplicate',
        candidateIndex: Number.isInteger(candidate.candidateIndex)
          ? candidate.candidateIndex
          : createdCandidateRecords.length + index,
        candidate,
        duplicateOfItemId: candidate.duplicateOfItemId,
        matchType: candidate.matchType,
      })),
      ...possibleItems.map((candidate, index) => candidateRow({
        sessionId: session.id,
        profileId: profile.id,
        status: 'possible',
        candidateIndex: Number.isInteger(candidate.candidateIndex)
          ? candidate.candidateIndex
          : createdCandidateRecords.length + duplicateCandidates.length + index,
        candidate,
      })),
    ];

    if (rows.length > 0) {
      await EquipmentScanCandidate.bulkCreate(rows);
    }

    return { sessionId: session.id, candidateRecordCount: rows.length };
  } catch (error) {
    if (session?.update) {
      try {
        await session.update({ status: 'failed' });
      } catch (statusError) {
        logger.warn('[EquipmentScanReviewPersistence] Failed to mark scan review session failed (non-fatal)', {
          error: statusError.message,
          sessionId: session.id,
          profileId: profile?.id,
          trainerId,
        });
      }
    }
    logger.warn('[EquipmentScanReviewPersistence] Failed to persist scan review ledger (non-fatal)', {
      error: error.message,
      profileId: profile?.id,
      trainerId,
    });
    return null;
  }
}