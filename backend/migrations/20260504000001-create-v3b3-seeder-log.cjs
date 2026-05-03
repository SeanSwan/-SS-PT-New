/**
 * Migration: Create `_v3b3_seeder_log` (V3b.3.6)
 * ===============================================
 *
 * Provenance ledger for the V3b.3.3 NASM corrective starter seeder.
 *
 * Codex Round 3 review (2026-05-03T06:58:31) closed the down()-overbreadth
 * and timestamp-brittleness HIGHs from Round 2 for the runtime seeder
 * path, but flagged that this migration's BACKFILL still used the
 * same timestamp heuristic + blanket `LIKE 'ces-%'`. That made the
 * ledger correct for our specific production snapshot but unsafe for
 * any other environment whose pre-ledger state differs.
 *
 * V3b.3.6 fix: backfill is now driven by static, hardcoded keylists.
 * No timestamps, no blanket LIKE. The 32 V3b.3.3 manifest keys are
 * partitioned into:
 *   - V3B3_ENRICHED_KEYS — 8 rows that pre-existed in production and
 *     were enriched by Branch B on the first seeder run.
 *   - V3B3_INSERTED_KEYS — 24 rows that the seeder inserted fresh.
 *
 * Backfill rule:
 *   - Only insert ledger entries for ces-* rows whose key is in the
 *     manifest (no `LIKE 'ces-%'` net).
 *   - Action is determined by which keylist the key appears in.
 *   - For environments where some manifest keys haven't been seeded
 *     yet, the backfill is a no-op for those keys (they don't exist
 *     in Exercises yet); the seeder will record their provenance when
 *     it runs.
 *
 * Schema:
 *   _v3b3_seeder_log (
 *     exercise_key VARCHAR(255) PRIMARY KEY,
 *     action       VARCHAR(20)  NOT NULL,  -- 'inserted' | 'enriched'
 *     run_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
 *   )
 *
 * SAFETY:
 *   - Idempotent: `to_regclass` check before CREATE TABLE.
 *   - Backfill is INSERT … ON CONFLICT DO NOTHING — never overwrites
 *     existing log entries.
 *   - Transaction-wrapped.
 *   - Strictly additive: no removals, no Exercises-table changes.
 */

'use strict';

// V3b.3.6: static keylist partition. Determined from the actual
// V3b.3.3 first-run audit (2026-05-02). These 8 names already lived in
// the production registry (inserted by other seeders months prior —
// foam-roll/stretch/core drills); Branch B enriched them in place.
const V3B3_ENRICHED_KEYS = [
  'ces-90-90-hip-stretch',
  'ces-foam-roll-it-band',
  'ces-kneeling-hip-flexor-stretch',
  'ces-prone-cobra',
  'ces-quadruped-hip-extension',
  'ces-levator-scap-stretch',
  'ces-standing-quad-stretch',
  'ces-dead-bug',
];

// V3b.3.6: the remaining 24 V3b.3.3 manifest keys. Branch C inserted
// these fresh on the first run (no name collision in the registry).
const V3B3_INSERTED_KEYS = [
  'ces-foam-roll-pec',
  'ces-foam-roll-lat',
  'ces-foam-roll-upper-trap',
  'ces-lacrosse-scm',
  'ces-doorway-pec-stretch',
  'ces-upper-trap-stretch',
  'ces-lat-overhead-stretch',
  'ces-chin-tuck',
  'ces-wall-slides',
  'ces-ytw-stability-ball',
  'ces-foam-roll-tfl',
  'ces-foam-roll-hip-flexor',
  'ces-foam-roll-erectors',
  'ces-foam-roll-adductors',
  'ces-childs-pose',
  'ces-glute-bridge',
  'ces-bird-dog',
  'ces-foam-roll-peroneals',
  'ces-gastrocnemius-stretch',
  'ces-adductor-stretch',
  'ces-single-leg-balance-reach',
  'ces-lateral-band-walks',
  'ces-single-leg-squat-tap',
  'ces-squat-to-row-cable',
];

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
        console.log('✅ _v3b3_seeder_log table created');
      } else {
        console.log('⏭  _v3b3_seeder_log already exists');
      }

      // V3b.3.7 precondition gate: backfill is production-snapshot-specific.
      // The static keylist partition only describes the post-V3b.3.3-first-run
      // production state. For any other environment (fresh dev, partial
      // manual state, mid-migration), backfilling with our static actions
      // would encode fiction. So we backfill ONLY when ALL 32 manifest keys
      // exist in "Exercises" — a strong signal that this env actually ran
      // the seeder and is now reaching for the ledger.
      //
      // For environments where the precondition fails (fresh installs,
      // partial state, etc.), the seeder's runtime branches will record
      // their own provenance directly when they run. The seeder also
      // tolerates missing log entries on Branch A by defaulting to
      // 'enriched' (data-loss-safe per Codex Round 4 option C).
      const allManifestKeys = [...V3B3_ENRICHED_KEYS, ...V3B3_INSERTED_KEYS];
      const [manifestPresenceRows] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS n
           FROM "Exercises"
          WHERE exercise_key IN (:keys)`,
        { replacements: { keys: allManifestKeys }, transaction },
      );
      const manifestPresent = parseInt(manifestPresenceRows[0]?.n || '0', 10);
      const expected = allManifestKeys.length; // 32

      let enrichedBackfilled = 0;
      let insertedBackfilled = 0;

      if (manifestPresent === expected) {
        console.log(
          `✓ V3b.3.7 backfill precondition met (${manifestPresent}/${expected} manifest keys present in Exercises)`,
        );

        const [enrichedResult] = await queryInterface.sequelize.query(
          `INSERT INTO _v3b3_seeder_log (exercise_key, action, run_at)
           SELECT exercise_key, 'enriched', NOW()
             FROM "Exercises"
            WHERE exercise_key IN (:keys)
           ON CONFLICT (exercise_key) DO NOTHING
           RETURNING exercise_key`,
          { replacements: { keys: V3B3_ENRICHED_KEYS }, transaction },
        );
        enrichedBackfilled = (enrichedResult || []).length;

        const [insertedResult] = await queryInterface.sequelize.query(
          `INSERT INTO _v3b3_seeder_log (exercise_key, action, run_at)
           SELECT exercise_key, 'inserted', NOW()
             FROM "Exercises"
            WHERE exercise_key IN (:keys)
           ON CONFLICT (exercise_key) DO NOTHING
           RETURNING exercise_key`,
          { replacements: { keys: V3B3_INSERTED_KEYS }, transaction },
        );
        insertedBackfilled = (insertedResult || []).length;

        console.log(
          `✅ V3b.3.7 backfilled ${enrichedBackfilled} 'enriched' + ${insertedBackfilled} 'inserted' provenance entries`,
        );
      } else {
        console.log(
          `⏭  V3b.3.7 backfill SKIPPED — only ${manifestPresent}/${expected} manifest keys present in "Exercises". ` +
            `This is the expected behavior for environments that haven't seeded yet, partial states, or fresh installs. ` +
            `The seeder will record provenance directly when it runs.`,
        );
      }

      await transaction.commit();
      console.log('✅ V3b.3.6 migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ V3b.3.6 migration failed:', error.message);
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
