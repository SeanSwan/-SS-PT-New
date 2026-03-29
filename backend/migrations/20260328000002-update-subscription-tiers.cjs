'use strict';

/**
 * Migration: Update Subscription Tiers
 * ─────────────────────────────────────
 * Renames supporter → pro, premium → elite.
 * Adds new ENUM values, migrates existing rows, updates User cache column.
 *
 * PostgreSQL ENUMs can't remove values, so old values remain in the type
 * but won't be used (model enforces new values).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // 1. Add new enum values to the subscription tier type
    // PostgreSQL: ALTER TYPE ... ADD VALUE is safe and idempotent with IF NOT EXISTS
    try {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          -- Check if the enum type exists before altering
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_subscriptions_tier') THEN
            BEGIN
              ALTER TYPE "enum_subscriptions_tier" ADD VALUE IF NOT EXISTS 'pro';
            EXCEPTION WHEN duplicate_object THEN NULL;
            END;
            BEGIN
              ALTER TYPE "enum_subscriptions_tier" ADD VALUE IF NOT EXISTS 'elite';
            EXCEPTION WHEN duplicate_object THEN NULL;
            END;
          END IF;
        END
        $$;
      `);
    } catch (err) {
      // If the enum type doesn't exist (column might be STRING), that's fine
      console.log('Note: enum type may not exist, will handle as string column:', err.message);
    }

    // 2. Migrate existing data: supporter → pro, premium → elite
    await queryInterface.sequelize.query(`
      UPDATE "subscriptions" SET tier = 'pro' WHERE tier = 'supporter';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "subscriptions" SET tier = 'elite' WHERE tier = 'premium';
    `);

    // 3. Update the User model's cached subscriptionTier column too
    try {
      await queryInterface.sequelize.query(`
        UPDATE "users" SET "subscriptionTier" = 'pro' WHERE "subscriptionTier" = 'supporter';
      `);
      await queryInterface.sequelize.query(`
        UPDATE "users" SET "subscriptionTier" = 'elite' WHERE "subscriptionTier" = 'premium';
      `);
    } catch (err) {
      console.log('Note: users.subscriptionTier column may not exist:', err.message);
    }

    console.log('✓ Subscription tiers migrated: supporter→pro, premium→elite');
  },

  async down(queryInterface) {
    // Reverse: pro → supporter, elite → premium
    await queryInterface.sequelize.query(`
      UPDATE "subscriptions" SET tier = 'supporter' WHERE tier = 'pro';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "subscriptions" SET tier = 'premium' WHERE tier = 'elite';
    `);

    try {
      await queryInterface.sequelize.query(`
        UPDATE "users" SET "subscriptionTier" = 'supporter' WHERE "subscriptionTier" = 'pro';
      `);
      await queryInterface.sequelize.query(`
        UPDATE "users" SET "subscriptionTier" = 'premium' WHERE "subscriptionTier" = 'elite';
      `);
    } catch (err) {
      console.log('Note: users.subscriptionTier rollback skipped:', err.message);
    }
  }
};
