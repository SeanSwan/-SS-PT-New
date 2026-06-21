/**
 * plaudUploadController.mjs
 * ==========================
 * Handler for POST /api/plaud/clips/upload — multi-file PLAUD clip upload.
 *
 * Phase 3 Slice 3.5 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.1.
 *
 * Two-phase upload (Codex Round 3 HIGH #2 fix):
 *   Phase A: insert plaud_clips row with status='uploading' (no mirror_job)
 *   Phase B: write file to disk + fsync
 *   Phase C: transactionally flip status='pending_merge' + insert mirror_job
 *
 * Crash windows in any phase leave the row as 'uploading'; the stale-
 * uploading TTL cron (slice 3.9) reaps these to status='lost' after 5 min.
 *
 * Per-clip pipeline:
 *   1. ffprobe metadata + silent detection (audioProbeService)
 *   2. Reject CLIP_TOO_SILENT, CLIP_CORRUPT, UNSUPPORTED_AUDIO_TYPE
 *   3. Generate clipId UUID, compute disk path
 *   4. Phases A → B → C
 *
 * Failure-mode contract: a partial batch (some rejected) returns 200 with
 * `{ clips: [...], rejected: [...] }`. Full failure returns 5xx.
 */
import { randomUUID } from 'node:crypto';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import { writeFile, unlink, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeClipToDisk } from '../../services/plaudClipStorageDualTier.mjs';
import { probeFile, detectSilence, ClipCorruptError } from '../../services/audioProbeService.mjs';
import {
  ALLOWED_CODECS,
  ALLOWED_EXT,
  normalizeRecordedAt,
  pickExtFromMimetype,
  safeUploadRejectionMessage,
} from './plaudUploadValidation.mjs';
import {
  acceptedFromExisting,
  deleteLostExternalClip,
  findExistingClip,
  normalizeClipExternalId,
  normalizeClipSource,
} from '../../services/plaudUploadIdempotencyService.mjs';

export async function uploadHandler(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'NO_FILES', message: safeUploadRejectionMessage('NO_FILES') },
    });
  }

  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: safeUploadRejectionMessage('AUTH_REQUIRED') },
    });
  }

  const accepted = [];
  const rejected = [];
  const recordedAt = normalizeRecordedAt(req.body?.recordedAt);
  const clipSource = normalizeClipSource(req.body?.clipSource);
  const clipExternalId = clipSource === 'plaud_official_sync'
    ? normalizeClipExternalId(req.body?.clipExternalId)
    : null;

  if (clipSource === 'plaud_official_sync' && !clipExternalId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'OFFICIAL_SYNC_EXTERNAL_ID_REQUIRED',
        message: safeUploadRejectionMessage('OFFICIAL_SYNC_EXTERNAL_ID_REQUIRED'),
      },
    });
  }
  if (clipSource === 'plaud_official_sync' && req.files.length !== 1) {
    return res.status(400).json({
      success: false,
      error: { code: 'OFFICIAL_SYNC_ONE_FILE', message: safeUploadRejectionMessage('OFFICIAL_SYNC_ONE_FILE') },
    });
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'plaud-upload-'));

  for (const f of req.files) {
    const result = await processOneFile({ file: f, userId, tmpDir, recordedAt, clipSource, clipExternalId })
      .catch((err) => {
        logger.error('[plaudUpload] processOneFile threw: %s', err.message);
        return {
          rejected: { filename: f.originalname, code: 'INTERNAL_ERROR', message: safeUploadRejectionMessage('INTERNAL_ERROR') },
        };
      });
    if (result.accepted) accepted.push(result.accepted);
    if (result.rejected) rejected.push(result.rejected);
  }

  try { await rm(tmpDir, { recursive: true, force: true }).catch(() => {}); } catch { /* best-effort */ }

  return res.status(200).json({
    success: true,
    clips: accepted,
    rejected,
  });
}

async function processOneFile({ file, userId, tmpDir, recordedAt = null, clipSource = 'manual_upload', clipExternalId = null }) {
  const ext = pickExtFromMimetype(file.mimetype, file.originalname);
  if (!ext) {
    return { rejected: { filename: file.originalname, code: 'UNSUPPORTED_AUDIO_TYPE', message: safeUploadRejectionMessage('UNSUPPORTED_AUDIO_TYPE') } };
  }
  if (file.size > (Number(process.env.PLAUD_MAX_FILE_BYTES) || 20 * 1024 * 1024)) {
    return { rejected: { filename: file.originalname, code: 'UPLOAD_TOO_LARGE', message: safeUploadRejectionMessage('UPLOAD_TOO_LARGE') } };
  }

  const existingBeforeProbe = await findExistingClip({ userId, clipSource, clipExternalId });
  if (existingBeforeProbe) {
    if (!(await deleteLostExternalClip(existingBeforeProbe))) {
      if (existingBeforeProbe.status === 'uploading') return inFlightDuplicateRejection(file);
      return { accepted: acceptedFromExisting(existingBeforeProbe, file) };
    }
  }

  const tmpPath = join(tmpDir, `${randomUUID()}.${ext}`);
  await writeFile(tmpPath, file.buffer, { mode: 0o600 });

  let meta;
  try {
    meta = await probeFile(tmpPath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    if (err instanceof ClipCorruptError) {
      return { rejected: { filename: file.originalname, code: 'CLIP_CORRUPT', message: safeUploadRejectionMessage('CLIP_CORRUPT') } };
    }
    throw err;
  }

  if (meta.codec && !ALLOWED_CODECS.has(String(meta.codec).toLowerCase())) {
    await unlink(tmpPath).catch(() => {});
    return { rejected: { filename: file.originalname, code: 'UNSUPPORTED_AUDIO_TYPE', message: safeUploadRejectionMessage('UNSUPPORTED_AUDIO_TYPE') } };
  }

  let silenceCheck;
  try {
    silenceCheck = await detectSilence(tmpPath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    if (err instanceof ClipCorruptError) {
      return { rejected: { filename: file.originalname, code: 'CLIP_CORRUPT', message: safeUploadRejectionMessage('CLIP_CORRUPT') } };
    }
    throw err;
  }
  if (silenceCheck.isSilent) {
    await unlink(tmpPath).catch(() => {});
    return {
      rejected: {
        filename: file.originalname,
        code: 'CLIP_TOO_SILENT',
        message: safeUploadRejectionMessage('CLIP_TOO_SILENT'),
      },
    };
  }

  // Phase A: insert plaud_clips row with status='uploading'
  const clipId = randomUUID();
  let phaseA;
  try {
    [phaseA] = await sequelize.query(
      `INSERT INTO plaud_clips (
         clip_id, user_id, filename_original, storage_ext, mimetype,
         size_bytes, duration_sec, sha256, status,
         recorded_at, clip_source, clip_external_id, expires_at
       )
       VALUES (
         :clipId, :userId, :filename, :ext, :mimetype,
         :size, :duration, '', 'uploading',
         :recordedAt, :clipSource, :clipExternalId,
         NOW() + (:ttlHours || ' hours')::INTERVAL
       )
       ON CONFLICT (clip_source, clip_external_id, user_id)
         WHERE clip_external_id IS NOT NULL
       DO NOTHING
       RETURNING id, clip_id, recorded_at, clip_source, clip_external_id, uploaded_at, expires_at`,
      {
        replacements: {
          clipId,
          userId,
          filename: file.originalname.slice(0, 255),
          ext,
          mimetype: file.mimetype,
          size: file.size,
          duration: meta.durationSec ?? null,
          recordedAt,
          clipSource,
          clipExternalId,
          ttlHours: String(Number(process.env.PLAUD_CLIP_TTL_HOURS) || 24),
        },
      },
    );
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
  const dbRow = (phaseA || [])[0];
  if (!dbRow) {
    await unlink(tmpPath).catch(() => {});
    const existingAfterConflict = await findExistingClip({ userId, clipSource, clipExternalId });
    if (existingAfterConflict) {
      if (existingAfterConflict.status === 'uploading') return inFlightDuplicateRejection(file);
      return { accepted: acceptedFromExisting(existingAfterConflict, file) };
    }
    return { rejected: { filename: file.originalname, code: 'INTERNAL_ERROR', message: safeUploadRejectionMessage('INTERNAL_ERROR') } };
  }

  // Phase B: write to PLAUD disk path
  let writeResult;
  try {
    writeResult = await writeClipToDisk(userId, clipId, ext, file.buffer);
  } catch (err) {
    // Mark row 'lost' immediately rather than wait for cron sweep
    await sequelize.query(
      `UPDATE plaud_clips SET status = 'lost', updated_at = NOW() WHERE clip_id = :clipId`,
      { replacements: { clipId } },
    ).catch(() => {});
    await unlink(tmpPath).catch(() => {});
    return { rejected: { filename: file.originalname, code: 'INTERNAL_ERROR', message: safeUploadRejectionMessage('INTERNAL_ERROR') } };
  }

  // Phase C: transactionally flip status='pending_merge' + insert mirror_job
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(
      `UPDATE plaud_clips
       SET status     = 'pending_merge',
           disk_path  = :diskPath,
           sha256     = :sha,
           updated_at = NOW()
       WHERE clip_id = :clipId AND status = 'uploading'`,
      { replacements: { clipId, diskPath: writeResult.diskPath, sha: writeResult.sha256 }, transaction },
    );
    await sequelize.query(
      `INSERT INTO plaud_clip_mirror_jobs (clip_id, status, next_retry_at)
       VALUES (:clipId, 'pending', NOW())`,
      { replacements: { clipId }, transaction },
    );
    await transaction.commit();
  } catch (err) {
    await transaction.rollback().catch(() => {});
    // Disk write succeeded but DB phase C failed — let stale-uploading
    // cron mark the row 'lost' rather than risk inconsistency.
    await unlink(tmpPath).catch(() => {});
    return { rejected: { filename: file.originalname, code: 'INTERNAL_ERROR', message: safeUploadRejectionMessage('INTERNAL_ERROR') } };
  }

  await unlink(tmpPath).catch(() => {});

  return {
    accepted: {
      clipId,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      durationSec: meta.durationSec,
      recordedAt: dbRow.recorded_at,
      clipSource: dbRow.clip_source,
      clipExternalId: dbRow.clip_external_id,
      uploadedAt: dbRow.uploaded_at,
      expiresAt: dbRow.expires_at,
      status: 'pending_merge',
      playbackReady: true,
      playbackPath: `/api/plaud/clips/${clipId}/audio`,
    },
  };
}

function inFlightDuplicateRejection(file) {
  return {
    rejected: {
      filename: file.originalname,
      code: 'CLIP_INGEST_IN_PROGRESS',
      message: safeUploadRejectionMessage('CLIP_INGEST_IN_PROGRESS'),
    },
  };
}

export const _internal = {
  processOneFile, ALLOWED_CODECS, ALLOWED_EXT, pickExtFromMimetype, normalizeRecordedAt, normalizeClipSource,
  normalizeClipExternalId, safeUploadRejectionMessage,
};
