'use strict';

/**
 * Migration: Fix Legacy Bootstrap Columns + Seed Achievements
 * ============================================================
 * Root cause: The bootstrap migration (20260302050000) created the
 * Achievements table with `requirementType` as NOT NULL, no default.
 * The seeder doesn't provide this legacy column, so every bulkInsert
 * fails with a NOT NULL constraint violation.
 *
 * This migration:
 *   1. Makes legacy bootstrap columns nullable (requirementType, requirementValue, icon, pointValue, etc.)
 *   2. Seeds ~550 achievements if the table is empty
 *
 * Fully idempotent — safe to re-run.
 */

const path = require('path');

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Step 1: Check table exists ──────────────────────────────────────
    const [tables] = await queryInterface.sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Achievements';`
    );

    if (tables.length === 0) {
      console.log('Migration 20260303000200: Achievements table not found — skipping');
      return;
    }

    // ── Step 2: Make legacy bootstrap columns nullable ──────────────────
    console.log('Migration 20260303000200: Making legacy bootstrap columns nullable...');

    const legacyColumns = [
      'requirementType',
      'requirementValue',
      'icon',
      'pointValue',
      'exerciseId',
      'specificRequirement',
      'badgeImageUrl',
      'tier',
    ];

    for (const col of legacyColumns) {
      try {
        await queryInterface.sequelize.query(
          `ALTER TABLE "Achievements" ALTER COLUMN "${col}" DROP NOT NULL;`
        );
        console.log(`  ✓ ${col} → nullable`);
      } catch (e) {
        if (e.message && e.message.includes('does not exist')) {
          console.log(`  ~ ${col} does not exist (skipping)`);
        } else {
          // Column might already be nullable — that's fine
          console.log(`  ~ ${col}: ${e.message.split('\n')[0]}`);
        }
      }
    }

    // Also set a default on requirementType so any future inserts don't fail
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE "Achievements" ALTER COLUMN "requirementType" SET DEFAULT 'session_count';`
      );
      console.log('  ✓ requirementType default set to session_count');
    } catch (e) {
      console.log(`  ~ requirementType default: ${e.message.split('\n')[0]}`);
    }

    // ── Step 3: Seed achievements if table is empty ─────────────────────
    const [countResult] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM "Achievements";`
    );
    const count = countResult[0].cnt;

    if (count > 0) {
      console.log(`Migration 20260303000200: ${count} achievements already exist — skipping seed.`);
      return;
    }

    console.log('Migration 20260303000200: No achievements found — seeding...');
    try {
      const seederPath = path.resolve(__dirname, '..', 'seeders', '20260301001000-seed-achievements.cjs');
      const seeder = require(seederPath);
      await seeder.up(queryInterface, Sequelize);

      // Verify
      const [verifyResult] = await queryInterface.sequelize.query(
        `SELECT COUNT(*)::int AS cnt FROM "Achievements";`
      );
      console.log(`Migration 20260303000200: Seeded ${verifyResult[0].cnt} achievements successfully!`);
    } catch (seedError) {
      // Log full error for debugging — this was silently swallowed before
      console.error('Migration 20260303000200: SEEDING FAILED:', seedError.message);
      console.error('  Full error:', seedError.stack?.split('\n').slice(0, 5).join('\n'));
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Migration 20260303000200 down: no-op (preserving data)');
  }
};
