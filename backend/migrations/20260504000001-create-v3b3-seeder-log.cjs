/**
 * Migration: Create `_v3b3_seeder_log` (V3b.3.8 — final form)
 * ============================================================
 *
 * Provenance ledger for the V3b.3.3 NASM corrective starter seeder.
 *
 * Final form per Codex Round 5 (2026-05-03T07:15:38) option 1:
 *   "Do not perform static provenance backfill universally. Create the
 *    log table only; require seeder runtime branches to populate
 *    provenance."
 *
 * History of this migration's backfill logic:
 *   V3b.3.5 — timestamp-cutoff backfill
 *             (Codex Round 2: cutoff is brittle).
 *   V3b.3.6 — static keylist backfill
 *             (Codex Round 3: still has timestamp + blanket LIKE
 *              inside the backfill query).
 *   V3b.3.7 — keylist + COUNT==32 precondition gate
 *             (Codex Round 5: COUNT proof is not equivalent to "this
 *              environment has the production provenance partition").
 *   V3b.3.8 — NO backfill at all (this commit). Migration just creates
 *             the table. Seeder runtime branches own all provenance.
 *
 * Production note: production already has the log populated correctly
 * (24 'inserted' + 8 'enriched') from the V3b.3.5 path. Removing the
 * backfill from this migration file does not change production —
 * the migration is already applied. The log table is the persistent
 * ground truth from here on.
 *
 * Schema:
 *   _v3b3_seeder_log (
 *     exercise_key VARCHAR(255) PRIMARY KEY,
 *     action       VARCHAR(20)  NOT NULL,
 *     run_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
 *   )
 *
 * SAFETY:
 *   - Idempotent (`to_regclass` check before CREATE TABLE).
 *   - Strictly additive (no Exercises-table changes, no row mutations).
 *   - Transaction-wrapped.
 *   - Cannot misclassify any provenance — there's no provenance written
 *     here. The seeder's Branch C writes 'inserted' on actual insert;
 *     Branch B writes 'enriched' on actual name-match enrichment;
 *     Branch A writes 'enriched' (data-loss-safe default) for any
 *     unlogged keys, with ON CONFLICT DO NOTHING preserving any
 *     existing entry.
 */

'use strict';

module.exports = {
  async up(queryInterface) {
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
        console.log('_v3b3_seeder_log table created');
      } else {
        console.log('_v3b3_seeder_log already exists (no-op)');
      }

      // No backfill. Provenance is owned by the seeder's runtime
      // branches. This eliminates every class of misclassification
      // Codex flagged across rounds 2-5: no timestamps, no key-presence
      // heuristics, no production-snapshot inference. The seeder
      // records 'inserted'/'enriched' directly as it acts.

      await transaction.commit();
      console.log('V3b.3.8 migration completed (table-only, no backfill)');
    } catch (error) {
      await transaction.rollback();
      console.error('V3b.3.8 migration failed:', error.message);
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
      console.log('_v3b3_seeder_log dropped');
    } catch (error) {
      await transaction.rollback();
      console.error('V3b.3.8 rollback failed:', error.message);
      throw error;
    }
  },
};
