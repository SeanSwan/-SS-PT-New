/**
 * plaudIntakeQueueService.mjs
 * ============================
 * Unified PLAUD intake read model. Combines existing clip rows and merge
 * request rows into one list-safe queue DTO for the Training workspace.
 *
 * This service intentionally does not decrypt merge payloads. Transcript and
 * parsed workout bodies stay behind the single-item detail endpoint.
 */
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 75;
const CLIP_STATUSES = ['uploading', 'pending_merge', 'lost', 'expired'];
const MERGE_STATUSES = ['processing', 'completed', 'failed', 'approved', 'discarded', 'expired'];
const ARCHIVED_MERGE_STATUSES = new Set(['approved', 'discarded']);
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

function normalizeLimit(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function normalizeScope(raw) {
  const scope = String(raw || 'actionable').trim();
  return VALID_SCOPES.has(scope) ? scope : 'actionable';
}

function joinClientName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ') || null;
}

function parseClipIds(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isSameLocalDay(value, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === now.toDateString();
}

function queueStatusForClip(status) {
  if (status === 'pending_merge') return 'unprocessed';
  if (status === 'uploading') return 'processing';
  if (status === 'lost' || status === 'expired') return 'failed';
  return 'archived';
}

function queueStatusForMerge(row) {
  if (row.status === 'approved' || row.status === 'discarded') return 'archived';
  if (row.status === 'completed' && row.has_cipher && !row.cipher_purged) return 'ready_review';
  if (row.status === 'processing') return 'processing';
  if (row.status === 'failed' || row.status === 'expired' || row.cipher_purged) return 'failed';
  return 'archived';
}

export function mapClipRowToIntakeItem(row) {
  const source = CLIP_SOURCE_LABELS[row.clip_source] ? row.clip_source : 'manual_upload';
  const queueStatus = queueStatusForClip(row.status);
  const clientId = row.client_id == null ? null : Number(row.client_id);

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
    errorCode: queueStatus === 'failed' ? row.status : null,
    status: row.status,
    createdAt: row.uploaded_at,
    timelineAt: row.recorded_at || row.uploaded_at,
    timelineAtSource: row.recorded_at ? 'recorded_at' : 'uploaded_at',
    recordedAt: row.recorded_at || null,
    completedAt: null,
    expiresAt: row.expires_at,
    durationSec: row.duration_sec == null ? null : Number(row.duration_sec),
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    mirrorStatus: row.r2_mirror_status || null,
  };
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
    title: `${clipIds.length || 'Multi'} clip merge`,
    clientId: Number(row.client_id),
    clientName: joinClientName(row.client_first_name, row.client_last_name),
    needsClient: false,
    clipCount: clipIds.length || null,
    parsedExerciseCount: row.parsed_exercise_count == null ? null : Number(row.parsed_exercise_count),
    canReview: row.status === 'completed' && !!row.has_cipher && !row.cipher_purged,
    errorCode: row.error_code || null,
    status: row.status,
    createdAt: row.created_at,
    timelineAt: row.created_at,
    timelineAtSource: 'created_at',
    recordedAt: null,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
    boundaryWarning: row.boundary_warning || null,
    cipherPurged: !!row.cipher_purged,
  };
}

export function summarizeIntakeItems(items, { now = new Date() } = {}) {
  return items.reduce((summary, item) => {
    summary.total += 1;
    if (item.queueStatus !== 'archived') summary.actionable += 1;
    if (item.queueStatus === 'unprocessed') summary.unprocessed += 1;
    if (item.queueStatus === 'processing') summary.processing += 1;
    if (item.queueStatus === 'ready_review') summary.readyReview += 1;
    if (item.queueStatus === 'failed') summary.failed += 1;
    if (item.needsClient) summary.needsClient += 1;
    if (isSameLocalDay(item.createdAt, now)) summary.today += 1;
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

function filterByScope(items, scope) {
  if (scope === 'all') return items;
  if (scope === 'actionable') return items.filter((item) => item.queueStatus !== 'archived');
  if (scope === 'today') return items.filter((item) => isSameLocalDay(item.createdAt));
  if (scope === 'needs_client') return items.filter((item) => item.needsClient);
  return items.filter((item) => item.queueStatus === scope);
}

export async function listPlaudIntakeItems({
  userId,
  scope,
  limit,
  sequelizeOverride = null,
} = {}) {
  const normalizedLimit = normalizeLimit(limit);
  const normalizedScope = normalizeScope(scope);
  const sequelizeToUse = sequelizeOverride || sequelize;
  const queryLimit = normalizedLimit * 2;
  const mergeStatuses = normalizedScope === 'all'
    ? MERGE_STATUSES
    : MERGE_STATUSES.filter((status) => !ARCHIVED_MERGE_STATUSES.has(status));

  const clipRows = await sequelizeToUse.query(
    `SELECT c.clip_id, c.filename_original, c.mimetype, c.size_bytes,
            c.duration_sec, c.r2_mirror_status, c.status, c.uploaded_at,
            c.recorded_at, c.expires_at, c.client_id, c.clip_source,
            u."firstName" AS client_first_name,
            u."lastName" AS client_last_name
     FROM plaud_clips c
     LEFT JOIN "Users" u ON u.id = c.client_id
     WHERE c.user_id = :userId
       AND c.deleted_at IS NULL
       AND c.status IN (:clipStatuses)
     ORDER BY c.uploaded_at DESC, c.clip_id DESC
     LIMIT :queryLimit`,
    {
      replacements: { userId, clipStatuses: CLIP_STATUSES, queryLimit },
      type: QueryTypes.SELECT,
    },
  );

  const mergeRows = await sequelizeToUse.query(
    `SELECT mr.merge_request_id, mr.status, mr.client_id, mr.clip_ids,
            mr.parsed_exercise_count, mr.boundary_warning, mr.error_code,
            mr.payload_cipher IS NOT NULL AS has_cipher,
            mr.cipher_purged_at IS NOT NULL AS cipher_purged,
            mr.created_at, mr.completed_at, mr.expires_at,
            u."firstName" AS client_first_name,
            u."lastName" AS client_last_name
     FROM plaud_merge_requests mr
     LEFT JOIN "Users" u ON u.id = mr.client_id
     WHERE mr.user_id = :userId
       AND mr.status IN (:mergeStatuses)
     ORDER BY mr.created_at DESC
     LIMIT :queryLimit`,
    {
      replacements: { userId, mergeStatuses, queryLimit },
      type: QueryTypes.SELECT,
    },
  );

  const allItems = [
    ...clipRows.map(mapClipRowToIntakeItem),
    ...mergeRows.map(mapMergeRowToIntakeItem),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const scopedItems = filterByScope(allItems, normalizedScope).slice(0, normalizedLimit);
  return {
    items: scopedItems,
    summary: summarizeIntakeItems(allItems),
    scope: normalizedScope,
    limit: normalizedLimit,
  };
}

export const _internal = {
  normalizeLimit,
  normalizeScope,
  queueStatusForClip,
  queueStatusForMerge,
};
