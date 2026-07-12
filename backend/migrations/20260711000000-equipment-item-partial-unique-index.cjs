'use strict';

/**
 * ============================================================================
 * MIGRATION: equipment_items partial unique index (P0.3)
 * AUTHOR: Claude Opus 4.8 | CREATED: 2026-07-11
 * ============================================================================
 *
 * Converts the ALL-ROWS unique index `idx_equipment_item_profile_name`
 * (UNIQUE ("profileId", "name")) into a PARTIAL unique index scoped to ACTIVE
 * rows only (WHERE "isActive" = true).
 *
 * WHY: equipment items are SOFT-deleted — DELETE /:id/items/:itemId and the
 * reject endpoint both set `isActive = false` and leave the row in place. The
 * old all-rows unique index therefore made it impossible to re-add a previously
 * deleted/rejected item: the dead row still occupied ("profileId", "name") and
 * a re-add hit a unique violation. The partial index keeps ACTIVE equipment
 * unique per profile (the real invariant) while letting soft-deleted names be
 * re-added.
 *
 * SAFETY: prod was verified (scripts/inspect-equipment-dups.mjs) to have 0
 * duplicate ("profileId", lower("name")) groups in every scope before this
 * shipped, so CREATE UNIQUE INDEX cannot fail on existing data. DROP + CREATE
 * run in one transaction (Postgres DDL is transactional) so there is never a
 * window with no uniqueness protection.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS "idx_equipment_item_profile_name"', { transaction });
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "idx_equipment_item_profile_name_active"
           ON "equipment_items" ("profileId", "name")
           WHERE "isActive" = true`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS "idx_equipment_item_profile_name_active"', { transaction });
      // Restore the original all-rows unique index. NOTE: if soft-deleted rows
      // now collide with active rows on ("profileId","name") this will fail —
      // that is expected (the old constraint was the bug); reconcile before down.
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "idx_equipment_item_profile_name"
           ON "equipment_items" ("profileId", "name")`,
        { transaction }
      );
    });
  },
};
