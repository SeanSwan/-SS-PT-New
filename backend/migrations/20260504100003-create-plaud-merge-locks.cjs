/**
 * Migration: Create `plaud_merge_locks` (Phase 3 Slice 3.1)
 * ==========================================================
 *
 * Per-user merge lock with 15-minute TTL + heartbeat. Prevents
 * concurrent merges from the same trainer (each merge owns the lock
 * until its workflow completes or the lock expires).
 *
 * v3.3 plan reference: §10
 * Codex Round 2 HIGH #2 (atomic expired-lock takeover) + Round 4 HIGH (atomic finalization).
 *
 * Acquire (atomic with expired-lock takeover):
 *   INSERT INTO plaud_merge_locks (user_id, job_id, locked_until)
 *   VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
 *   ON CONFLICT (user_id) DO UPDATE
 *     SET job_id = EXCLUDED.job_id,
 *         locked_at = NOW(),
 *         locked_until = EXCLUDED.locked_until
 *     WHERE plaud_merge_locks.locked_until < NOW()
 *   RETURNING user_id;
 *
 * Sweep (cron, every 60s):
 *   DELETE FROM plaud_merge_locks WHERE locked_until < NOW();
 *
 * Heartbeat (during long-running merge):
 *   UPDATE plaud_merge_locks SET locked_until = NOW() + INTERVAL '15 minutes'
 *   WHERE user_id = $1 AND job_id = $2;
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public.plaud_merge_locks') AS exists`,
        { transaction },
      );
      if (rows[0]?.exists) {
        console.log('plaud_merge_locks already exists (no-op)');
        await transaction.commit();
        return;
      }

      await queryInterface.sequelize.query(
        `CREATE TABLE plaud_merge_locks (
           user_id      INTEGER PRIMARY KEY REFERENCES "Users"(id) ON DELETE CASCADE,
           job_id       UUID NOT NULL,
           locked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           locked_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX plaud_merge_locks_expired_idx
           ON plaud_merge_locks (locked_until)`,
        { transaction },
      );

      await transaction.commit();
      console.log('plaud_merge_locks created');
    } catch (err) {
      await transaction.rollback();
      console.error('plaud_merge_locks migration failed:', err.message);
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS plaud_merge_locks CASCADE`,
        { transaction },
      );
      await transaction.commit();
      console.log('plaud_merge_locks dropped');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
