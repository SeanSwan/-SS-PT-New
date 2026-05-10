/**
 * plaudR2MirrorWorker.mjs
 * ========================
 * Outbox worker: polls plaud_clip_mirror_jobs every 30s, uploads clips
 * from disk to R2, transitions job state, keeps plaud_clips.r2_mirror_status
 * in sync.
 *
 * Phase 3 Slice 3.3 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §4.3.
 *
 * Codex Round 3 HIGH #1 fix: stale `in_flight` recovery on every cycle
 * (and once at startup) — without this, a worker crash mid-upload would
 * leave the job stuck in_flight forever.
 *
 * State machine:
 *   pending -> in_flight (worker claim)
 *   in_flight -> mirrored (upload success)
 *   in_flight -> failed_retryable (upload failure, attempts < 5)
 *   failed_retryable -> in_flight (next retry window)
 *   failed_retryable -> failed_terminal (after 5 attempts; alert logged)
 *   in_flight -> failed_retryable (stale recovery: updated_at > 5min)
 * Backoff: 30s, 1m, 5m, 30m, 2h. After 5 attempts: terminal.
 */
import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';
import { uploadClipToR2 } from '../services/plaudClipStorageDualTier.mjs';
import { isPlaudR2Configured } from '../services/plaudR2Client.mjs';

const POLL_INTERVAL_MS = 30_000;
const MAX_ATTEMPTS = 5;
const STALE_IN_FLIGHT_MIN = 5;
const BATCH_SIZE = 10;

// Backoff in seconds
const BACKOFF_SECONDS = [30, 60, 300, 1800, 7200];

let _intervalHandle = null;
let _running = false;
export function startPlaudR2MirrorWorker() {
  if (_intervalHandle) {
    logger.warn('[plaudR2MirrorWorker] already running, skipping start');
    return;
  }
  if (process.env.PLAUD_WORKER_ENABLED !== 'true') {
    logger.info('[plaudR2MirrorWorker] PLAUD_WORKER_ENABLED != true — not starting');
    return;
  }
  if (!isPlaudR2Configured()) {
    logger.warn('[plaudR2MirrorWorker] R2 not configured — not starting');
    return;
  }
  logger.info('[plaudR2MirrorWorker] starting (poll every %dms)', POLL_INTERVAL_MS);

  // Sweep stale in_flight jobs once at startup, then begin polling
  recoverStaleInFlight().catch((err) => {
    logger.error('[plaudR2MirrorWorker] startup stale recovery failed: %s', err.message);
  });
  recoverTerminalAccessDenied()
    .catch((err) => logger.error('[plaudR2MirrorWorker] startup access-denied recovery failed: %s', err.message));

  _intervalHandle = setInterval(() => {
    if (_running) return;
    _running = true;
    runOnce()
      .catch((err) => logger.error('[plaudR2MirrorWorker] cycle error: %s', err.message))
      .finally(() => { _running = false; });
  }, POLL_INTERVAL_MS);
  if (_intervalHandle.unref) _intervalHandle.unref();
}

async function recoverTerminalAccessDenied() {
  const transaction = await sequelize.transaction();
  try {
    const [jobsResult] = await sequelize.query(
      `UPDATE plaud_clip_mirror_jobs j
       SET status        = 'failed_retryable',
           attempts      = 0,
           next_retry_at = NOW(),
           last_error    = 'Recovered terminal Access Denied after bucket fallback update',
           updated_at    = NOW()
       FROM plaud_clips c
       WHERE j.clip_id = c.clip_id
         AND j.status = 'failed_terminal'
         AND j.last_error ILIKE '%Access Denied%'
         AND c.r2_key IS NULL
         AND c.deleted_at IS NULL
       RETURNING j.clip_id`,
      { transaction },
    );
    const recoveredClipIds = (jobsResult || []).map((r) => r.clip_id);
    if (recoveredClipIds.length > 0) {
      await sequelize.query(
        `UPDATE plaud_clips SET r2_mirror_status = 'failed_retryable', updated_at = NOW()
         WHERE clip_id IN (:clipIds)`,
        { replacements: { clipIds: recoveredClipIds }, transaction },
      );
      logger.warn('[plaudR2MirrorWorker] recovered %d terminal Access Denied job(s)', recoveredClipIds.length);
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export function stopPlaudR2MirrorWorker() {
  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    logger.info('[plaudR2MirrorWorker] stopped');
  }
}

/** One worker cycle: stale recovery, claim batch, attempt uploads. */
export async function runOnce() {
  await recoverStaleInFlight();
  const claimed = await claimBatch();
  if (claimed.length === 0) return;
  logger.info('[plaudR2MirrorWorker] processing %d job(s)', claimed.length);
  for (const job of claimed) {
    await processJob(job).catch((err) => {
      logger.error('[plaudR2MirrorWorker] processJob unhandled: %s', err.message);
    });
  }
}

/**
 * Stale in_flight recovery (Codex Round 3 HIGH #1):
 * Any job stuck in_flight for >5min was abandoned by a crashed worker.
 * Flip back to failed_retryable so the next claim picks it up.
 * Also align plaud_clips.r2_mirror_status atomically.
 */
async function recoverStaleInFlight() {
  const transaction = await sequelize.transaction();
  try {
    const [jobsResult] = await sequelize.query(
      `UPDATE plaud_clip_mirror_jobs
       SET status        = 'failed_retryable',
           next_retry_at = NOW(),
           last_error    = 'Recovered stale in_flight after worker restart',
           updated_at    = NOW()
       WHERE status     = 'in_flight'
         AND updated_at < NOW() - INTERVAL '${STALE_IN_FLIGHT_MIN} minutes'
       RETURNING clip_id`,
      { transaction },
    );
    const recoveredClipIds = (jobsResult || []).map((r) => r.clip_id);
    if (recoveredClipIds.length > 0) {
      await sequelize.query(
        `UPDATE plaud_clips
         SET r2_mirror_status = 'failed_retryable',
             updated_at       = NOW()
         WHERE clip_id IN (:clipIds)`,
        { replacements: { clipIds: recoveredClipIds }, transaction },
      );
      logger.warn('[plaudR2MirrorWorker] recovered %d stale in_flight job(s)', recoveredClipIds.length);
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Atomically claim up to BATCH_SIZE jobs that are due for retry.
 * Uses FOR UPDATE SKIP LOCKED to allow horizontal scaling later.
 * Returns the claimed rows.
 */
async function claimBatch() {
  const transaction = await sequelize.transaction();
  try {
    const [rows] = await sequelize.query(
      `SELECT j.id, j.clip_id, j.attempts, c.user_id, c.storage_ext, c.mimetype
       FROM plaud_clip_mirror_jobs j
       JOIN plaud_clips c ON c.clip_id = j.clip_id
       WHERE j.status IN ('pending', 'failed_retryable')
         AND j.next_retry_at <= NOW()
         AND c.deleted_at IS NULL
       ORDER BY j.next_retry_at ASC
       LIMIT :limit
       FOR UPDATE SKIP LOCKED`,
      { replacements: { limit: BATCH_SIZE }, transaction },
    );

    if (!rows || rows.length === 0) {
      await transaction.commit();
      return [];
    }

    const ids = rows.map((r) => r.id);
    await sequelize.query(
      `UPDATE plaud_clip_mirror_jobs
       SET status     = 'in_flight',
           updated_at = NOW()
       WHERE id IN (:ids)`,
      { replacements: { ids }, transaction },
    );

    const clipIds = rows.map((r) => r.clip_id);
    await sequelize.query(
      `UPDATE plaud_clips
       SET r2_mirror_status = 'in_flight',
           updated_at       = NOW()
       WHERE clip_id IN (:clipIds)`,
      { replacements: { clipIds }, transaction },
    );

    await transaction.commit();
    return rows;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Attempt the R2 upload for one claimed job. Transition to mirrored on
 * success, failed_retryable (or failed_terminal after MAX_ATTEMPTS) on
 * failure. plaud_clips.r2_mirror_status updated atomically.
 */
async function processJob(job) {
  const { id: jobId, clip_id: clipId, user_id: userId, storage_ext: ext, mimetype, attempts } = job;
  try {
    const { r2Key } = await uploadClipToR2(userId, clipId, ext, mimetype);
    const transaction = await sequelize.transaction();
    try {
      await sequelize.query(
        `UPDATE plaud_clip_mirror_jobs
         SET status     = 'mirrored',
             attempts   = attempts + 1,
             last_error = NULL,
             updated_at = NOW()
         WHERE id = :id`,
        { replacements: { id: jobId }, transaction },
      );
      await sequelize.query(
        `UPDATE plaud_clips
         SET r2_key           = :r2Key,
             r2_mirror_status = 'mirrored',
             updated_at       = NOW()
         WHERE clip_id = :clipId`,
        { replacements: { r2Key, clipId }, transaction },
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
    logger.info('[plaudR2MirrorWorker] mirrored clip %s', clipId);
  } catch (err) {
    const nextAttempts = (attempts || 0) + 1;
    const terminal = nextAttempts >= MAX_ATTEMPTS;
    const newStatus = terminal ? 'failed_terminal' : 'failed_retryable';
    const backoffSec = BACKOFF_SECONDS[Math.min(nextAttempts - 1, BACKOFF_SECONDS.length - 1)];
    const transaction = await sequelize.transaction();
    try {
      await sequelize.query(
        `UPDATE plaud_clip_mirror_jobs
         SET status        = :status,
             attempts      = :attempts,
             last_error    = :error,
             next_retry_at = NOW() + (:backoff || ' seconds')::INTERVAL,
             updated_at    = NOW()
         WHERE id = :id`,
        {
          replacements: {
            id: jobId,
            status: newStatus,
            attempts: nextAttempts,
            error: String(err.message || err).slice(0, 500),
            backoff: String(backoffSec),
          },
          transaction,
        },
      );
      await sequelize.query(
        `UPDATE plaud_clips
         SET r2_mirror_status = :status,
             updated_at       = NOW()
         WHERE clip_id = :clipId`,
        { replacements: { status: newStatus, clipId }, transaction },
      );
      await transaction.commit();
    } catch (txErr) {
      await transaction.rollback();
      logger.error('[plaudR2MirrorWorker] failed to record failure: %s', txErr.message);
      return;
    }
    if (terminal) {
      logger.error('[plaudR2MirrorWorker] FAILED_TERMINAL clip=%s attempts=%d err=%s',
        clipId, nextAttempts, err.message);
    } else {
      logger.warn('[plaudR2MirrorWorker] failed_retryable clip=%s attempts=%d backoff=%ds err=%s',
        clipId, nextAttempts, backoffSec, err.message);
    }
  }
};

export const _internal = { recoverStaleInFlight, recoverTerminalAccessDenied, claimBatch, processJob, BACKOFF_SECONDS, MAX_ATTEMPTS };
