'use strict';

/**
 * Migration: enforce "exactly one active workout plan per user" via a
 * Postgres partial unique index.
 *
 * Plan Library slice (REV 2 receipt §6.1, 2026-05-01).
 *
 * up() steps:
 *   1) Audit-and-demote: if any client currently has multiple `status='active'`
 *      rows, keep the most recently updated and demote the rest to 'paused'.
 *      Tiebreak: most recent `updatedAt`, then highest `id` (deterministic).
 *      Reason: without this step, the partial unique index would fail to apply
 *      on production data that already has duplicate-active rows.
 *   2) Create partial unique index on `("userId") WHERE status='active'`.
 *      Postgres rejects any INSERT/UPDATE that would create a second active
 *      row for the same userId with SQLSTATE 23505 (unique_violation).
 *
 * down() reverses only the index. The demotion is intentionally NOT rolled back
 * — once duplicates are demoted, restoring them would re-create the inconsistent
 * pre-migration state. If a rollback is needed and the demoted rows must be
 * restored, do it manually with a clear forensic record of which rows were
 * demoted (run the audit query before re-running the migration).
 *
 * Pre-flight audit (run manually before migration to know what will change):
 *   SELECT "userId", COUNT(*) AS active_count
 *   FROM workout_plans
 *   WHERE status = 'active'
 *   GROUP BY "userId"
 *   HAVING COUNT(*) > 1;
 */

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    // Step 1: demote duplicate-active rows. Keep one active per userId.
    // ORDER BY updatedAt DESC, id DESC — id tiebreak is deterministic when
    // updatedAt is identical (rare but possible under bulk inserts).
    await sequelize.query(`
      WITH ranked AS (
        SELECT id, "userId", status,
          ROW_NUMBER() OVER (
            PARTITION BY "userId"
            ORDER BY "updatedAt" DESC, "id" DESC
          ) AS rn
        FROM workout_plans
        WHERE status = 'active'
      )
      UPDATE workout_plans
      SET status = 'paused', "updatedAt" = NOW()
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
    `);

    // Step 2: partial unique index. Idempotent via IF NOT EXISTS so re-running
    // on a DB where the index already exists is a no-op rather than an error.
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS workout_plans_one_active_per_user
        ON workout_plans ("userId")
        WHERE status = 'active';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS workout_plans_one_active_per_user;`
    );
    // Demotion intentionally NOT reversed — see file-level comment.
  },
};
