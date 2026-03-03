'use strict';

/**
 * Migration: Ensure Achievement Model Columns + Seed Data
 * =======================================================
 * Root cause fix: The bootstrap migration (20260302050000) creates the
 * Achievements table with basic columns, but the reconciliation migration
 * (20260301000200) ran BEFORE bootstrap and found no table to reconcile.
 *
 * This migration runs AFTER bootstrap and:
 *   1. Adds all 30+ model columns that the Achievement.mjs model expects
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
      console.log('Migration 20260303000100: Achievements table not found — skipping');
      return;
    }

    // ── Step 2: Add missing model columns ───────────────────────────────
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const safeAdd = async (col, def) => {
        try {
          await queryInterface.addColumn('Achievements', col, def, { transaction });
          console.log(`  + Added Achievements.${col}`);
        } catch (e) {
          if (e.message && e.message.includes('already exists')) {
            // Column already present — skip silently
          } else {
            throw e;
          }
        }
      };

      const safeEnum = async (name, values) => {
        const valList = values.map(v => `'${v}'`).join(', ');
        await queryInterface.sequelize.query(
          `DO $$ BEGIN CREATE TYPE "${name}" AS ENUM(${valList}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
          { transaction }
        );
      };

      // Create ENUM types first
      await safeEnum('enum_Achievements_category', ['fitness', 'social', 'streak', 'milestone', 'special']);
      await safeEnum('enum_Achievements_rarity', ['common', 'rare', 'epic', 'legendary']);
      await safeEnum('enum_Achievements_skillTree', ['awakening', 'forge_nasm', 'iron_gravity', 'tribe_social', 'free_spirit', 'unbroken_streaks']);

      // ── Identity ──
      await safeAdd('title',       { type: Sequelize.STRING, allowNull: true });

      // ── Visual ──
      await safeAdd('iconEmoji',   { type: Sequelize.STRING, allowNull: true, defaultValue: '🏆' });
      await safeAdd('iconUrl',     { type: Sequelize.STRING, allowNull: true });

      // ── Classification ──
      await safeAdd('category',    { type: Sequelize.ENUM('fitness', 'social', 'streak', 'milestone', 'special'), allowNull: true, defaultValue: 'fitness' });
      await safeAdd('rarity',      { type: Sequelize.ENUM('common', 'rare', 'epic', 'legendary'), allowNull: true, defaultValue: 'common' });

      // ── Rewards ──
      await safeAdd('xpReward',        { type: Sequelize.INTEGER, allowNull: true, defaultValue: 100 });
      await safeAdd('requiredPoints',  { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 });
      await safeAdd('bonusRewards',    { type: Sequelize.JSONB, allowNull: true, defaultValue: [] });

      // ── Progress ──
      await safeAdd('maxProgress',  { type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 });
      await safeAdd('progressUnit', { type: Sequelize.STRING, allowNull: true, defaultValue: 'completion' });

      // ── Requirements ──
      await safeAdd('requirements',             { type: Sequelize.JSONB, allowNull: true, defaultValue: [] });
      await safeAdd('unlockConditions',         { type: Sequelize.JSONB, allowNull: true, defaultValue: {} });
      await safeAdd('prerequisiteAchievements', { type: Sequelize.JSONB, allowNull: true, defaultValue: [] });

      // ── Status ──
      await safeAdd('isHidden',  { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
      await safeAdd('isSecret',  { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
      await safeAdd('isLimited', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
      await safeAdd('availableFrom',  { type: Sequelize.DATE, allowNull: true });
      await safeAdd('availableUntil', { type: Sequelize.DATE, allowNull: true });

      // ── Analytics ──
      await safeAdd('totalUnlocked',      { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 });
      await safeAdd('unlockRate',         { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 0.00 });
      await safeAdd('averageTimeToUnlock', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 });

      // ── Social ──
      await safeAdd('shareCount',   { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 });
      await safeAdd('allowSharing', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });

      // ── Premium ──
      await safeAdd('isPremium',       { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
      await safeAdd('premiumBenefits', { type: Sequelize.JSONB, allowNull: true, defaultValue: {} });

      // ── Gamification ──
      await safeAdd('difficulty',         { type: Sequelize.INTEGER, allowNull: true, defaultValue: 3 });
      await safeAdd('estimatedDuration',  { type: Sequelize.INTEGER, allowNull: true });
      await safeAdd('tags',               { type: Sequelize.JSONB, allowNull: true, defaultValue: [] });

      // ── Business ──
      await safeAdd('businessValue',    { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 1.00 });
      await safeAdd('conversionImpact', { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 0.00 });

      // ── Octalysis Skill Tree ──
      await safeAdd('skillTree',      { type: Sequelize.ENUM('awakening', 'forge_nasm', 'iron_gravity', 'tribe_social', 'free_spirit', 'unbroken_streaks'), allowNull: true });
      await safeAdd('skillTreeOrder', { type: Sequelize.INTEGER, allowNull: true });
      await safeAdd('templateId',     { type: Sequelize.STRING, allowNull: true });
      await safeAdd('tierLevel',      { type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 });

      await transaction.commit();
      console.log('Migration 20260303000100: All Achievement model columns ensured.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // ── Step 3: Seed achievements if table is empty ─────────────────────
    const [countResult] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM "Achievements";`
    );
    const count = countResult[0].cnt;

    if (count > 0) {
      console.log(`Migration 20260303000100: ${count} achievements already exist — skipping seed.`);
      return;
    }

    console.log('Migration 20260303000100: No achievements found — seeding via seeder module...');
    try {
      const seederPath = path.resolve(__dirname, '..', 'seeders', '20260301001000-seed-achievements.cjs');
      const seeder = require(seederPath);
      await seeder.up(queryInterface, Sequelize);
      console.log('Migration 20260303000100: Achievement seeding complete.');
    } catch (seedError) {
      // Seeding failure is non-fatal — columns were still added
      console.error('Migration 20260303000100: Seeding failed (non-fatal):', seedError.message);
      console.error('  Stack:', seedError.stack?.split('\n').slice(0, 3).join('\n'));
    }
  },

  async down(queryInterface, Sequelize) {
    // Intentional no-op — don't remove columns or seed data
    console.log('Migration 20260303000100 down: no-op (preserving columns and data)');
  }
};
