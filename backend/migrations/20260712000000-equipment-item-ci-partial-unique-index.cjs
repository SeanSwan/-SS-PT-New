'use strict';

/**
 * ============================================================================
 * MIGRATION: equipment_items case-insensitive partial unique index (P0.3d)
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-12
 * ============================================================================
 *
 * Replaces the case-SENSITIVE partial unique index
 * `idx_equipment_item_profile_name_active` (UNIQUE ("profileId","name") WHERE
 * "isActive" = true, shipped in 20260711000000) with a CASE-INSENSITIVE one on
 * ("profileId", lower("name")), same active-rows-only scope.
 *
 * WHY: the AI-scan dedupe (equipmentScanV2Support normalizeToken) already
 * treats "Barbell"/"barbell" as the SAME item, but the DB index and manual
 * routes did not — a trainer could hand-create a case-variant lookalike
 * duplicate that the scan flow would refuse. This aligns the DB invariant with
 * the product's dedupe semantics. The route pre-checks switch to Op.iLike in
 * the same slice, so the index is the race backstop, not the primary UX path
 * (unique violations still map to 409 via the P0.3b backstops).
 *
 * SAFETY: prod verified 0 duplicate ("profileId", lower("name")) groups in the
 * active scope immediately before ship (scripts/inspect-equipment-dups.mjs
 * groups on lower(name) — the strictest form), so CREATE UNIQUE INDEX cannot
 * fail on existing data. DROP + CREATE run in one transaction: no window
 * without uniqueness protection.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS "idx_equipment_item_profile_name_active"', { transaction });
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "idx_equipment_item_profile_lower_name_active"
           ON "equipment_items" ("profileId", lower("name"))
           WHERE "isActive" = true`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS "idx_equipment_item_profile_lower_name_active"', { transaction });
      // Restore the case-sensitive partial index from 20260711000000. Cannot
      // fail on data the CI index allowed (CI uniqueness is strictly tighter).
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "idx_equipment_item_profile_name_active"
           ON "equipment_items" ("profileId", "name")
           WHERE "isActive" = true`,
        { transaction }
      );
    });
  },
};
