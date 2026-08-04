'use strict';

/**
 * ============================================================================
 * MIGRATION: equipment_profiles ownerRole column (S4 — all-roles ownership)
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-04
 * ============================================================================
 *
 * S4 of the Equipment Intelligence Overhaul extends equipment profiles from
 * trainer/admin-only to ALL four roles (trainer | client | user | admin).
 *
 * WHAT: adds `ownerRole` — ENUM-safe TEXT, NOT NULL, DEFAULT 'trainer', with a
 * CHECK constraint restricting values to ('trainer','client','user','admin').
 * All pre-existing rows were created by trainers (or admins acting as
 * trainers under the old blanket guard), so the backfill stamps 'trainer'.
 *
 * SEMANTICS NOTE — `trainerId` is NOT renamed. As of this migration it is the
 * GENERIC OWNER ID: the Users.id of whichever user (any role) owns the row.
 * The name is kept as a deprecated alias to avoid a destructive rename across
 * routes/models/tests; a later cleanup slice may introduce `ownerId`.
 * FK untouched: trainerId already references the canonical "Users" table
 * (NOT the stale lowercase `users` duplicate) — do not touch the FK.
 *
 * SAFETY: ADD COLUMN ... DEFAULT on Postgres 11+ is a metadata-only change
 * (no table rewrite). The explicit UPDATE backfill is a no-op belt-and-braces
 * pass (NOT NULL DEFAULT already fills existing rows) kept for engines that
 * apply defaults lazily. Everything runs in one transaction; IF EXISTS /
 * IF NOT EXISTS guards make both directions safe to re-run.
 *
 * down(): drops the CHECK constraint and the column — full revert.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE "equipment_profiles"
           ADD COLUMN IF NOT EXISTS "ownerRole" TEXT NOT NULL DEFAULT 'trainer'`,
        { transaction }
      );
      // Belt-and-braces backfill: every pre-S4 row is trainer-owned.
      await sequelize.query(
        `UPDATE "equipment_profiles"
            SET "ownerRole" = 'trainer'
          WHERE "ownerRole" IS NULL OR "ownerRole" = ''`,
        { transaction }
      );
      // ENUM-safe value guard (TEXT + CHECK instead of a native ENUM so new
      // roles never require an ALTER TYPE). Drop-then-add keeps re-runs clean.
      await sequelize.query(
        `ALTER TABLE "equipment_profiles"
           DROP CONSTRAINT IF EXISTS "chk_equipment_profiles_owner_role"`,
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE "equipment_profiles"
           ADD CONSTRAINT "chk_equipment_profiles_owner_role"
           CHECK ("ownerRole" IN ('trainer', 'client', 'user', 'admin'))`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `ALTER TABLE "equipment_profiles"
           DROP CONSTRAINT IF EXISTS "chk_equipment_profiles_owner_role"`,
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE "equipment_profiles"
           DROP COLUMN IF EXISTS "ownerRole"`,
        { transaction }
      );
    });
  },
};
