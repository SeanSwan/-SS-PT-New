/**
 * plaudMergeLockService.mjs
 * ==========================
 * DB-backed per-user merge lock with 15-minute TTL + atomic
 * expired-lock takeover + heartbeat.
 *
 * Phase 3 Slice 3.4 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §10.
 *
 * Codex Round 2 HIGH #2 fix: atomic upsert with WHERE expired clause.
 *   INSERT ... ON CONFLICT (user_id) DO UPDATE
 *     SET ... WHERE plaud_merge_locks.locked_until < NOW()
 *   RETURNING user_id;
 *
 * Empty RETURNING means the lock is held by an active live job → 409.
 * Non-empty RETURNING means we either acquired (no prior row) OR took
 * over an expired lock without waiting on the cron sweep.
 *
 * Codex Round 4 HIGH fix: lock fencing happens in §5.4 step 14 within
 * the SAME transaction as the side-effect updates (this service exposes
 * the verification query separately so the merge controller can use it
 * inside its own transaction).
 *
 * Public API:
 *   acquireLock({ userId, jobId, ttlMinutes }) -> { acquired: bool }
 *   releaseLock({ userId, jobId }) -> { released: bool }
 *   heartbeat({ userId, jobId, ttlMinutes }) -> { extended: bool }
 *   verifyHolder({ userId, jobId, transaction }) -> bool   // for fencing
 *   sweepExpired() -> { swept: number }
 */
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

const DEFAULT_TTL_MIN = 15;

/**
 * Atomic acquire / expired-takeover. Returns acquired=true if the
 * caller now owns the lock; false if a live (non-expired) lock is
 * held by someone else.
 */
export async function acquireLock({ userId, jobId, ttlMinutes = DEFAULT_TTL_MIN }) {
  if (!Number.isInteger(userId) || userId <= 0) throw new Error(`Invalid userId: ${userId}`);
  if (!/^[0-9a-fA-F-]{36}$/.test(String(jobId || ''))) throw new Error(`Invalid jobId: ${jobId}`);
  const ttl = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? Math.floor(ttlMinutes) : DEFAULT_TTL_MIN;
  const [rows] = await sequelize.query(
    `INSERT INTO plaud_merge_locks (user_id, job_id, locked_until)
     VALUES (:userId, :jobId, NOW() + (:ttl || ' minutes')::INTERVAL)
     ON CONFLICT (user_id) DO UPDATE
       SET job_id       = EXCLUDED.job_id,
           locked_at    = NOW(),
           locked_until = EXCLUDED.locked_until
       WHERE plaud_merge_locks.locked_until < NOW()
     RETURNING user_id`,
    { replacements: { userId, jobId, ttl: String(ttl) } },
  );
  return { acquired: (rows || []).length > 0 };
}

/**
 * Release the lock if (and only if) the caller still owns it under the
 * given jobId. Returns released=true if a row was deleted.
 */
export async function releaseLock({ userId, jobId }) {
  const [rows, meta] = await sequelize.query(
    `DELETE FROM plaud_merge_locks
     WHERE user_id = :userId AND job_id = :jobId
     RETURNING user_id`,
    { replacements: { userId, jobId } },
  );
  // Sequelize returns [rows, meta] for raw queries; handle both shapes.
  const count = Array.isArray(rows) ? rows.length : (meta?.rowCount || 0);
  return { released: count > 0 };
}

/**
 * Heartbeat: extend lock TTL while still holding it. Returns extended=
 * true if the lock was successfully extended.
 */
export async function heartbeat({ userId, jobId, ttlMinutes = DEFAULT_TTL_MIN }) {
  const ttl = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? Math.floor(ttlMinutes) : DEFAULT_TTL_MIN;
  const [rows] = await sequelize.query(
    `UPDATE plaud_merge_locks
     SET locked_until = NOW() + (:ttl || ' minutes')::INTERVAL
     WHERE user_id = :userId AND job_id = :jobId AND locked_until > NOW()
     RETURNING user_id`,
    { replacements: { userId, jobId, ttl: String(ttl) } },
  );
  return { extended: (rows || []).length > 0 };
}

/**
 * Verify the caller still owns the lock under their job_id and the
 * lock hasn't expired. MUST be called inside the same transaction as
 * the final side-effect updates (Codex Round 4 HIGH atomic-finalization
 * fix). Uses SELECT ... FOR UPDATE to prevent another claimant from
 * taking over the lock between this check and the side-effect commit.
 *
 * @param {object} args
 * @param {number} args.userId
 * @param {string} args.jobId
 * @param {object} args.transaction - Sequelize transaction object
 * @returns {Promise<boolean>} true if lock still held
 */
export async function verifyHolder({ userId, jobId, transaction }) {
  if (!transaction) throw new Error('verifyHolder MUST be called inside a transaction');
  const [rows] = await sequelize.query(
    `SELECT 1 AS held
     FROM plaud_merge_locks
     WHERE user_id = :userId
       AND job_id = :jobId
       AND locked_until > NOW()
     FOR UPDATE`,
    { replacements: { userId, jobId }, transaction },
  );
  return (rows || []).length > 0;
}

/**
 * Cron: delete all expired locks. Called every 60s by
 * plaudMergeLockSweepCron (slice 3.9). Returns number of rows swept.
 */
export async function sweepExpired() {
  const [, meta] = await sequelize.query(
    `DELETE FROM plaud_merge_locks WHERE locked_until < NOW()`,
  );
  const count = meta?.rowCount || 0;
  if (count > 0) logger.info('[plaudMergeLockService] swept %d expired lock(s)', count);
  return { swept: count };
}
