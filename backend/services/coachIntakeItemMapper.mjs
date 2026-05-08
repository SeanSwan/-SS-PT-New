/**
 * coachIntakeItemMapper.mjs
 * =========================
 * Maps Coach intake table rows into the shared Coach/PLAUD queue contract.
 */
import { audioPuzzleSummaryForQueue } from './coachAudioPuzzleService.mjs';
import { COACH_ARCHIVED_STATUSES } from './coachIntakeConstants.mjs';

export function isCoachIntakeSameLocalDay(value, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === now.toDateString();
}

function queueStatusForCoach(status) {
  if (status === 'READY_FOR_REVIEW') return 'ready_review';
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

export function mapCoachRowToIntakeItem(row) {
  const status = row.status || 'RECEIVED';
  const queueStatus = queueStatusForCoach(status);
  const clientId = row.resolved_client_id == null ? null : Number(row.resolved_client_id);
  const metadata = row.metadata_json || {};
  const audioPuzzle = audioPuzzleSummaryForQueue({ sourceType: row.source_type, metadata });
  const latestProposal = mapLatestProposal(row, metadata);

  return {
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
    audioPuzzle,
    ...latestProposal,
  };
}

export function summarizeUnifiedItems(items, { now = new Date() } = {}) {
  return items.reduce((summary, item) => {
    summary.total += 1;
    if (item.queueStatus !== 'archived') summary.actionable += 1;
    if (item.queueStatus === 'unprocessed') summary.unprocessed += 1;
    if (item.queueStatus === 'processing') summary.processing += 1;
    if (item.queueStatus === 'ready_review') summary.readyReview += 1;
    if (item.queueStatus === 'failed') summary.failed += 1;
    if (item.needsClient) summary.needsClient += 1;
    if (isCoachIntakeSameLocalDay(item.createdAt, now)) summary.today += 1;
    return summary;
  }, {
    total: 0,
    actionable: 0,
    today: 0,
    unprocessed: 0,
    processing: 0,
    readyReview: 0,
    failed: 0,
    needsClient: 0,
  });
}
