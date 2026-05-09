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
import { writeFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  writeClipToDisk,
} from '../../services/plaudClipStorageDualTier.mjs';
import {
  probeFile,
  detectSilence,
  ClipCorruptError,
} from '../../services/audioProbeService.mjs';

const ALLOWED_CODECS = new Set(['mp3', 'aac', 'opus', 'pcm_s16le', 'flac', 'vorbis']);
const ALLOWED_EXT = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'webm']);

function pickExtFromMimetype(mimetype, originalname) {
  const fallback = (originalname || '').split('.').pop()?.toLowerCase() || '';
  const map = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
  };
  const candidate = map[mimetype] || fallback;
  return ALLOWED_EXT.has(candidate) ? candidate : null;
}

export async function uploadHandler(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'NO_FILES', message: 'No files provided' },
    });
  }

  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
    });
  }

  const accepted = [];
  const rejected = [];

  // Temp dir for ffprobe inputs (multer is memoryStorage; ffprobe needs a path)
  const tmpDir = await mkdtemp(join(tmpdir(), 'plaud-upload-'));

  for (const f of req.files) {
    const result = await processOneFile({ file: f, userId, tmpDir })
      .catch((err) => {
        logger.error('[plaudUpload] processOneFile threw: %s', err.message);
        return {
          rejected: { filename: f.originalname, code: 'INTERNAL_ERROR', message: err.message },
        };
      });
    if (result.accepted) accepted.push(result.accepted);
    if (result.rejected) rejected.push(result.rejected);
  }

  // Best-effort tmp cleanup
  try { await unlink(tmpDir).catch(() => {}); } catch { /* best-effort */ }

  return res.status(200).json({
    success: true,
    clips: accepted,
    rejected,
  });
}

async function processOneFile({ file, userId, tmpDir }) {
  const ext = pickExtFromMimetype(file.mimetype, file.originalname);
  if (!ext) {
    return { rejected: { filename: file.originalname, code: 'UNSUPPORTED_AUDIO_TYPE', message: `mime ${file.mimetype}` } };
  }
  if (file.size > (Number(process.env.PLAUD_MAX_FILE_BYTES) || 20 * 1024 * 1024)) {
    return { rejected: { filename: file.originalname, code: 'UPLOAD_TOO_LARGE', message: `${file.size} bytes` } };
  }

  // Stage on tmp disk so ffprobe can read it (multer memoryStorage)
  const tmpPath = join(tmpDir, `${randomUUID()}.${ext}`);
  await writeFile(tmpPath, file.buffer, { mode: 0o600 });

  let meta;
  try {
    meta = await probeFile(tmpPath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    if (err instanceof ClipCorruptError) {
      return { rejected: { filename: file.originalname, code: 'CLIP_CORRUPT', message: err.message } };
    }
    throw err;
  }

  if (meta.codec && !ALLOWED_CODECS.has(String(meta.codec).toLowerCase())) {
    await unlink(tmpPath).catch(() => {});
    return { rejected: { filename: file.originalname, code: 'UNSUPPORTED_AUDIO_TYPE', message: `codec ${meta.codec}` } };
  }

  let silenceCheck;
  try {
    silenceCheck = await detectSilence(tmpPath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    if (err instanceof ClipCorruptError) {
      return { rejected: { filename: file.originalname, code: 'CLIP_CORRUPT', message: err.message } };
    }
    throw err;
  }
  if (silenceCheck.isSilent) {
    await unlink(tmpPath).catch(() => {});
    return {
      rejected: {
        filename: file.originalname,
        code: 'CLIP_TOO_SILENT',
        message: `mean=${silenceCheck.meanDb}dB max=${silenceCheck.maxDb}dB`,
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
         expires_at
       )
       VALUES (
         :clipId, :userId, :filename, :ext, :mimetype,
         :size, :duration, '', 'uploading',
         NOW() + (:ttlHours || ' hours')::INTERVAL
       )
       RETURNING id, clip_id, uploaded_at, expires_at`,
      {
        replacements: {
          clipId,
          userId,
          filename: file.originalname.slice(0, 255),
          ext,
          mimetype: file.mimetype,
          size: file.size,
          duration: meta.durationSec || null,
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
    return { rejected: { filename: file.originalname, code: 'INTERNAL_ERROR', message: 'DB insert returned no row' } };
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
    return { rejected: { filename: file.originalname, code: 'INTERNAL_ERROR', message: `disk write failed: ${err.message}` } };
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
    return { rejected: { filename: file.originalname, code: 'INTERNAL_ERROR', message: `phase-C failed: ${err.message}` } };
  }

  await unlink(tmpPath).catch(() => {});

  return {
    accepted: {
      clipId,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      durationSec: meta.durationSec,
      uploadedAt: dbRow.uploaded_at,
      expiresAt: dbRow.expires_at,
      status: 'pending_merge',
      playbackReady: true,
      playbackPath: `/api/plaud/clips/${clipId}/audio`,
    },
  };
}

export const _internal = { processOneFile, ALLOWED_CODECS, ALLOWED_EXT, pickExtFromMimetype };
