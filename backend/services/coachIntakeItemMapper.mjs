/**
 * coachIntakeItemMapper.mjs
 * =========================
 * Maps Coach intake table rows into the shared Coach/PLAUD queue contract.
 */
import { audioPuzzleSummaryForQueue } from './coachAudioPuzzleService.mjs';
import { COACH_ARCHIVED_STATUSES } from './coachIntakeConstants.mjs';
import { coachIntakeGateSummary } from './ai/coachIntakeGateSummary.mjs';

export function isCoachIntakeSameLocalDay(value, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === now.toDateString();
}

function queueStatusForCoach(status) {
  if (status === 'READY_FOR_REVIEW') return 'ready_review';
  if (status === 'NEEDS_CLARIFICATION') return 'needs_clarification';
  if (status === 'DUPLICATE_HOLD') return 'duplicate_hold';
  if (status === 'TRANSCRIBING') return 'processing';
  if (status === 'FAILED') return 'failed';
  if (COACH_ARCHIVED_STATUSES.has(status)) return 'archived';
  return 'unprocessed';
}

function sourceLabel(sourceType) {
  const labels = {
    voice_note: 'Coach voice note',
    plaud_clip: 'PLAUD clip',
    audio_upload: 'Audio upload',
    transcript_file: 'Transcript file',
    pdf_transcript: 'PDF transcript',
    typed_note: 'Typed note',
    chat_narrative: 'Long Coach note',
  };
  return labels[sourceType] || 'Coach intake';
}

function mapLatestProposal(row, metadata) {
  const stored = metadata.latestProposal &&
    typeof metadata.latestProposal === 'object' &&
    !Array.isArray(metadata.latestProposal)
    ? metadata.latestProposal
    : {};
  const id = row.latest_proposal_id || stored.id || null;
  if (!id) return { latestProposalId: null, latestProposal: null };
  return {
    latestProposalId: id,
    latestProposal: {
      id,
      type: stored.type || null,
      status: stored.status || null,
      title: stored.title || null,
      createdAt: stored.createdAt || null,
    },
  };
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function boundedString(value, maxLength = 160) {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return clean.slice(0, maxLength);
}

function safeDetailString(value) {
  const clean = boundedString(value);
  if (!clean) return null;
  if (/@/.test(clean)) return null;
  if (/\b\d{7,}\b/.test(clean)) return null;
  return clean;
}

function confidenceBand(rawValue) {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return 'unknown';
  if (numeric >= 0.85) return 'high';
  if (numeric >= 0.55) return 'medium';
  return 'low';
}

function positiveCount(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric > 0) return numeric;
  }
  return null;
}

function mapHoldReason({ status, metadata, resolver, duplicateScan }) {
  const stored = plainObject(metadata.holdReason);
  if (status === 'NEEDS_CLARIFICATION') {
    const candidateCount = positiveCount(resolver.candidateCount, resolver.candidates?.length);
    return {
      label: candidateCount ? 'Client confirmation needed' : 'Clarification required',
      detail: safeDetailString(stored.safeDetail) || 'Coach needs one answer before this intake can move to draft review.',
      candidateCount,
      duplicateCount: null,
      confidenceBand: confidenceBand(resolver.topConfidence ?? resolver.confidence),
      nextAction: 'Answer Coach clarification',
    };
  }
  if (status === 'DUPLICATE_HOLD') {
    const duplicateCount = positiveCount(duplicateScan.duplicateCount, duplicateScan.matches?.length);
    return {
      label: 'Possible duplicate workout',
      detail: safeDetailString(stored.safeDetail) || safeDetailString(duplicateScan.safeReason) || 'Compare this intake with existing logs before approving.',
      candidateCount: null,
      duplicateCount,
      confidenceBand: confidenceBand(duplicateScan.topScore ?? duplicateScan.score),
      nextAction: 'Review duplicate risk',
    };
  }
  return null;
}

function latestProposalStatusFor(item) {
  if (!item?.latestProposalId && !item?.latestProposal?.id) return null;
  const status = String(item.latestProposal?.status || '').trim().toUpperCase();
  return status || 'UNKNOWN';
}

function countLatestProposal(summary, item) {
  const status = latestProposalStatusFor(item);
  if (!status) return;
  summary.preparedDrafts += 1;
  if (status === 'PENDING') summary.pendingDrafts += 1;
  if (status === 'APPLYING') summary.applyingDrafts += 1;
  if (status === 'APPROVED') summary.approvedDrafts += 1;
  if (status === 'APPLIED') summary.appliedDrafts += 1;
  if (status === 'REJECTED') summary.rejectedDrafts += 1;
  if (status === 'FAILED') summary.failedDrafts += 1;
}

export function mapCoachRowToIntakeItem(row) {
  const status = row.status || 'RECEIVED';
  const queueStatus = queueStatusForCoach(status);
  const clientId = row.resolved_client_id == null ? null : Number(row.resolved_client_id);
  const metadata = row.metadata_json || {};
  const resolver = plainObject(row.resolver_json);
  const duplicateScan = plainObject(row.duplicate_scan_json);
  const audioPuzzle = audioPuzzleSummaryForQueue({ sourceType: row.source_type, metadata });
  const latestProposal = mapLatestProposal(row, metadata);
  const holdReason = mapHoldReason({ status, metadata, resolver, duplicateScan });

  const item = {
    id: `coach:${row.id}`,
    entityId: row.id,
    kind: 'coach_intake',
    source: row.source_type,
    sourceLabel: sourceLabel(row.source_type),
    queueStatus,
    title: sourceLabel(row.source_type),
    clientId,
    clientName: null,
    needsClient: clientId == null,
    clipCount: null,
    parsedExerciseCount: null,
    canReview: status === 'READY_FOR_REVIEW',
    errorCode: row.error_code || null,
    status,
    createdAt: row.created_at,
    timelineAt: row.recorded_at_start || row.uploaded_at || row.created_at,
    timelineAtSource: row.recorded_at_start ? 'recorded_at' : 'uploaded_at',
    recordedAt: row.recorded_at_start,
    completedAt: null,
    expiresAt: null,
    durationSec: null,
    sizeBytes: null,
    metadata: {
      charCount: Number(metadata.charCount || 0),
      wordCount: Number(metadata.wordCount || 0),
    },
    holdReason,
    audioPuzzle,
    ...latestProposal,
  };
  return {
    ...item,
    ...coachIntakeGateSummary(item),
  };
}

export function summarizeUnifiedItems(items, { now = new Date() } = {}) {
  return items.reduce((summary, item) => {
    summary.total += 1;
    if (item.queueStatus !== 'archived') summary.actionable += 1;
    if (item.queueStatus === 'unprocessed') summary.unprocessed += 1;
    if (item.queueStatus === 'processing') summary.processing += 1;
    if (item.queueStatus === 'ready_review') summary.readyReview += 1;
    if (item.queueStatus === 'needs_clarification') summary.needsClarification += 1;
    if (item.queueStatus === 'duplicate_hold') summary.duplicateHold += 1;
    if (item.queueStatus === 'failed') summary.failed += 1;
    if (item.needsClient) summary.needsClient += 1;
    if (isCoachIntakeSameLocalDay(item.createdAt, now)) summary.today += 1;
    countLatestProposal(summary, item);
    return summary;
  }, {
    total: 0,
    actionable: 0,
    today: 0,
    unprocessed: 0,
    processing: 0,
    readyReview: 0,
    needsClarification: 0,
    duplicateHold: 0,
    failed: 0,
    needsClient: 0,
    preparedDrafts: 0,
    pendingDrafts: 0,
    applyingDrafts: 0,
    approvedDrafts: 0,
    appliedDrafts: 0,
    rejectedDrafts: 0,
    failedDrafts: 0,
  });
}
