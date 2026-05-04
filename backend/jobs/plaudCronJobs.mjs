/**
 * plaudCronJobs.mjs
 * ==================
 * In-process cron-style jobs for the PLAUD merge ingestion lifecycle.
 *
 * Phase 3 Slice 3.9 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §19.2.
 *
 * Four jobs registered:
 *   plaudClipTtlCron        (5 min) — sweep stale uploading + expired clips
 *   plaudCipherPurgeCron    (5 min) — explicit purge query (Codex Round 4 MED #3)
 *   plaudMergeLockSweepCron (60 s)  — backstop expired-lock cleanup
 *   plaudStaleMergeSweeper  (5 min) — flip processing >20min to failed
 *                                     (Codex Round 3 HIGH #3)
 *
 * Each job is gated on PLAUD_TTL_CRON_ENABLED=true so non-production
 * environments can opt out. The startup function is also gated — if
 * the env var is unset, the cron jobs simply don't run.
 *
 * Worker bootstrap (plaudR2MirrorWorker) is in its own module per slice
 * 3.3; this file only manages the cron jobs.
 */
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { sweepExpired as sweepExpiredLocks } from '../services/plaudMergeLockService.mjs';
import { deleteClip } from '../services/plaudClipStorageDualTier.mjs';

// Intervals (ms)
const CLIP_TTL_INTERVAL_MS = 5 * 60 * 1000;
const CIPHER_PURGE_INTERVAL_MS = 5 * 60 * 1000;
const LOCK_SWEEP_INTERVAL_MS = 60 * 1000;
const STALE_MERGE_INTERVAL_MS = 5 * 60 * 1000;

// Stale-uploading threshold (Codex Round 3 HIGH #2)
const STALE_UPLOADING_MIN = 5;

// Stale-processing threshold (Codex Round 3 HIGH #3)
const STALE_PROCESSING_MIN = 20;

const _intervals = [];

export function startPlaudCronJobs() {
  if (process.env.PLAUD_TTL_CRON_ENABLED !== 'true') {
    logger.info('[plaudCron] PLAUD_TTL_CRON_ENABLED != true — not starting');
    return;
  }
  if (_intervals.length > 0) {
    logger.warn('[plaudCron] already started, skipping');
    return;
  }

  logger.info('[plaudCron] starting clip TTL, cipher purge, lock sweep, stale merge sweepers');

  // Run all four once at startup, then schedule
  runAll().catch((err) => logger.error('[plaudCron] startup run failed: %s', err.message));

  _intervals.push(scheduleJob(plaudClipTtlCron, CLIP_TTL_INTERVAL_MS, 'clipTtl'));
  _intervals.push(scheduleJob(plaudCipherPurgeCron, CIPHER_PURGE_INTERVAL_MS, 'cipherPurge'));
  _intervals.push(scheduleJob(plaudMergeLockSweepCron, LOCK_SWEEP_INTERVAL_MS, 'lockSweep'));
  _intervals.push(scheduleJob(plaudStaleMergeSweeper, STALE_MERGE_INTERVAL_MS, 'staleMerge'));
}

export function stopPlaudCronJobs() {
  for (const handle of _intervals) {
    clearInterval(handle);
  }
  _intervals.length = 0;
  logger.info('[plaudCron] stopped');
}

function scheduleJob(fn, intervalMs, name) {
  let running = false;
  const handle = setInterval(() => {
    if (running) return;
    running = true;
    fn()
      .catch((err) => logger.error('[plaudCron:%s] cycle error: %s', name, err.message))
      .finally(() => { running = false; });
  }, intervalMs);
  if (handle.unref) handle.unref();
  return handle;
}

async function runAll() {
  await Promise.allSettled([
    plaudClipTtlCron(),
    plaudCipherPurgeCron(),
    plaudMergeLockSweepCron(),
    plaudStaleMergeSweeper(),
  ]);
}

/**
 * Sweep stale uploading clips (>5min in 'uploading') → 'lost'.
 * Sweep expired clips (past expires_at) → 'expired' + best-effort delete from disk + R2.
 */
export async function plaudClipTtlCron() {
  // Stale uploading: row was created but Phase B/C never finished
  const [staleResult] = await sequelize.query(
    `UPDATE plaud_clips
     SET status     = 'lost',
         updated_at = NOW()
     WHERE status     = 'uploading'
       AND uploaded_at < NOW() - INTERVAL '${STALE_UPLOADING_MIN} minutes'
     RETURNING clip_id`,
  );
  if (staleResult && staleResult.length > 0) {
    logger.warn('[plaudCron:clipTtl] marked %d stale uploading clips as lost', staleResult.length);
  }

  // Expired clips: past 24h TTL, status not already terminal
  const [expiredRows] = await sequelize.query(
    `UPDATE plaud_clips
     SET status     = 'expired',
         updated_at = NOW()
     WHERE expires_at < NOW()
       AND status IN ('uploading', 'pending_merge', 'merged')
       AND deleted_at IS NULL
     RETURNING clip_id, user_id, storage_ext, r2_key`,
  );
  if (expiredRows && expiredRows.length > 0) {
    logger.info('[plaudCron:clipTtl] expired %d clips', expiredRows.length);
    // Best-effort cleanup of disk + R2
    for (const row of expiredRows) {
      try {
        await deleteClip(row.user_id, row.clip_id, row.storage_ext, { r2Key: row.r2_key });
      } catch (err) {
        logger.warn('[plaudCron:clipTtl] cleanup failed for %s: %s', row.clip_id, err.message);
      }
    }
  }
}

/**
 * Cipher purge cron (Codex Round 4 MEDIUM #3 — explicit query):
 * For merge_requests past expires_at, NULL the cipher columns and flip
 * status to 'expired' (only for processing/completed; failed stays for
 * audit; approved/discarded already cipher-clean).
 */
export async function plaudCipherPurgeCron() {
  // Codex Pass 2 HIGH #1 fix: do NOT expire 'processing' rows that still
  // have an active lock — that would race with an in-flight merge whose
  // finalization is about to commit. Processing rows without an active
  // lock are stale and safe to expire (they'd be flipped to 'failed' by
  // plaudStaleMergeSweeper anyway, but expiring is also acceptable).
  const [, meta] = await sequelize.query(
    `UPDATE plaud_merge_requests mr
     SET status = CASE
           WHEN status IN ('processing', 'completed') THEN 'expired'
           ELSE status
         END,
         payload_cipher   = NULL,
         payload_iv       = NULL,
         payload_tag      = NULL,
         cipher_purged_at = NOW()
     WHERE expires_at      < NOW()
       AND cipher_purged_at IS NULL
       AND status NOT IN ('approved', 'discarded')
       AND NOT EXISTS (
         SELECT 1 FROM plaud_merge_locks l
         WHERE l.job_id = mr.merge_request_id
           AND l.locked_until > NOW()
       )`,
  );
  const count = meta?.rowCount || 0;
  if (count > 0) logger.info('[plaudCron:cipherPurge] purged cipher on %d merge_requests', count);
}

/**
 * Lock sweep — delete locks past locked_until. Backstop in case the
 * atomic-takeover query misses (e.g. orphaned lock from crashed merge).
 */
export async function plaudMergeLockSweepCron() {
  await sweepExpiredLocks();
}

/**
 * Stale processing sweeper (Codex Round 3 HIGH #3):
 * Flip processing >20min (with no active lock) to failed. Surfaces
 * to the trainer in the failsafe-resume list with appropriate UI copy.
 */
export async function plaudStaleMergeSweeper() {
  const [, meta] = await sequelize.query(
    `UPDATE plaud_merge_requests mr
     SET status     = 'failed',
         error_code = 'MERGE_PROCESSING_STALE'
     WHERE mr.status     = 'processing'
       AND mr.created_at < NOW() - INTERVAL '${STALE_PROCESSING_MIN} minutes'
       AND NOT EXISTS (
         SELECT 1 FROM plaud_merge_locks l
         WHERE l.job_id = mr.merge_request_id
           AND l.locked_until > NOW()
       )`,
  );
  const count = meta?.rowCount || 0;
  if (count > 0) logger.warn('[plaudCron:staleMerge] flipped %d processing → failed (MERGE_PROCESSING_STALE)', count);
}

export const _internal = {
  CLIP_TTL_INTERVAL_MS,
  CIPHER_PURGE_INTERVAL_MS,
  LOCK_SWEEP_INTERVAL_MS,
  STALE_MERGE_INTERVAL_MS,
  STALE_UPLOADING_MIN,
  STALE_PROCESSING_MIN,
};
