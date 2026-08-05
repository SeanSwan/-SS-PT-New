'use strict';

/**
 * S3.0 (nutrition blueprint 2026-08-04): ENUM expansion deployed BEFORE any
 * writer ships — the reward loop (evaluator, streaks, nudge notifications)
 * writes these labels, and an insert against a label the type does not carry
 * fails at runtime while every caller-side catch swallows it silently (the
 * exact failure mode 20260804040000 fixed for session notifications).
 *
 * House pattern (20260804040000 + 20260623060000): additive-only ADD VALUE
 * IF NOT EXISTS, ONE statement per value, NO transaction wrapper (ALTER TYPE
 * ... ADD VALUE must not run inside an explicit transaction block on PG < 12;
 * plain statements work on all versions). The pg_type guard makes a missing
 * type a no-op instead of a crash (fresh/sync()-built databases can lack it).
 */
const ADDITIONS = [
  { type: 'enum_PointTransactions_source', label: 'nutrition_log' },
  { type: 'enum_streaks_streakType', label: 'nutrition' },
  { type: 'enum_notifications_type', label: 'nutrition' },
];

module.exports = {
  async up(queryInterface) {
    for (const { type, label } of ADDITIONS) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_type WHERE typname = '${type}' LIMIT 1`
      );
      if (!Array.isArray(rows) || rows.length === 0) continue;
      await queryInterface.sequelize.query(
        `ALTER TYPE "${type}" ADD VALUE IF NOT EXISTS '${label}'`
      );
    }
  },

  // Postgres cannot remove enum labels without recreating the type; rows may
  // hold the new labels by rollback time. Additive change — down is a no-op.
  async down() {
    return Promise.resolve();
  },
};
