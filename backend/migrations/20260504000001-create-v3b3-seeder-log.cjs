/**
 * Migration: Create `_v3b3_seeder_log` (V3b.3.5)
 * ===============================================
 *
 * Provenance ledger for the V3b.3.3 NASM corrective starter seeder.
 *
 * Codex Round 2 review (2026-05-03T06:44:49) flagged two HIGHs against
 * the seeder's previous timestamp-based provenance:
 *
 *   1. `down()` queries used `LIKE 'ces-%'` predicates which are not
 *      scoped to this seeder's manifest — a future seeder/source that
 *      inserts a `ces-*` row would be silently deleted on rollback.
 *   2. The `createdAt` cutoff ('2026-05-02 21:00:00+00') misclassifies
 *      legitimate pre-existing rows whose `createdAt` happens to land
 *      after the cutoff (e.g. an admin manually adds a `Bird Dog` row
 *      tomorrow → seeder enriches it → rollback deletes it because
 *      createdAt > cutoff).
 *
 * Fix: a dedicated provenance table that records, for every row this
 * seeder touches, whether the row was INSERTED or ENRICHED. The seeder
 * `down()` then consults this table — restricted to the seeder's
 * manifest — and rolls back exactly what it did, regardless of
 * timestamps and regardless of any other ces-* rows that exist.
 *
 * Schema:
 *   _v3b3_seeder_log (
 *     exercise_key VARCHAR(255) PRIMARY KEY,
 *     action       VARCHAR(20)  NOT NULL,  -- 'inserted' | 'enriched'
 *     run_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
 *   )
 *
 * Backfill: the seeder already ran in production (commit a580df8ba
 * onward). Before the log existed, we have 24 inserted rows and 8
 * enriched rows. This migration backfills entries for those existing
 * rows using the SAME timestamp cutoff that the prior down() used —
 * but the cutoff is now isolated to a one-shot, runs-only-once
 * migration. After backfill, all subsequent provenance is recorded by
 * the seeder itself via direct branch assignment, not heuristics.
 *
 * SAFETY:
 *   - Idempotent: information_schema check before CREATE TABLE.
 *   - Backfill is INSERT … ON CONFLICT DO NOTHING — never overwrites
 *     existing log entries.
 *   - Transaction-wrapped.
 *   - Strictly additive: no removals, no Exercises-table changes.
 */

'use strict';

const V3B3_SHIP_CUTOFF = '2026-05-02 21:00:00+00';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public._v3b3_seeder_log') AS exists`,
        { transaction },
      );
      const tableExists = !!rows[0]?.exists;

      if (!tableExists) {
        console.log('Creating _v3b3_seeder_log...');
        await queryInterface.sequelize.query(
          `CREATE TABLE _v3b3_seeder_log (
             exercise_key VARCHAR(255) PRIMARY KEY,
             action       VARCHAR(20)  NOT NULL CHECK (action IN ('inserted', 'enriched')),
             run_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
           )`,
          { transaction },
        );
        console.log('✅ _v3b3_seeder_log table created');
      } else {
        console.log('⏭  _v3b3_seeder_log already exists');
      }

      // Backfill ledger entries for the 32 ces-* rows that already exist
      // in production from the V3b.3.3 first run. Classified via the
      // timestamp cutoff (the only signal we have for already-shipped
      // rows). ON CONFLICT DO NOTHING so re-running this migration on a
      // partially-backfilled state is safe.
      const [backfillResult] = await queryInterface.sequelize.query(
        `INSERT INTO _v3b3_seeder_log (exercise_key, action, run_at)
         SELECT exercise_key,
                CASE WHEN "createdAt" > :cutoff THEN 'inserted' ELSE 'enriched' END AS action,
                NOW()
           FROM "Exercises"
          WHERE exercise_key LIKE 'ces-%'
         ON CONFLICT (exercise_key) DO NOTHING
         RETURNING exercise_key, action`,
        { replacements: { cutoff: V3B3_SHIP_CUTOFF }, transaction },
      );
      const backfilled = (backfillResult || []).length;
      console.log(`✅ V3b.3.5 backfilled ${backfilled} provenance entries for existing ces-* rows`);

      await transaction.commit();
      console.log('✅ V3b.3.5 migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ V3b.3.5 migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS _v3b3_seeder_log`,
        { transaction },
      );
      await transaction.commit();
      console.log('✅ _v3b3_seeder_log dropped');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ V3b.3.5 rollback failed:', error.message);
      throw error;
    }
  },
};
