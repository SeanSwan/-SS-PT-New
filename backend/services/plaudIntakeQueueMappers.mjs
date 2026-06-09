/**
 * plaudIntakeQueueMappers.mjs
 * Pure list-safe mappers, counters, and filters for the PLAUD intake queue.
 *
 * This module intentionally does not query or decrypt transcript payloads.
 * It only shapes metadata already selected by plaudIntakeQueueService.mjs.
 */
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 75;
const MERGE_STATUSES = ['processing', 'completed', 'failed', 'approved', 'discarded', 'expired'];
const ARCHIVED_MERGE_STATUSES = new Set(['approved', 'discarded']);
const READY_FOR_PLAYBACK = new Set(['pending_merge', 'merged']);
const FAILED_CLIP_STATUSES = new Set(['lost', 'expired']);
const FAILED_MERGE_STATUSES = new Set(['failed', 'expired']);
const CLIP_QUEUE_STATUS_BY_STATUS = {
  pending_merge: 'unprocessed',
  uploading: 'processing',
};
const MERGE_QUEUE_STATUS_BY_STATUS = {
  processing: 'processing',
};
const SUMMARY_COUNTER_BY_STATUS = {
  failed: 'failed',
  processing: 'processing',
  ready_review: 'readyReview',
  unprocessed: 'unprocessed',
};
const VALID_SCOPES = new Set([
  'actionable',
  'all',
  'today',
  'unprocessed',
  'processing',
  'ready_review',
  'failed',
  'needs_client',
]);
const CLIP_SOURCE_LABELS = {
  manual_upload: 'Manual upload',
  applaud_webhook: 'Applaud',
  applaud_local_sync: 'APPLAUD sync',
};

export const CLIP_STATUSES = ['uploading', 'pending_merge', 'lost', 'expired'];

export function normalizeLimit(raw) {
  return clampPositiveInteger(raw, DEFAULT_LIMIT, MAX_LIMIT);
}

export function normalizeScope(raw) {
  const scope = String(raw || 'actionable').trim();
  return VALID_SCOPES.has(scope) ? scope : 'actionable';
}

export function mergeStatusesForScope(scope) {
  return scope === 'all'
    ? MERGE_STATUSES
    : MERGE_STATUSES.filter((status) => !ARCHIVED_MERGE_STATUSES.has(status));
}

function joinClientName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ') || null;
}

function clampPositiveInteger(raw, fallback, max) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, parsed));
}

function maybeNumber(value) {
  return value == null ? null : Number(value);
}

function firstPresent(...values) {
  return values.find((value) => value) || null;
}

function parseJsonArray(raw) {
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseClipIds(raw) {
  if (Array.isArray(raw)) return raw;
  return parseJsonArray(raw);
}

function isCreatedToday(value, now = new Date()) {
  const timestamp = Date.parse(String(value || ''));
  return Number.isNaN(timestamp)
    ? false
    : new Date(timestamp).toDateString() === now.toDateString();
}

function queueStatusForClip(status) {
  if (FAILED_CLIP_STATUSES.has(status)) return 'failed';
  return CLIP_QUEUE_STATUS_BY_STATUS[status] || 'archived';
}

function queueStatusForMerge(row) {
  if (ARCHIVED_MERGE_STATUSES.has(row.status)) return 'archived';
  if (isReadyMergeRow(row)) return 'ready_review';
  if (isFailedMergeRow(row)) return 'failed';
  return MERGE_QUEUE_STATUS_BY_STATUS[row.status] || 'archived';
}

function isReadyMergeRow(row) {
  return row.status === 'completed' && Boolean(row.has_cipher) && !row.cipher_purged;
}

function isFailedMergeRow(row) {
  return FAILED_MERGE_STATUSES.has(row.status) || Boolean(row.cipher_purged);
}

function isAudioLoadAvailable(row) {
  return READY_FOR_PLAYBACK.has(row.status) && row.r2_mirror_status !== 'failed_terminal';
}

function playbackPathFor(clipId) {
  return `/api/plaud/clips/${clipId}/audio`;
}

function sourceForClip(row) {
  return CLIP_SOURCE_LABELS[row.clip_source] ? row.clip_source : 'manual_upload';
}

function clipTimelineSource(row) {
  return row.recorded_at ? 'recorded_at' : 'uploaded_at';
}

function failedClipErrorCode(row, queueStatus) {
  return queueStatus === 'failed' ? row.status : null;
}

function playbackPathIfReady(row, playbackReady) {
  return playbackReady ? playbackPathFor(row.clip_id) : null;
}

export function mapClipRowToIntakeItem(row) {
  const source = sourceForClip(row);
  const queueStatus = queueStatusForClip(row.status);
  const clientId = maybeNumber(row.client_id);
  const playbackReady = isAudioLoadAvailable(row);
  const timelineAt = firstPresent(row.recorded_at, row.uploaded_at);

  return {
    id: `clip:${row.clip_id}`,
    entityId: row.clip_id,
    kind: 'clip',
    source,
    sourceLabel: CLIP_SOURCE_LABELS[source],
    queueStatus,
    title: row.filename_original || 'Audio clip',
    clientId,
    clientName: joinClientName(row.client_first_name, row.client_last_name),
    needsClient: clientId == null,
    clipCount: 1,
    parsedExerciseCount: null,
    canReview: false,
    errorCode: failedClipErrorCode(row, queueStatus),
    status: row.status,
    createdAt: row.uploaded_at,
    timelineAt,
    timelineAtSource: clipTimelineSource(row),
    recordedAt: firstPresent(row.recorded_at),
    completedAt: null,
    expiresAt: row.expires_at,
    durationSec: maybeNumber(row.duration_sec),
    sizeBytes: maybeNumber(row.size_bytes),
    mirrorStatus: firstPresent(row.r2_mirror_status),
    r2MirrorStatus: firstPresent(row.r2_mirror_status),
    mimetype: firstPresent(row.mimetype),
    playbackReady,
    playbackPath: playbackPathIfReady(row, playbackReady),
  };
}

function clipCountOrNull(clipIds) {
  return clipIds.length || null;
}

function mergeTitle(clipIds) {
  return `${clipIds.length || 'Multi'} clip merge`;
}

export function mapMergeRowToIntakeItem(row) {
  const clipIds = parseClipIds(row.clip_ids);
  const queueStatus = queueStatusForMerge(row);
  return {
    id: `merge:${row.merge_request_id}`,
    entityId: row.merge_request_id,
    kind: 'merge_request',
    source: 'plaud_merge',
    sourceLabel: 'Merged review',
    queueStatus,
    title: mergeTitle(clipIds),
    clientId: Number(row.client_id),
    clientName: joinClientName(row.client_first_name, row.client_last_name),
    needsClient: false,
    clipCount: clipCountOrNull(clipIds),
    parsedExerciseCount: maybeNumber(row.parsed_exercise_count),
    canReview: isReadyMergeRow(row),
    errorCode: firstPresent(row.error_code),
    status: row.status,
    createdAt: row.created_at,
    timelineAt: row.created_at,
    timelineAtSource: 'created_at',
    recordedAt: null,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
    boundaryWarning: firstPresent(row.boundary_warning),
    cipherPurged: Boolean(row.cipher_purged),
  };
}

function emptySummary() {
  return {
    total: 0,
    actionable: 0,
    today: 0,
    unprocessed: 0,
    processing: 0,
    readyReview: 0,
    failed: 0,
    needsClient: 0,
  };
}

function addSummaryItem(summary, item, now) {
  [
    'total',
    actionableCounter(item),
    SUMMARY_COUNTER_BY_STATUS[item.queueStatus],
    needsClientCounter(item),
    todayCounter(item, now),
  ].forEach((counter) => incrementSummary(summary, counter));
}

function actionableCounter(item) {
  return item.queueStatus === 'archived' ? null : 'actionable';
}

function needsClientCounter(item) {
  return item.needsClient ? 'needsClient' : null;
}

function todayCounter(item, now) {
  return isCreatedToday(item.createdAt, now) ? 'today' : null;
}

function incrementSummary(summary, counter) {
  if (counter) summary[counter] += 1;
}

export function summarizeIntakeItems(items, { now = new Date() } = {}) {
  const summary = emptySummary();
  items.forEach((item) => addSummaryItem(summary, item, now));
  return summary;
}

const SCOPE_FILTERS = {
  actionable: (item) => item.queueStatus !== 'archived',
  all: () => true,
  needs_client: (item) => item.needsClient,
  today: (item) => isCreatedToday(item.createdAt),
};

export function filterByScope(items, scope) {
  const scopeFilter = SCOPE_FILTERS[scope] || ((item) => item.queueStatus === scope);
  return items.filter(scopeFilter);
}
