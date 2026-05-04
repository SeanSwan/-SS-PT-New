/**
 * Migration: Create `plaud_clip_mirror_jobs` (Phase 3 Slice 3.1)
 * ===============================================================
 *
 * R2 mirror outbox for PLAUD clips. Worker polls this table to upload
 * clip files from disk to Cloudflare R2 (durability backstop).
 *
 * v3.3 plan reference: §4.3
 * Codex Round 2 CRIT #3 (state machine consistency) + MEDIUM #3 (UNIQUE per clip).
 *
 * State machine:
 *   pending          -> awaiting first attempt
 *   in_flight        -> worker has picked it up
 *   mirrored         -> success (terminal)
 *   failed_retryable -> failed, will retry per backoff (30s, 1m, 5m, 30m, 2h)
 *   failed_terminal  -> max attempts hit (5); alert logged
 *
 * Worker query:
 *   SELECT * FROM plaud_clip_mirror_jobs
 *   WHERE status IN ('pending', 'failed_retryable')
 *     AND next_retry_at <= NOW()
 *   ORDER BY next_retry_at ASC LIMIT 10
 *   FOR UPDATE SKIP LOCKED;
 *
 * Stale in_flight recovery (Codex Round 3 HIGH #1):
 *   UPDATE ... SET status = 'failed_retryable', next_retry_at = NOW()
 *   WHERE status = 'in_flight' AND updated_at < NOW() - INTERVAL '5 minutes';
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public.plaud_clip_mirror_jobs') AS exists`,
        { transaction },
      );
      if (rows[0]?.exists) {
        console.log('plaud_clip_mirror_jobs already exists (no-op)');
        await transaction.commit();
        return;
      }

      await queryInterface.sequelize.query(
        `CREATE TABLE plaud_clip_mirror_jobs (
           id              BIGSERIAL PRIMARY KEY,
           clip_id         UUID NOT NULL UNIQUE REFERENCES plaud_clips(clip_id) ON DELETE CASCADE,
           attempts        SMALLINT NOT NULL DEFAULT 0,
           last_error      TEXT,
           next_retry_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           status          VARCHAR(24) NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending','in_flight','mirrored','failed_retryable','failed_terminal')),
           created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX plaud_clip_mirror_jobs_next_retry_idx
           ON plaud_clip_mirror_jobs (next_retry_at)
           WHERE status IN ('pending', 'failed_retryable')`,
        { transaction },
      );

      await transaction.commit();
      console.log('plaud_clip_mirror_jobs created');
    } catch (err) {
      await transaction.rollback();
      console.error('plaud_clip_mirror_jobs migration failed:', err.message);
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS plaud_clip_mirror_jobs CASCADE`,
        { transaction },
      );
      await transaction.commit();
      console.log('plaud_clip_mirror_jobs dropped');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
