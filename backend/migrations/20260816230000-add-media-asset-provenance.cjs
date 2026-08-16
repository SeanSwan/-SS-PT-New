'use strict';

/**
 * media_assets.provenance — the durable per-asset record promised to a licensor.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * On 2026-08-16 a licensing request to MiniMax stated that every generated asset
 * carries "a durable record of provider, model version, and the license in force at
 * generation time." The agent now BUILDS that record — and `completeJob` was
 * cherry-picking `meta` (poster, width, height, duration, size, seed) and dropping
 * everything else, so the record travelled to the server and was discarded. The
 * commitment was unmet at the persistence layer, invisibly, because the code that
 * produced it was correct and well-tested.
 *
 * ── WHY media_assets AND NOT video_render_jobs ──────────────────────────────
 * The commitment is per-ASSET, and the asset outlives the job: jobs are operational
 * and prunable, assets are the thing that ends up in a library, on a page, in front
 * of a client. Provenance has to live with whichever row survives longest.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * Additive and nullable. `ADD COLUMN ... JSONB NULL` with no default is a catalogue-
 * only change in modern Postgres — no table rewrite, no lock held for the length of
 * a scan, safe on a populated table. Existing rows read NULL, which is honest: those
 * assets genuinely have no provenance, and backfilling an invented one would be worse
 * than admitting the gap.
 *
 * REVERSIBLE: `down` drops the column. That loses recorded provenance, so it should
 * only be run if the column is being replaced by something better.
 */

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE media_assets
        ADD COLUMN IF NOT EXISTS provenance JSONB;
    `);

    // Partial index: only assets that HAVE provenance are worth indexing, and the
    // predicate keeps the index small on a table where most rows (uploads, photos)
    // will never carry one.
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS media_assets_provenance_provider_idx
        ON media_assets ((provenance->>'provider'))
        WHERE provenance IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS media_assets_provenance_provider_idx;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE media_assets
        DROP COLUMN IF EXISTS provenance;
    `);
  },
};
