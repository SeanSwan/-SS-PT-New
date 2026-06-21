/**
 * FILE: plaudUploadIdempotencyService.mjs
 * PURPOSE: Source-scoped idempotency helpers for PLAUD clip uploads.
 */
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

const UPLOAD_SAFE_CLIP_SOURCES = new Set(['manual_upload', 'applaud_local_sync', 'plaud_official_sync']);
const EXTERNAL_ID_REGEX = /^[A-Za-z0-9._:-]{1,255}$/;
const READY_FOR_PLAYBACK = new Set(['pending_merge', 'merged']);

export function normalizeClipSource(value) {
  const source = typeof value === 'string' ? value.trim() : '';
  return UPLOAD_SAFE_CLIP_SOURCES.has(source) ? source : 'manual_upload';
}

export function normalizeClipExternalId(value) {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return EXTERNAL_ID_REGEX.test(id) ? id : null;
}

export async function findExistingClip({ userId, clipSource, clipExternalId }) {
  if (!clipExternalId) return null;
  const rows = await sequelize.query(
    `SELECT clip_id AS "clipId",
            filename_original AS "filename",
            mimetype,
            size_bytes AS "size",
            duration_sec AS "durationSec",
            recorded_at AS "recordedAt",
            clip_source AS "clipSource",
            clip_external_id AS "clipExternalId",
            uploaded_at AS "uploadedAt",
            expires_at AS "expiresAt",
            r2_mirror_status AS "r2MirrorStatus",
            status
       FROM plaud_clips
      WHERE user_id = :userId
        AND clip_source = :clipSource
        AND clip_external_id = :clipExternalId
        AND deleted_at IS NULL
      LIMIT 1`,
    { replacements: { userId, clipSource, clipExternalId }, type: QueryTypes.SELECT },
  );
  return rows[0] || null;
}

export async function deleteLostExternalClip(row) {
  if (!row || row.status !== 'lost') return false;
  await sequelize.query(
    `DELETE FROM plaud_clips
      WHERE clip_id = :clipId AND status = 'lost'`,
    { replacements: { clipId: row.clipId }, type: QueryTypes.DELETE },
  );
  return true;
}

function isExistingClipPlaybackReady(row) {
  return READY_FOR_PLAYBACK.has(row.status) && row.r2MirrorStatus !== 'failed_terminal';
}

export function acceptedFromExisting(row, file) {
  const playbackReady = isExistingClipPlaybackReady(row);
  return {
    clipId: row.clipId,
    filename: row.filename || file.originalname,
    size: Number(row.size || file.size || 0),
    mimetype: row.mimetype || file.mimetype,
    durationSec: row.durationSec == null ? null : Number(row.durationSec),
    recordedAt: row.recordedAt,
    clipSource: row.clipSource,
    clipExternalId: row.clipExternalId,
    uploadedAt: row.uploadedAt,
    expiresAt: row.expiresAt,
    r2MirrorStatus: row.r2MirrorStatus,
    status: row.status,
    duplicate: true,
    playbackReady,
    playbackPath: playbackReady ? `/api/plaud/clips/${row.clipId}/audio` : null,
  };
}
