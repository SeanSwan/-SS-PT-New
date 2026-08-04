/**
 * plaudMergeController.mjs
 * =========================
 * Handler for POST /api/plaud/clips/merge — the heart of Phase 3.
 *
 * Phase 3 Slice 3.7 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.4.
 *
 * Pipeline (with Codex Round 2-4 fixes integrated):
 *   1. Validate body (clipIds 1-5, clientId required)
 *   2. Trainer-client assignment authz check (Round 1 gap #10)
 *   3. Validate clipIds (owned, status='pending_merge', not expired) BEFORE lock acquire
 *   4. Atomic lock acquire with expired-takeover (Round 2 HIGH #2)
 *   5. Insert merge_request row with status='processing' (Round 2 HIGH #1 — failsafe anchor)
 *   6. Read each clip from disk (with R2 fallback)
 *   7. Normalize each clip + concat to merged audio (Round 2 HIGH #3 — handles mixed containers)
 *   8. Cap merged audio at 20MB else MERGED_AUDIO_TOO_LARGE
 *   9. Transcribe via existing voiceTranscriptionService (with fitness vocab bias)
 *   10. Parse via existing workoutLogParserService
 *   11. Detect client-name boundary
 *   12. Encrypt { transcript, parsedWorkout } via plaudCipherService
 *   13. ATOMIC FINALIZATION (Round 4 HIGH fix — single transaction):
 *       a. Fence: SELECT 1 FROM plaud_merge_locks ... FOR UPDATE
 *       b. UPDATE merge_request to status='completed' with cipher
 *       c. UPDATE clips to status='merged' WITH WHERE status='pending_merge' (Round 4 MED #4)
 *          + row count check (must equal clipIds.length else rollback)
 *       d. DELETE lock
 *       e. COMMIT
 *   14. Return { mergeRequestId, transcript, parsedWorkout, boundaryWarning }
 *
 * Failure modes flip merge_request to status='failed' with error_code
 * (one of §16 taxonomy) so the failsafe-recovery list endpoint surfaces
 * them to the trainer with appropriate UI copy.
 */
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { QueryTypes } from 'sequelize';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import { mergeAndCleanup, FfmpegError } from '../../services/audioMergeService.mjs';
import { readClip, ClipNotFoundError } from '../../services/plaudClipStorageDualTier.mjs';
import { acquireLock, releaseLock, verifyHolder, heartbeat } from '../../services/plaudMergeLockService.mjs';
import { encryptPayload } from '../../services/plaudCipherService.mjs';
import { detectBoundary } from '../../services/clientNameBoundaryDetector.mjs';
import { getClientFitnessBias } from '../../services/fitnessTranscriptionVocabService.mjs';
import { transcribeAudio } from '../../services/voiceTranscriptionService.mjs';
import { parseWorkoutTranscript } from '../../services/workoutLogParserService.mjs';
import { assertTrainerAssignedToClient, PlaudAuthzError } from '../../middleware/plaudAuthz.mjs';
import { PLAUD_UUID_REGEX } from '../../utils/plaudUuidRegex.mjs';

const MAX_MERGED_BYTES = Number(process.env.PLAUD_MAX_MERGED_BYTES) || 20 * 1024 * 1024;
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 min

/**
 * Convert a returned-from-DB row into a clip record useful for the
 * pipeline. orderMode='provided' preserves trainer selection order;
 * orderMode='uploaded_at_asc' sorts by best available clip chronology.
 * recorded_at wins when present; uploaded_at remains the compatibility
 * fallback and trainer selection is the deterministic tie-breaker.
 */
async function loadClipsInOrder(clipIds, userId, orderMode = 'provided') {
  if (clipIds.length === 0) return [];
  // PG array literal — UUIDs are pre-validated by PLAUD_UUID_REGEX in callers,
  // so safe to embed without per-element quoting. Sequelize replacements
  // would expand a JS array as a comma list (e.g. 'a','b','c'), which breaks
  // ANY(...) and array_position(...) — both need a real Postgres array.
  const clipIdsLiteral = `{${clipIds.join(',')}}`;
  const orderClause = orderMode === 'uploaded_at_asc'
    ? 'COALESCE(recorded_at, uploaded_at) ASC, array_position(:clipIdsLiteral::uuid[], clip_id)'
    : 'array_position(:clipIdsLiteral::uuid[], clip_id)';
  const rows = await sequelize.query(
    `SELECT clip_id, filename_original, storage_ext, mimetype, duration_sec,
            clip_source, status, recorded_at, uploaded_at, expires_at, deleted_at
     FROM plaud_clips
     WHERE clip_id = ANY(:clipIdsLiteral::uuid[])
       AND user_id = :userId
     ORDER BY ${orderClause}`,
    {
      replacements: { clipIdsLiteral, userId },
      type: QueryTypes.SELECT,
    },
  );
  return rows;
}

function jsonError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

function buildClipTimeline(clips, orderMode) {
  return clips.map((c, index) => ({
    mergeStep: index + 1,
    clipId: c.clip_id,
    filename: c.filename_original,
    recordedAt: c.recorded_at,
    uploadedAt: c.uploaded_at,
    durationSec: c.duration_sec == null ? null : Number(c.duration_sec),
    source: c.clip_source,
    orderMode,
  }));
}

/**
 * Update merge_request to a terminal failure state. Best-effort —
 * never throws. Logs at error level.
 */
async function markMergeFailed(mergeRequestId, errorCode, errorMessage) {
  try {
    await sequelize.query(
      `UPDATE plaud_merge_requests
       SET status     = 'failed',
           error_code = :errorCode,
           completed_at = NOW()
       WHERE merge_request_id = :mergeRequestId
         AND status = 'processing'`,
      { replacements: { mergeRequestId, errorCode } },
    );
  } catch (err) {
    logger.error('[plaudMerge] failed to mark merge failed: %s', err.message);
  }
  logger.warn('[plaudMerge] mergeRequestId=%s status=failed code=%s msg=%s',
    mergeRequestId, errorCode, errorMessage);
}

export async function mergeHandler(req, res) {
  const userId = Number(req.user?.id);
  const role = req.user?.role;
  if (!Number.isInteger(userId) || userId <= 0) {
    return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
  }

  const { clipIds, clientId, date, orderMode } = req.body || {};

  // Validate clipIds 1-5. A one-clip request is the single-workout
  // passthrough path for clips that entered PLAUD intake before client
  // resolution.
  if (!Array.isArray(clipIds) || clipIds.length < 1) {
    return jsonError(res, 400, 'TOO_FEW_CLIPS', 'merge requires at least 1 clipId');
  }
  if (clipIds.length > 5) {
    return jsonError(res, 400, 'TOO_MANY_FILES', 'merge accepts at most 5 clipIds');
  }
  for (const cid of clipIds) {
    if (!PLAUD_UUID_REGEX.test(cid || '')) {
      return jsonError(res, 400, 'INVALID_CLIP_ID', `Invalid clipId: ${cid}`);
    }
  }
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return jsonError(res, 400, 'INVALID_CLIENT_ID', 'clientId required');
  }

  // Trainer-client assignment authz (Codex Round 1 gap #10)
  try {
    await assertTrainerAssignedToClient({ trainerId: userId, clientId, role });
  } catch (err) {
    if (err instanceof PlaudAuthzError) {
      return jsonError(res, err.status, err.code, err.message);
    }
    throw err;
  }

  // Pre-lock validation: clips must be owned, pending_merge, not expired.
  // The frontend now sends uploaded_at_asc for the "audio puzzle" workflow;
  // default remains provided for API compatibility.
  const effectiveOrderMode = orderMode === 'uploaded_at_asc' ? 'uploaded_at_asc' : 'provided';
  const clips = await loadClipsInOrder(clipIds, userId, effectiveOrderMode);
  if (clips.length !== clipIds.length) {
    return jsonError(res, 404, 'CLIP_NOT_FOUND', 'One or more clips not found or not owned by trainer');
  }
  const clipIdsForMerge = clips.map((c) => c.clip_id);
  for (const c of clips) {
    if (c.deleted_at) {
      return jsonError(res, 404, 'CLIP_NOT_FOUND', `Clip deleted: ${c.clip_id}`);
    }
    if (c.status !== 'pending_merge') {
      return jsonError(res, 409, 'CLIP_NOT_AVAILABLE', `Clip status=${c.status}, expected pending_merge`);
    }
    if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
      return jsonError(res, 410, 'CLIP_EXPIRED', `Clip expired: ${c.clip_id}`);
    }
  }

  const mergeRequestId = randomUUID();

  // Atomic lock acquire with expired-takeover
  const { acquired } = await acquireLock({ userId, jobId: mergeRequestId, ttlMinutes: 15 });
  if (!acquired) {
    return jsonError(res, 409, 'MERGE_IN_PROGRESS', 'Another merge is in progress for this user');
  }

  // Insert merge_request row in 'processing' state — failsafe anchor
  try {
    await sequelize.query(
      `INSERT INTO plaud_merge_requests (
         merge_request_id, user_id, client_id, clip_ids, status, expires_at
       )
       VALUES (
         :mergeRequestId, :userId, :clientId, :clipIds::jsonb, 'processing',
         NOW() + (:ttl || ' hours')::INTERVAL
       )`,
      {
        replacements: {
          mergeRequestId,
          userId,
          clientId,
          clipIds: JSON.stringify(clipIdsForMerge),
          ttl: String(Number(process.env.PLAUD_CIPHER_TTL_HOURS) || 24),
        },
      },
    );
  } catch (err) {
    await releaseLock({ userId, jobId: mergeRequestId }).catch(() => {});
    logger.error('[plaudMerge] failed to insert processing row: %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Could not start merge');
  }

  // Heartbeat the lock during long external calls
  const heartbeatHandle = setInterval(() => {
    heartbeat({ userId, jobId: mergeRequestId, ttlMinutes: 15 }).catch((err) => {
      logger.warn('[plaudMerge] heartbeat failed: %s', err.message);
    });
  }, HEARTBEAT_INTERVAL_MS);
  if (heartbeatHandle.unref) heartbeatHandle.unref();

  let mergedTmpPath = null;
  try {
    // Read clip bytes from disk (with R2 fallback). We don't read the
    // bytes here — we just resolve disk paths for ffmpeg. readClip
    // restores R2-fetched bytes to disk before returning.
    const clipsWithDiskPaths = [];
    for (const c of clips) {
      try {
        // readClip returns a Buffer; we need disk path for ffmpeg.
        // After readClip succeeds with requireDiskRestore=true (the
        // default), the file is GUARANTEED on disk at the expected
        // path — Codex Pass 2 MEDIUM #3 fix promotes restore failure
        // to ClipNotFoundError instead of silent warn.
        await readClip(userId, c.clip_id, c.storage_ext, { requireDiskRestore: true });
      } catch (err) {
        if (err instanceof ClipNotFoundError) {
          await markMergeFailed(mergeRequestId, 'CLIP_NOT_FOUND', err.message);
          return jsonError(res, 410, 'CLIP_NOT_FOUND', `Clip bytes unavailable: ${c.clip_id}`);
        }
        throw err;
      }
      const base = process.env.PLAUD_DISK_BASE || '/tmp/plaud';
      const diskPath = path.join(base, String(userId), `${c.clip_id}.${c.storage_ext}`);
      clipsWithDiskPaths.push({ ...c, diskPath });
    }

    // Normalize + merge to a tmp output path
    const mergedDir = await fs.mkdtemp(path.join(tmpdir(), 'plaud-merged-'));
    mergedTmpPath = path.join(mergedDir, `${mergeRequestId}.mp3`);
    try {
      await mergeAndCleanup(clipsWithDiskPaths, mergeRequestId, mergedTmpPath);
    } catch (err) {
      const code = err instanceof FfmpegError ? err.code : 'FFMPEG_FAILED';
      await markMergeFailed(mergeRequestId, code, err.message);
      return jsonError(res, code === 'FFMPEG_TIMEOUT' || code === 'FFMPEG_NORMALIZE_TIMEOUT' ? 504 : 500, code, err.message);
    }

    // Read merged buffer and check 20MB cap
    const mergedBuffer = await fs.readFile(mergedTmpPath);
    if (mergedBuffer.length > MAX_MERGED_BYTES) {
      await markMergeFailed(mergeRequestId, 'MERGED_AUDIO_TOO_LARGE', `merged size ${mergedBuffer.length}`);
      return jsonError(res, 422, 'MERGED_AUDIO_TOO_LARGE',
        `Merged audio ${mergedBuffer.length} bytes exceeds ${MAX_MERGED_BYTES}`);
    }

    // Transcribe (existing service) with fitness vocab bias
    let transcript;
    try {
      const vocabulary = await getClientFitnessBias(clientId);
      transcript = await transcribeAudio(mergedBuffer, `${mergeRequestId}.mp3`, vocabulary);
    } catch (err) {
      await markMergeFailed(mergeRequestId, 'TRANSCRIPTION_FAILED', err.message);
      return jsonError(res, 502, 'TRANSCRIPTION_FAILED', err.message);
    }
    if (!transcript || transcript.trim().length < 5) {
      await markMergeFailed(mergeRequestId, 'TRANSCRIPTION_FAILED', 'transcript empty or too short');
      return jsonError(res, 502, 'TRANSCRIPTION_FAILED', 'Could not transcribe meaningful text');
    }

    // Parse (existing service)
    let parsedWorkout;
    try {
      parsedWorkout = await parseWorkoutTranscript({
        transcript,
        clientId,
        trainerId: userId,
        date: date || undefined,
      });
    } catch (err) {
      await markMergeFailed(mergeRequestId, 'PARSE_FAILED', err.message);
      return jsonError(res, 502, 'PARSE_FAILED', err.message);
    }

    // Boundary check (load roster of trainer's active clients)
    const [rosterRows] = await sequelize.query(
      `SELECT u.id, u."firstName" as "firstName", u."lastName" as "lastName"
       FROM "Users" u
       JOIN client_trainer_assignments cta
         ON cta."clientId" = u.id
       WHERE cta."trainerId" = :userId
         AND cta.status = 'active'`,
      { replacements: { userId } },
    );
    const boundaryWarning = detectBoundary({ transcript, roster: rosterRows || [] });

    // Encrypt the combined payload
    const transcriptHash = createHash('sha256').update(transcript, 'utf8').digest('hex');
    const clipTimeline = buildClipTimeline(clips, effectiveOrderMode);
    const enc = encryptPayload({ transcript, parsedWorkout, clipTimeline });
    const exerciseCount = Array.isArray(parsedWorkout?.exercises) ? parsedWorkout.exercises.length : null;

    // ATOMIC FINALIZATION (Codex Round 4 HIGH fix)
    const transaction = await sequelize.transaction();
    try {
      // Step 14a: fence with FOR UPDATE
      const stillHeld = await verifyHolder({ userId, jobId: mergeRequestId, transaction });
      if (!stillHeld) {
        await transaction.rollback();
        await markMergeFailed(mergeRequestId, 'MERGE_LOCK_LOST', 'lock fencing failed pre-finalize');
        return jsonError(res, 409, 'MERGE_LOCK_LOST', 'Lock was lost during merge');
      }

      // Step 14b: complete merge_request — Codex Pass 2 HIGH #1 fix:
      // RETURNING + row count check prevents committing clips as merged
      // when the merge_request was already moved out of 'processing'
      // (e.g., by the cipher-purge cron racing with a long-running merge).
      const [completeRows] = await sequelize.query(
        `UPDATE plaud_merge_requests
         SET status                = 'completed',
             transcript_hash       = :hash,
             payload_cipher        = :cipher,
             payload_iv            = :iv,
             payload_tag           = :tag,
             cipher_key_id         = :keyId,
             parsed_exercise_count = :count,
             boundary_warning      = :warning::jsonb,
             completed_at          = NOW()
         WHERE merge_request_id = :mergeRequestId
           AND status           = 'processing'
         RETURNING merge_request_id`,
        {
          replacements: {
            mergeRequestId,
            hash: transcriptHash,
            cipher: enc.cipher,
            iv: enc.iv,
            tag: enc.tag,
            keyId: enc.keyId,
            count: exerciseCount,
            warning: JSON.stringify(boundaryWarning.warning ? boundaryWarning : null),
          },
          transaction,
        },
      );
      if (!Array.isArray(completeRows) || completeRows.length !== 1) {
        await transaction.rollback();
        await markMergeFailed(mergeRequestId, 'MERGE_LOCK_LOST',
          'merge_request not in processing state at finalization (cipher purge or status drift)');
        return jsonError(res, 409, 'MERGE_LOCK_LOST',
          'Merge request was no longer in processing state at finalization');
      }

      // Step 14c: mark clips merged WITH WHERE guard (Codex Round 4 MED #4)
      const [, clipUpdateMeta] = await sequelize.query(
        `UPDATE plaud_clips
         SET status     = 'merged',
             merged_at  = NOW()
         WHERE user_id    = :userId
           AND clip_id    IN (:clipIds)
           AND status     = 'pending_merge'
           AND deleted_at IS NULL`,
        {
          replacements: { userId, clipIds: clipIdsForMerge },
          transaction,
        },
      );
      const updatedCount = clipUpdateMeta?.rowCount;
      if (typeof updatedCount === 'number' && updatedCount !== clipIdsForMerge.length) {
        await transaction.rollback();
        await markMergeFailed(mergeRequestId, 'CLIP_NOT_FOUND',
          `clip update count ${updatedCount} != expected ${clipIdsForMerge.length}`);
        return jsonError(res, 409, 'CLIP_NOT_FOUND', 'One or more clips changed state during merge');
      }

      // Step 14d: release lock
      await sequelize.query(
        `DELETE FROM plaud_merge_locks
         WHERE user_id = :userId AND job_id = :mergeRequestId`,
        { replacements: { userId, mergeRequestId }, transaction },
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback().catch(() => {});
      await markMergeFailed(mergeRequestId, 'INTERNAL_ERROR', `finalization failed: ${err.message}`);
      logger.error('[plaudMerge] finalization tx failed: %s', err.message);
      return jsonError(res, 500, 'INTERNAL_ERROR', 'Failed to finalize merge');
    }

    // Success
    return res.status(200).json({
      success: true,
      mergeRequestId,
      transcript,
      parsedWorkout,
      clipTimeline,
      boundaryWarning: boundaryWarning.warning ? boundaryWarning : null,
    });
  } catch (err) {
    logger.error('[plaudMerge] unhandled: %s', err.message);
    await markMergeFailed(mergeRequestId, 'INTERNAL_ERROR', err.message).catch(() => {});
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Internal merge error');
  } finally {
    clearInterval(heartbeatHandle);
    // Release lock if still held (e.g., we returned an error before reaching the COMMIT)
    await releaseLock({ userId, jobId: mergeRequestId }).catch(() => {});
    // Cleanup tmp merged file
    if (mergedTmpPath) {
      await fs.unlink(mergedTmpPath).catch(() => {});
      await fs.rmdir(path.dirname(mergedTmpPath)).catch(() => {});
    }
  }
}

export const _internal = { loadClipsInOrder, markMergeFailed, buildClipTimeline, MAX_MERGED_BYTES };
