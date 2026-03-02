'use strict';

/**
 * Migration: Add Gamification Fields (Octalysis Framework)
 * =========================================================
 * Adds new fields to support the Crystalline Swan gamification overhaul:
 *
 * On Achievements table:
 *   - skillTree: ENUM for Octalysis-inspired skill tree branches
 *   - skillTreeOrder: INTEGER for ordering within a skill tree
 *   - templateId: STRING for linking to achievement template definitions
 *   - tierLevel: INTEGER for tier progression within skill trees
 *
 * On Users table:
 *   - Updates tier ENUM from old values (bronze/silver/gold/platinum)
 *     to new Crystalline Swan values (bronze_forge/silver_edge/titanium_core/
 *     obsidian_warrior/crystalline_swan)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ===== ACHIEVEMENTS TABLE: Add Octalysis skill tree fields =====

      // Create the skillTree ENUM type
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          CREATE TYPE "enum_Achievements_skillTree" AS ENUM(
            'awakening', 'forge_nasm', 'iron_gravity',
            'tribe_social', 'free_spirit', 'unbroken_streaks'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;`,
        { transaction }
      );

      // Add skillTree column
      try {
        await queryInterface.addColumn('Achievements', 'skillTree', {
          type: Sequelize.ENUM('awakening', 'forge_nasm', 'iron_gravity', 'tribe_social', 'free_spirit', 'unbroken_streaks'),
          allowNull: true
        }, { transaction });
      } catch (e) {
        if (!e.message || !e.message.includes('already exists')) throw e;
      }

      // Add skillTreeOrder column
      try {
        await queryInterface.addColumn('Achievements', 'skillTreeOrder', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      } catch (e) {
        if (!e.message || !e.message.includes('already exists')) throw e;
      }

      // Add templateId column
      try {
        await queryInterface.addColumn('Achievements', 'templateId', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      } catch (e) {
        if (!e.message || !e.message.includes('already exists')) throw e;
      }

      // Add tierLevel column
      try {
        await queryInterface.addColumn('Achievements', 'tierLevel', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 1
        }, { transaction });
      } catch (e) {
        if (!e.message || !e.message.includes('already exists')) throw e;
      }

      // ===== USERS TABLE: Update tier ENUM =====
      // PostgreSQL requires raw SQL to alter ENUM types

      // Create the new enum type
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          CREATE TYPE "enum_Users_tier_new" AS ENUM(
            'bronze_forge', 'silver_edge', 'titanium_core',
            'obsidian_warrior', 'crystalline_swan'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;`,
        { transaction }
      );

      // Update the column default first
      await queryInterface.sequelize.query(
        `ALTER TABLE "Users" ALTER COLUMN "tier" DROP DEFAULT;`,
        { transaction }
      );

      // Convert existing values and change column type
      await queryInterface.sequelize.query(
        `ALTER TABLE "Users" ALTER COLUMN "tier" TYPE "enum_Users_tier_new" USING
          CASE "tier"::text
            WHEN 'bronze' THEN 'bronze_forge'
            WHEN 'silver' THEN 'silver_edge'
            WHEN 'gold' THEN 'titanium_core'
            WHEN 'platinum' THEN 'obsidian_warrior'
            ELSE 'bronze_forge'
          END::"enum_Users_tier_new";`,
        { transaction }
      );

      // Set new default
      await queryInterface.sequelize.query(
        `ALTER TABLE "Users" ALTER COLUMN "tier" SET DEFAULT 'bronze_forge';`,
        { transaction }
      );

      // Drop old enum type and rename new one
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_Users_tier";`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Users_tier_new" RENAME TO "enum_Users_tier";`,
        { transaction }
      );

      await transaction.commit();
      console.log('Migration 20260301000300: Gamification fields added successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ===== Revert Users.tier ENUM =====
      // Create the old enum type
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          CREATE TYPE "enum_Users_tier_old" AS ENUM('bronze', 'silver', 'gold', 'platinum');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "Users" ALTER COLUMN "tier" DROP DEFAULT;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "Users" ALTER COLUMN "tier" TYPE "enum_Users_tier_old" USING
          CASE "tier"::text
            WHEN 'bronze_forge' THEN 'bronze'
            WHEN 'silver_edge' THEN 'silver'
            WHEN 'titanium_core' THEN 'gold'
            WHEN 'obsidian_warrior' THEN 'platinum'
            WHEN 'crystalline_swan' THEN 'platinum'
            ELSE 'bronze'
          END::"enum_Users_tier_old";`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "Users" ALTER COLUMN "tier" SET DEFAULT 'bronze';`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_Users_tier";`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Users_tier_old" RENAME TO "enum_Users_tier";`,
        { transaction }
      );

      // ===== Remove Achievements columns =====
      try {
        await queryInterface.removeColumn('Achievements', 'skillTree', { transaction });
      } catch (e) { /* column may not exist */ }

      try {
        await queryInterface.removeColumn('Achievements', 'skillTreeOrder', { transaction });
      } catch (e) { /* column may not exist */ }

      try {
        await queryInterface.removeColumn('Achievements', 'templateId', { transaction });
      } catch (e) { /* column may not exist */ }

      try {
        await queryInterface.removeColumn('Achievements', 'tierLevel', { transaction });
      } catch (e) { /* column may not exist */ }

      // Drop the skillTree ENUM type
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Achievements_skillTree";',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
