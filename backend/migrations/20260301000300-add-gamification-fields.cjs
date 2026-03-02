'use strict';

/**
 * Migration: Add Gamification Fields (Octalysis Framework)
 * =========================================================
 * Adds new fields to support the Crystalline Swan gamification overhaul.
 *
 * RESILIENT: Handles case-sensitive ENUM type names on PostgreSQL.
 * The original tier ENUM may be "enum_users_tier" (lowercase)
 * or "enum_Users_tier" (uppercase) depending on creation method.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ===== ACHIEVEMENTS TABLE: Add Octalysis skill tree fields =====

      // Check if Achievements table exists
      const [achTables] = await queryInterface.sequelize.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Achievements';`,
        { transaction }
      );

      if (achTables.length > 0) {
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

        // Add columns safely (skip if already exists)
        const safeAdd = async (col, def) => {
          try {
            await queryInterface.addColumn('Achievements', col, def, { transaction });
          } catch (e) {
            if (!e.message || !e.message.includes('already exists')) throw e;
          }
        };

        await safeAdd('skillTree', {
          type: Sequelize.ENUM('awakening', 'forge_nasm', 'iron_gravity', 'tribe_social', 'free_spirit', 'unbroken_streaks'),
          allowNull: true
        });
        await safeAdd('skillTreeOrder', { type: Sequelize.INTEGER, allowNull: true });
        await safeAdd('templateId', { type: Sequelize.STRING, allowNull: true });
        await safeAdd('tierLevel', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 });
      } else {
        console.log('Migration 20260301000300: Achievements table not found, skipping achievement columns');
      }

      // ===== USERS TABLE: Update tier ENUM =====
      // First, find the actual enum type name used by the tier column
      const [tierTypeResult] = await queryInterface.sequelize.query(
        `SELECT udt_name FROM information_schema.columns
         WHERE table_name = 'Users' AND column_name = 'tier';`,
        { transaction }
      );

      if (tierTypeResult.length > 0) {
        const currentTypeName = tierTypeResult[0].udt_name;
        console.log(`Migration 20260301000300: Current tier ENUM type name: "${currentTypeName}"`);

        // Check if it already has the new values
        const [enumValues] = await queryInterface.sequelize.query(
          `SELECT enumlabel FROM pg_enum
           JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
           WHERE pg_type.typname = '${currentTypeName}'
           ORDER BY pg_enum.enumsortorder;`,
          { transaction }
        );

        const currentValues = enumValues.map(r => r.enumlabel);
        console.log(`Migration 20260301000300: Current tier values: [${currentValues.join(', ')}]`);

        if (currentValues.includes('bronze_forge')) {
          console.log('Migration 20260301000300: Tier ENUM already has new values, skipping');
        } else {
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

          // Drop default
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

          // Drop old enum type (handle both possible names)
          await queryInterface.sequelize.query(
            `DROP TYPE IF EXISTS "${currentTypeName}";`,
            { transaction }
          );

          // Rename new one to the standard name
          await queryInterface.sequelize.query(
            `ALTER TYPE "enum_Users_tier_new" RENAME TO "enum_Users_tier";`,
            { transaction }
          );

          console.log('Migration 20260301000300: Tier ENUM updated successfully');
        }
      } else {
        console.log('Migration 20260301000300: Users.tier column not found, skipping ENUM update');
      }

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
      // Revert Users.tier ENUM
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

      // Remove Achievements columns
      const safeDrop = async (col) => {
        try { await queryInterface.removeColumn('Achievements', col, { transaction }); }
        catch (e) { /* column may not exist */ }
      };
      await safeDrop('skillTree');
      await safeDrop('skillTreeOrder');
      await safeDrop('templateId');
      await safeDrop('tierLevel');

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
