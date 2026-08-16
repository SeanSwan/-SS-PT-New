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

    // ── WRITE-ONCE ENFORCEMENT ────────────────────────────────────────────
    // Three independent reviewers (Kimi K3, HY3, GLM-5.3) converged on this as the
    // blocker, and they were right. `Object.freeze()` in `buildProvenance` protects the
    // in-process object and NOTHING else — the freeze does not survive serialisation, so
    // once the record is a JSONB column any admin query, ORM write, or future migration
    // can rewrite it silently. A "durable record" that a stray UPDATE can edit is not a
    // durable record; it is a mutable field with a promise attached.
    //
    // The rule is deliberately write-ONCE rather than write-never: NULL -> value is how
    // provenance is first recorded and must be allowed. value -> different value is
    // rejected. value -> NULL is rejected too, since erasing the record is exactly the
    // tampering this exists to prevent.
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION media_assets_provenance_write_once()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.provenance IS NOT NULL
           AND NEW.provenance IS DISTINCT FROM OLD.provenance THEN
          RAISE EXCEPTION
            'media_assets.provenance is write-once (asset %): it records the licence in force at generation time and cannot be altered afterwards',
            OLD.id
            USING ERRCODE = 'integrity_constraint_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS media_assets_provenance_write_once_trg ON media_assets;
      CREATE TRIGGER media_assets_provenance_write_once_trg
        BEFORE UPDATE ON media_assets
        FOR EACH ROW
        EXECUTE FUNCTION media_assets_provenance_write_once();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS media_assets_provenance_write_once_trg ON media_assets;
    `);
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS media_assets_provenance_write_once();
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS media_assets_provenance_provider_idx;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE media_assets
        DROP COLUMN IF EXISTS provenance;
    `);
  },
};
