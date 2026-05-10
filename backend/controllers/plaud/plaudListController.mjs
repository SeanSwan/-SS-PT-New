/**
 * plaudListController.mjs
 * ========================
 * Handlers for:
 *   GET    /api/plaud/clips?limit=20&cursor=...   — list pending clips
 *   DELETE /api/plaud/clips/:clipId               — soft-delete a clip
 *
 * Phase 3 Slice 3.5 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.2 + §5.3.
 *
 * List endpoint is DB-authoritative (NOT disk listing) — survives Render
 * restart. Cursor format: base64(uploadedAt|clipId).
 */
import sequelize from '../../database.mjs';
import {
  ClipNotFoundError,
  deleteClip,
  readClip,
} from '../../services/plaudClipStorageDualTier.mjs';
import { PLAUD_UUID_REGEX } from '../../utils/plaudUuidRegex.mjs';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const READY_FOR_PLAYBACK = new Set(['pending_merge', 'merged']);
const AUDIO_MIME_PATTERN = /^audio\/[a-z0-9.+-]+$/i;

function jsonError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

function encodeCursor(uploadedAt, clipId) {
  return Buffer.from(`${uploadedAt}|${clipId}`, 'utf8').toString('base64url');
}

function isPlaybackReady(status) {
  return READY_FOR_PLAYBACK.has(status);
}

function playbackPathFor(clipId) {
  return `/api/plaud/clips/${clipId}/audio`;
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(String(cursor), 'base64url').toString('utf8');
    const [uploadedAt, clipId] = decoded.split('|');
    if (!uploadedAt || !clipId) return null;
    if (!PLAUD_UUID_REGEX.test(clipId)) return null;
    if (Number.isNaN(Date.parse(uploadedAt))) return null;
    return { uploadedAt, clipId };
  } catch {
    return null;
  }
}

export async function listHandler(req, res) {
  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
    });
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
  const cursor = decodeCursor(req.query.cursor);

  const replacements = { userId, limit: limit + 1 }; // fetch one extra to detect hasMore
  let cursorClause = '';
  if (cursor) {
    cursorClause = 'AND (uploaded_at, clip_id) < (:cursorUploadedAt, :cursorClipId)';
    replacements.cursorUploadedAt = cursor.uploadedAt;
    replacements.cursorClipId = cursor.clipId;
  }

  const [rows] = await sequelize.query(
    `SELECT clip_id, filename_original, mimetype, size_bytes, duration_sec,
            r2_mirror_status, status, uploaded_at, expires_at
     FROM plaud_clips
     WHERE user_id = :userId
       AND status NOT IN ('deleted', 'expired', 'lost')
       AND deleted_at IS NULL
       ${cursorClause}
     ORDER BY uploaded_at DESC, clip_id DESC
     LIMIT :limit`,
    { replacements },
  );

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && slice.length > 0
    ? encodeCursor(slice[slice.length - 1].uploaded_at, slice[slice.length - 1].clip_id)
    : null;

  return res.status(200).json({
    success: true,
    clips: slice.map((r) => ({
      clipId: r.clip_id,
      filename: r.filename_original,
      mimetype: r.mimetype,
      size: r.size_bytes,
      durationSec: r.duration_sec ? Number(r.duration_sec) : null,
      r2MirrorStatus: r.r2_mirror_status,
      status: r.status,
      uploadedAt: r.uploaded_at,
      expiresAt: r.expires_at,
      playbackReady: isPlaybackReady(r.status),
      playbackPath: playbackPathFor(r.clip_id),
    })),
    nextCursor,
    hasMore,
  });
}

export async function audioHandler(req, res) {
  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
  }

  const clipId = String(req.params.clipId || '');
  if (!PLAUD_UUID_REGEX.test(clipId)) {
    return jsonError(res, 400, 'INVALID_CLIP_ID', 'Invalid clipId format');
  }

  const [rows] = await sequelize.query(
    `SELECT clip_id, storage_ext, mimetype, r2_key, r2_mirror_status, status
     FROM plaud_clips
     WHERE clip_id = :clipId
       AND user_id = :userId
       AND deleted_at IS NULL
     LIMIT 1`,
    { replacements: { userId, clipId } },
  );

  const row = rows?.[0];
  if (!row) {
    return jsonError(res, 404, 'CLIP_NOT_FOUND', 'Clip not found');
  }
  if (!isPlaybackReady(row.status)) {
    return jsonError(res, 409, 'CLIP_NOT_READY', 'Clip audio is still processing');
  }
  if (!AUDIO_MIME_PATTERN.test(row.mimetype)) {
    return jsonError(res, 415, 'UNSUPPORTED_AUDIO_TYPE', 'Clip audio format is not supported');
  }

  let buffer;
  try {
    buffer = await readClip(userId, row.clip_id, row.storage_ext, {
      fallbackR2Key: row.r2_key,
      skipR2Fallback: !row.r2_key && row.r2_mirror_status !== 'mirrored',
      requireDiskRestore: false,
    });
  } catch (err) {
    if (err instanceof ClipNotFoundError || err?.code === 'CLIP_NOT_FOUND') {
      return jsonError(res, 404, 'CLIP_AUDIO_NOT_FOUND', 'Clip audio could not be found');
    }
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Failed to read clip audio');
  }

  res.set({
    'Content-Type': row.mimetype,
    'Content-Length': String(buffer.length),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `inline; filename="plaud-clip-${row.clip_id}.${row.storage_ext}"`,
  });
  return res.status(200).send(buffer);
}

export async function deleteHandler(req, res) {
  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
    });
  }

  const clipId = String(req.params.clipId || '');
  if (!PLAUD_UUID_REGEX.test(clipId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CLIP_ID', message: 'Invalid clipId format' },
    });
  }

  // Soft-delete and return current row (or 404)
  const [rows] = await sequelize.query(
    `UPDATE plaud_clips
     SET status     = 'deleted',
         deleted_at = NOW(),
         updated_at = NOW()
     WHERE clip_id = :clipId
       AND user_id = :userId
       AND deleted_at IS NULL
     RETURNING clip_id, storage_ext, r2_key`,
    { replacements: { userId, clipId } },
  );
  if (!rows || rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: { code: 'CLIP_NOT_FOUND', message: 'Clip not found or already deleted' },
    });
  }
  const row = rows[0];

  // Best-effort disk + R2 cleanup; errors logged not raised
  await deleteClip(userId, row.clip_id, row.storage_ext, { r2Key: row.r2_key });

  return res.status(200).json({ success: true });
}

export const _internal = {
  encodeCursor,
  decodeCursor,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  isPlaybackReady,
  playbackPathFor,
};
