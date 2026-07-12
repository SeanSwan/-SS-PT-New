'use strict';

/**
 * ============================================================================
 * MIGRATION: equipment_profiles case-insensitive partial unique index (P0.3e)
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-12
 * ============================================================================
 *
 * Replaces the ALL-ROWS unique index `idx_equipment_profile_trainer_name`
 * (UNIQUE ("trainerId","name")) with a partial, case-insensitive one on
 * ("trainerId", lower("name")) WHERE "isActive" = true.
 *
 * WHY: profiles are SOFT-deleted (DELETE /:id sets isActive=false), so the
 * all-rows index made an archived profile's name permanently unusable — the
 * same bug class fixed for equipment_items in 20260711000000/20260712000000.
 * Case-insensitivity aligns profiles with the item-level invariant ("Home Gym"
 * vs "home gym" are the same location to a human).
 *
 * SAFETY: prod verified 0 duplicate ("trainerId", lower("name")) groups in
 * BOTH active and all-rows scopes immediately before ship (3 rows total), so
 * CREATE UNIQUE INDEX cannot fail. DROP + CREATE in one transaction — no
 * window without uniqueness protection.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS "idx_equipment_profile_trainer_name"', { transaction });
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "idx_equipment_profile_trainer_lower_name_active"
           ON "equipment_profiles" ("trainerId", lower("name"))
           WHERE "isActive" = true`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS "idx_equipment_profile_trainer_lower_name_active"', { transaction });
      // Restore the original all-rows index. May fail if soft-deleted rows now
      // collide with active ones — that collision WAS the bug; reconcile first.
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "idx_equipment_profile_trainer_name"
           ON "equipment_profiles" ("trainerId", "name")`,
        { transaction }
      );
    });
  },
};
