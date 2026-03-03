'use strict';

/**
 * Migration: Fix Tier ENUM + Seed Achievements (Combined)
 * ========================================================
 * Root cause: Migration 20260301000300 runs BEFORE 20260302050000 (alphabetical).
 * So the tier ENUM conversion never happens because the column doesn't exist yet
 * when the converter runs. Then the bootstrap creates it with old values
 * (bronze, silver, gold, platinum). This breaks login because the User model
 * expects new values (bronze_forge, silver_edge, etc.).
 *
 * This migration:
 *   1. Converts tier column from ENUM to VARCHAR (bypasses enum constraints)
 *   2. Updates old tier values to new names
 *   3. Adds auto-increment sequence to Achievements.id if needed
 *   4. Seeds achievements if table is empty
 *
 * Fully idempotent — safe to re-run.
 */

const path = require('path');

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Step 1: Fix Users.tier column ──────────────────────────────────────
    console.log('Migration 20260303000300: Fixing Users.tier column...');

    try {
      // Check if tier column exists
      const [tierCol] = await queryInterface.sequelize.query(
        `SELECT data_type, udt_name FROM information_schema.columns
         WHERE table_name = 'Users' AND column_name = 'tier';`
      );

      if (tierCol.length > 0) {
        const dataType = tierCol[0].data_type;
        const udtName = tierCol[0].udt_name;
        console.log(`  tier column: data_type=${dataType}, udt_name=${udtName}`);

        if (dataType === 'USER-DEFINED') {
          // It's an ENUM — convert to VARCHAR to avoid enum constraint issues
          console.log('  Converting tier from ENUM to VARCHAR...');

          // Drop default first
          try {
            await queryInterface.sequelize.query(
              `ALTER TABLE "Users" ALTER COLUMN "tier" DROP DEFAULT;`
            );
          } catch (e) {
            console.log(`  ~ drop default: ${e.message.split('\\n')[0]}`);
          }

          // Convert to VARCHAR
          await queryInterface.sequelize.query(
            `ALTER TABLE "Users" ALTER COLUMN "tier" TYPE VARCHAR(50) USING "tier"::text;`
          );
          console.log('  ✓ tier converted to VARCHAR(50)');

          // Set new default
          await queryInterface.sequelize.query(
            `ALTER TABLE "Users" ALTER COLUMN "tier" SET DEFAULT 'bronze_forge';`
          );
          console.log('  ✓ tier default set to bronze_forge');

          // Drop old enum types
          await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_Users_tier";`);
          await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_Users_tier_new";`);
          await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_users_tier";`);
          console.log('  ✓ old enum types dropped');
        } else {
          console.log(`  tier is already ${dataType}, no conversion needed`);
        }

        // Update old tier values to new names regardless of column type
        const tierMap = {
          'bronze': 'bronze_forge',
          'silver': 'silver_edge',
          'gold': 'titanium_core',
          'platinum': 'obsidian_warrior',
        };

        for (const [oldVal, newVal] of Object.entries(tierMap)) {
          const [result] = await queryInterface.sequelize.query(
            `UPDATE "Users" SET "tier" = '${newVal}' WHERE "tier" = '${oldVal}';`
          );
          console.log(`  ✓ tier '${oldVal}' → '${newVal}'`);
        }

        // Also fix any NULL tiers
        await queryInterface.sequelize.query(
          `UPDATE "Users" SET "tier" = 'bronze_forge' WHERE "tier" IS NULL;`
        );
        console.log('  ✓ NULL tiers → bronze_forge');
      } else {
        console.log('  tier column not found on Users table');
      }
    } catch (tierError) {
      console.error('  tier fix error:', tierError.message);
      // Non-fatal — continue to achievement seeding
    }

    // ── Step 2: Fix Achievements.id auto-increment ────────────────────────
    console.log('Migration 20260303000300: Fixing Achievements.id auto-increment...');

    try {
      const [tables] = await queryInterface.sequelize.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Achievements';`
      );

      if (tables.length > 0) {
        const [idCol] = await queryInterface.sequelize.query(
          `SELECT data_type, column_default FROM information_schema.columns
           WHERE table_name = 'Achievements' AND column_name = 'id';`
        );

        if (idCol.length > 0) {
          const idType = idCol[0].data_type;
          const idDefault = idCol[0].column_default;
          console.log(`  Achievements.id: type=${idType}, default=${idDefault}`);

          if (idType === 'integer' && (!idDefault || !idDefault.includes('nextval'))) {
            // Create sequence and attach it
            await queryInterface.sequelize.query(
              `CREATE SEQUENCE IF NOT EXISTS "Achievements_id_seq" OWNED BY "Achievements"."id";`
            );

            // Set the sequence to start after any existing max id
            const [maxId] = await queryInterface.sequelize.query(
              `SELECT COALESCE(MAX(id), 0) + 1 AS next_val FROM "Achievements";`
            );
            const nextVal = maxId[0].next_val;

            await queryInterface.sequelize.query(
              `SELECT setval('"Achievements_id_seq"', ${nextVal}, false);`
            );

            await queryInterface.sequelize.query(
              `ALTER TABLE "Achievements" ALTER COLUMN "id" SET DEFAULT nextval('"Achievements_id_seq"');`
            );
            console.log(`  ✓ Achievements.id auto-increment set (next: ${nextVal})`);
          } else {
            console.log(`  Achievements.id already has auto-increment or is UUID`);
          }
        }
      } else {
        console.log('  Achievements table not found');
      }
    } catch (seqError) {
      console.error('  Achievements.id fix error:', seqError.message);
    }

    // ── Step 3: Seed achievements if table is empty ───────────────────────
    try {
      const [countResult] = await queryInterface.sequelize.query(
        `SELECT COUNT(*)::int AS cnt FROM "Achievements";`
      );
      const count = countResult[0].cnt;

      if (count > 0) {
        console.log(`Migration 20260303000300: ${count} achievements already exist — skipping seed.`);
        return;
      }

      console.log('Migration 20260303000300: No achievements found — seeding...');

      const seederPath = path.resolve(__dirname, '..', 'seeders', '20260301001000-seed-achievements.cjs');
      const seeder = require(seederPath);
      await seeder.up(queryInterface, Sequelize);

      const [verifyResult] = await queryInterface.sequelize.query(
        `SELECT COUNT(*)::int AS cnt FROM "Achievements";`
      );
      console.log(`Migration 20260303000300: Seeded ${verifyResult[0].cnt} achievements!`);
    } catch (seedError) {
      console.error('Migration 20260303000300: SEEDING FAILED:', seedError.message);
      console.error('  Stack:', seedError.stack?.split('\n').slice(0, 5).join('\n'));
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Migration 20260303000300 down: no-op (preserving data)');
  }
};
