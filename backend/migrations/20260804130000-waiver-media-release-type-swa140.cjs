/**
 * SWA-140 — add 'media_release' to the waiver document type enum
 * ===============================================================
 * The photo/media consent checkbox on the public page referenced no document
 * at all. v2.0 introduces a real Photo & Media Release, which needs its own
 * waiverType so it can be versioned, displayed, and consented to independently
 * of the liability release (bundling optional consent with a required release
 * is exactly what invalidates it).
 *
 * Deliberately NOT wrapped in a transaction: `ALTER TYPE ... ADD VALUE` is
 * restricted inside transaction blocks, and the new value must be committed
 * before any row can use it. The seeder writes media_release rows at a later
 * boot, on a separate connection — never in this migration.
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_waiver_versions_waiverType" ADD VALUE IF NOT EXISTS 'media_release';`,
    );
  },

  async down() {
    // Postgres cannot remove a value from an enum without recreating the type
    // and rewriting every dependent column. An unused extra enum value is
    // harmless; tearing down the type to reclaim it is not. Intentional no-op.
  },
};
