/**
 * plaudApplaudWebhookController.mjs
 * ==================================
 * Handler for POST /api/plaud/webhook/applaud — Phase 5 Auto-Ingestion
 * webhook receiver. Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §6.1.
 *
 * Composes:
 *   - Slice 5.2: plaudWebhookSignature.verifyWebhookRequest (sig + nonce + body consistency)
 *   - Slice 5.3: applaudAudioFetcher.fetchAudioWithCaps (URL allowlist + bounded fetch)
 *   - Phase 3:   audioProbeService.probeFile + detectSilence
 *   - Phase 3:   plaudClipStorageDualTier.writeClipToDisk
 *   - Phase 3:   plaud_clip_mirror_jobs (existing R2 mirror pipeline)
 *
 * Pipeline order (v1.2 — Codex CR-6 fix; NO DB row before audio fetch):
 *   1. Concurrency semaphore (cap 5 — CR-6 DoS mitigation)
 *   2. verifyWebhookRequest: sig + atomic nonce claim + body consistency
 *   3. Branch on event_type:
 *      - transcript_ready → 200 NOOP (HIGH-4)
 *      - audio_ready → continue
 *      - other → 400 UNKNOWN_EVENT_TYPE (HIGH-4)
 *   4. Status-aware dedup READ (HIGH-1):
 *      - terminal-success row → 200 already_processed
 *      - 'uploading' row → 429 CLIP_INGEST_IN_PROGRESS (Retry-After 300)
 *      - 'failed' row → DELETE then continue
 *   5. fetchAudioWithCaps: URL allowlist + bounded fetch + redirect:'error'
 *   6. ffprobe + silence detect (reuse Phase 3 audioProbeService)
 *   7. Atomic INSERT plaud_clips ... ON CONFLICT DO NOTHING RETURNING (CR-3)
 *   8. writeClipToDisk (reuse Phase 3 storage)
 *   9. Transactional UPDATE status='pending_merge' + INSERT mirror_job
 *  10. Return 200 { success, event_id, clip_id, status: 'queued' }
 *
 * Codex fix matrix this controller honors:
 *   CR-1: every sequelize.query uses type: QueryTypes.* + proper destructure
 *   CR-2: nonce dedup atomic (in Slice 5.2)
 *   CR-3: clip_external_id dedup atomic (Step 7)
 *   CR-4: SSRF allowlist (in Slice 5.3)
 *   CR-5: route absent when flag off (in Slice 5.5)
 *   CR-6: no DB row before audio fetch + concurrency cap + clip_id never
 *         leaked in already_processed responses
 *   HIGH-1: status-aware dedup
 *   HIGH-4: event_type branch BEFORE audio URL validation
 *   HIGH-7: secret KEY_ID resolved at startup (in Slice 5.5)
 *   M-1, M-2: in Slice 5.2
 */
import { randomUUID } from 'node:crypto';
import { writeFile, unlink, mkdtemp, rm as rmFs } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { QueryTypes } from 'sequelize';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import { verifyWebhookRequest } from '../../services/plaudWebhookSignature.mjs';
import { fetchAudioWithCaps } from '../../services/applaudAudioFetcher.mjs';
import {
  probeFile,
  detectSilence,
  ClipCorruptError,
  ClipProbeTimeoutError,
} from '../../services/audioProbeService.mjs';
import { writeClipToDisk } from '../../services/plaudClipStorageDualTier.mjs';
import { Semaphore } from '../../utils/semaphore.mjs';

// Allowed extensions (matches Phase 3 manual upload allowlist exactly)
const ALLOWED_EXT = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'webm']);

// Mimetype → extension map (matches Phase 3 plaudUploadController)
const MIMETYPE_TO_EXT = {
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

// Status states that count as "already terminally processed" (HIGH-1).
// Must align with PlaudClip model's status enum: ['uploading', 'pending_merge',
// 'merged', 'expired', 'deleted', 'lost']. Codex NH-7 caught earlier drift —
// 'failed' and 'discarded' are NOT in the model enum; if the controller branched
// on them they'd be unreachable code. Removed.
//
// Recovery paths (also see step 4 below):
//   pending_merge / merged / deleted → already_processed (terminal-success)
//   expired                          → already_processed (TTL'd; trainer dropped it)
//   uploading                        → 429 retry-after (in-flight or stuck; reaper at 5min)
//   lost                              → DELETE row + retry fresh
const TERMINAL_DEDUP_STATES = new Set(['pending_merge', 'merged', 'deleted', 'expired']);

// Concurrency cap per Codex CR-6. Read once at module load; PLAUD_APPLAUD_MAX_CONCURRENCY
// env var override is documented but takes effect on next restart only.
const MAX_CONCURRENCY = (() => {
  const v = Number(process.env.PLAUD_APPLAUD_MAX_CONCURRENCY);
  if (Number.isInteger(v) && v >= 1) return v;
  return 5;
})();

const webhookSemaphore = new Semaphore(MAX_CONCURRENCY);

// User mapping (single-trainer in v1; v2 multi-source = source-keyed lookup).
function getApplaudUserId() {
  const v = Number(process.env.PLAUD_APPLAUD_USER_ID);
  if (!Number.isInteger(v) || v <= 0) {
    throw new Error('PLAUD_APPLAUD_USER_ID env not set or invalid');
  }
  return v;
}

function jsonError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

function pickExtFromMimetype(mimetype) {
  if (typeof mimetype !== 'string') return null;
  const ext = MIMETYPE_TO_EXT[mimetype.toLowerCase()];
  return ext && ALLOWED_EXT.has(ext) ? ext : null;
}

/**
 * Top-level handler. Wraps semaphore + try/catch around the core pipeline.
 * Never throws — all errors converted to JSON error responses.
 */
export async function applaudWebhookHandler(req, res) {
  const release = webhookSemaphore.tryAcquire();
  if (!release) {
    res.set('Retry-After', '30');
    return jsonError(
      res, 429, 'WEBHOOK_CONCURRENCY_LIMIT',
      `too many concurrent webhook ingests (cap ${MAX_CONCURRENCY})`,
    );
  }
  try {
    return await handleApplaudWebhookCore(req, res);
  } catch (err) {
    logger.error('[plaudApplaudWebhook] unhandled: %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'webhook handler error');
  } finally {
    release();
  }
}

async function handleApplaudWebhookCore(req, res) {
  // Step 1+2: verify signature, claim nonce, check body consistency
  const verified = await verifyWebhookRequest(req, { sequelize });
  if (!verified.ok) {
    return jsonError(res, verified.status, verified.code, verified.message);
  }

  const body = verified.parsed;
  const event_id = typeof body.event_id === 'string' ? body.event_id : null;

  // Replay (nonce already claimed). Codex CR-6 — NO clip_id in this response.
  if (verified.replayed) {
    return res.status(200).json({
      success: true,
      event_id,
      status: 'already_processed',
    });
  }

  // Step 3: branch on event_type. Codex HIGH-4 — must happen BEFORE
  // any audio_url operation since transcript_ready has no audio_url.
  if (body.event_type === 'transcript_ready') {
    // v1 ignores Applaud transcripts (D7). 200-ack so Applaud stops retrying.
    return res.status(200).json({ acknowledged: true, action: 'ignored' });
  }
  if (body.event_type !== 'audio_ready') {
    return jsonError(res, 400, 'UNKNOWN_EVENT_TYPE', `event_type "${body.event_type}" not supported`);
  }

  // Validate audio_ready required fields + DB column lengths (Codex CR-IMPL-5,
  // NH-5, NH-8: defensive length checks before INSERT. Migration enforces
  // VARCHAR limits; oversized payloads would otherwise become DB 500s →
  // Applaud retry storm).
  const recording_id = body.recording_id;
  const audio_url = body.audio_url;
  const audio_size_bytes = Number(body.audio_size_bytes);
  const audio_mimetype = body.audio_mimetype;
  if (typeof recording_id !== 'string' || !recording_id || recording_id.length > 255) {
    return jsonError(res, 400, 'INVALID_PAYLOAD', 'recording_id missing or too long');
  }
  if (event_id && (typeof event_id !== 'string' || event_id.length > 255)) {
    return jsonError(res, 400, 'INVALID_PAYLOAD', 'event_id too long');
  }
  if (typeof audio_url !== 'string' || !audio_url || audio_url.length > 2048) {
    return jsonError(res, 400, 'INVALID_PAYLOAD', 'audio_url missing or too long');
  }
  if (!Number.isFinite(audio_size_bytes) || audio_size_bytes <= 0) {
    return jsonError(res, 400, 'INVALID_PAYLOAD', 'audio_size_bytes missing or invalid');
  }
  if (typeof audio_mimetype !== 'string' || !audio_mimetype || audio_mimetype.length > 64) {
    return jsonError(res, 400, 'INVALID_PAYLOAD', 'audio_mimetype missing or too long');
  }

  let userId;
  try {
    userId = getApplaudUserId();
  } catch (err) {
    logger.error('[plaudApplaudWebhook] user_id env: %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'webhook user mapping unavailable');
  }

  // Step 4: status-aware dedup (Codex HIGH-1)
  const existingRows = await sequelize.query(
    `SELECT clip_id, status FROM plaud_clips
     WHERE clip_source = 'applaud_webhook'
       AND clip_external_id = :rid
       AND user_id = :uid
     LIMIT 1`,
    {
      replacements: { rid: recording_id, uid: userId },
      type: QueryTypes.SELECT,
    },
  );
  const existing = existingRows[0];
  if (existing && TERMINAL_DEDUP_STATES.has(existing.status)) {
    return res.status(200).json({
      success: true,
      event_id,
      status: 'already_processed',
    });
  }
  if (existing && existing.status === 'uploading') {
    res.set('Retry-After', '300');
    return jsonError(
      res, 429, 'CLIP_INGEST_IN_PROGRESS',
      'previous ingest of this recording is in progress or stuck; retry after stale-row reaper',
    );
  }
  if (existing && existing.status === 'lost') {
    // Allow retry by clearing the lost row first. Codex HIGH-1 / NH-7:
    // 'failed' is not in the actual model enum; only 'lost' represents
    // a recoverable abandoned-ingest state.
    await sequelize.query(
      `DELETE FROM plaud_clips
       WHERE clip_id = :clipId AND status = 'lost'`,
      {
        replacements: { clipId: existing.clip_id },
        type: QueryTypes.DELETE,
      },
    );
    // Fall through to step 5.
  }

  // Step 5: validate ext + fetch audio
  const ext = pickExtFromMimetype(audio_mimetype);
  if (!ext) {
    return jsonError(res, 415, 'UNSUPPORTED_AUDIO_TYPE', `mimetype ${audio_mimetype} not allowed`);
  }
  const audio = await fetchAudioWithCaps(audio_url, audio_size_bytes);
  if (audio.error) {
    return jsonError(res, audio.errorStatus, audio.errorCode, audio.message);
  }

  // Step 6: stage to tmp + probe + silence detect (reuse Phase 3 audioProbeService)
  let tmpDir;
  let tmpPath;
  let meta;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'plaud-webhook-'));
    tmpPath = join(tmpDir, `${randomUUID()}.${ext}`);
    await writeFile(tmpPath, audio.bytes, { mode: 0o600 });
    meta = await probeFile(tmpPath);
    const silence = await detectSilence(tmpPath);
    if (silence.isSilent) {
      return jsonError(res, 422, 'CLIP_TOO_SILENT', 'silence threshold exceeded');
    }
    if (!meta || !meta.codec) {
      return jsonError(res, 422, 'CLIP_CORRUPT', 'probe returned invalid metadata');
    }
  } catch (err) {
    if (err instanceof ClipCorruptError) {
      return jsonError(res, 422, 'CLIP_CORRUPT', 'corrupt audio');
    }
    if (err instanceof ClipProbeTimeoutError) {
      return jsonError(res, 500, 'CLIP_PROBE_TIMEOUT', 'probe timed out');
    }
    throw err;
  } finally {
    if (tmpDir) {
      await rmFs(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  // Step 7: atomic INSERT with ON CONFLICT (Codex CR-3)
  const clipId = randomUUID();
  const inserted = await sequelize.query(
    `INSERT INTO plaud_clips (
       clip_id, user_id, filename_original, storage_ext, mimetype,
       size_bytes, duration_sec, sha256, status,
       clip_source, clip_external_id, applaud_event_id,
       expires_at
     )
     VALUES (
       :clipId, :userId, :filename, :ext, :mimetype,
       :size, :duration, '', 'uploading',
       'applaud_webhook', :externalId, :eventId,
       NOW() + (:ttlHours || ' hours')::INTERVAL
     )
     ON CONFLICT (clip_source, clip_external_id, user_id)
       WHERE clip_external_id IS NOT NULL
     DO NOTHING
     RETURNING clip_id`,
    {
      replacements: {
        clipId,
        userId,
        // Codex H-IMPL-9: preserve extension when truncating overlong filenames.
        // Reserve ext.length+1 chars for the trailing ".ext" so the saved name
        // remains parseable. Default fallback when filename absent.
        filename: (() => {
          const raw = body.audio_filename || `applaud_${recording_id}.${ext}`;
          if (raw.length <= 255) return raw;
          const reserved = ext.length + 1; // for ".ext"
          return raw.slice(0, 255 - reserved) + '.' + ext;
        })(),
        ext,
        mimetype: audio_mimetype,
        size: audio.bytes.length,
        // Codex H-IMPL-4: nullish-coalesce instead of `||` so duration=0 (edge
        // case impossible in practice but defends against silent data loss)
        // doesn't get coerced to NULL.
        duration: meta.durationSec ?? null,
        externalId: recording_id,
        eventId: event_id || null,
        ttlHours: String(Number(process.env.PLAUD_CLIP_TTL_HOURS) || 24),
      },
      type: QueryTypes.SELECT,
    },
  );

  if (!Array.isArray(inserted) || inserted.length === 0) {
    // Race: a concurrent request inserted first. Treat as already_processed.
    return res.status(200).json({
      success: true,
      event_id,
      status: 'already_processed',
    });
  }
  const insertedClipId = inserted[0].clip_id;

  // Step 8: write to disk via Phase 3's storage service
  let writeResult;
  try {
    writeResult = await writeClipToDisk(userId, insertedClipId, ext, audio.bytes);
  } catch (err) {
    // Mark row 'lost' immediately rather than wait for stale-uploading reaper.
    // Match Phase 3 manual-upload's recovery pattern.
    await sequelize.query(
      `UPDATE plaud_clips
       SET status = 'lost', updated_at = NOW()
       WHERE clip_id = :clipId AND status = 'uploading'`,
      {
        replacements: { clipId: insertedClipId },
        type: QueryTypes.UPDATE,
      },
    ).catch(() => {});
    logger.error('[plaudApplaudWebhook] disk write failed for %s: %s', insertedClipId, err.message);
    // Codex NH-6 / M-IMPL-5: do NOT echo err.message to webhook caller.
    // Internal detail (filesystem paths, library internals, env names) belongs
    // in logs only. Generic message externally.
    return jsonError(res, 500, 'INTERNAL_ERROR', 'disk write failed');
  }

  // Step 9: transactional flip status='pending_merge' + insert mirror_job.
  // Same shape as plaudUploadController Phase C.
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(
      `UPDATE plaud_clips
       SET status     = 'pending_merge',
           disk_path  = :diskPath,
           sha256     = :sha,
           updated_at = NOW()
       WHERE clip_id = :clipId AND status = 'uploading'`,
      {
        replacements: { clipId: insertedClipId, diskPath: writeResult.diskPath, sha: writeResult.sha256 },
        type: QueryTypes.UPDATE,
        transaction,
      },
    );
    await sequelize.query(
      `INSERT INTO plaud_clip_mirror_jobs (clip_id, status, next_retry_at)
       VALUES (:clipId, 'pending', NOW())`,
      {
        replacements: { clipId: insertedClipId },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
    await transaction.commit();
  } catch (err) {
    await transaction.rollback().catch(() => {});
    logger.error('[plaudApplaudWebhook] phase-C transaction failed for %s: %s', insertedClipId, err.message);
    // Codex NH-6 / M-IMPL-5: sanitize external error.
    return jsonError(res, 500, 'INTERNAL_ERROR', 'phase-C failed');
  }

  // Codex H-IMPL-1 / NM-5: queued log line for operator visibility.
  // Required by plan §9.1 final receipt log.
  logger.info(
    '[plaudApplaudWebhook] queued clip_id=%s event_id=%s recording_id=%s',
    insertedClipId, event_id || '<none>', recording_id,
  );

  return res.status(200).json({
    success: true,
    event_id,
    clip_id: insertedClipId,
    status: 'queued',
  });
}

// Exports for tests + observability
export const _internal = {
  webhookSemaphore,
  MAX_CONCURRENCY,
  TERMINAL_DEDUP_STATES,
  pickExtFromMimetype,
  getApplaudUserId,
};
