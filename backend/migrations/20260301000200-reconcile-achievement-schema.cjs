'use strict';

/**
 * Migration: Reconcile Achievement Schema
 * ========================================
 * The Achievement model defines ~30 fields but the original migration
 * (20250505001000-create-achievements.mjs) only created ~12 columns.
 *
 * This migration adds every field present in the model that is NOT
 * in the original migration. Uses try/catch per column for idempotency
 * (columns may already exist if partially applied).
 *
 * Original migration columns:
 *   id, name, description, icon, pointValue, requirementType, requirementValue,
 *   tier, isActive, exerciseId, specificRequirement, badgeImageUrl, createdAt, updatedAt
 *
 * Missing columns added by this migration:
 *   title, iconEmoji, iconUrl, category, rarity, xpReward, requiredPoints,
 *   bonusRewards, maxProgress, progressUnit, requirements, unlockConditions,
 *   prerequisiteAchievements, isHidden, isSecret, isLimited, availableFrom,
 *   availableUntil, totalUnlocked, unlockRate, averageTimeToUnlock, shareCount,
 *   allowSharing, isPremium, premiumBenefits, difficulty, estimatedDuration,
 *   tags, businessValue, conversionImpact
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper: add column with try/catch for idempotency
    const safeAddColumn = async (table, column, definition, transaction) => {
      try {
        await queryInterface.addColumn(table, column, definition, { transaction });
        console.log(`  + Added column ${table}.${column}`);
      } catch (error) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`  ~ Column ${table}.${column} already exists, skipping`);
        } else {
          throw error;
        }
      }
    };

    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = 'Achievements';

      // --- Achievement Identity ---
      await safeAddColumn(table, 'title', {
        type: Sequelize.STRING,
        allowNull: true  // Allow null for existing rows
      }, transaction);

      // --- Visual Elements ---
      await safeAddColumn(table, 'iconEmoji', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '🏆'
      }, transaction);

      await safeAddColumn(table, 'iconUrl', {
        type: Sequelize.STRING,
        allowNull: true
      }, transaction);

      // --- Classification ---
      // Create category ENUM type first
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          CREATE TYPE "enum_Achievements_category" AS ENUM('fitness', 'social', 'streak', 'milestone', 'special');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;`,
        { transaction }
      );
      await safeAddColumn(table, 'category', {
        type: Sequelize.ENUM('fitness', 'social', 'streak', 'milestone', 'special'),
        allowNull: true,
        defaultValue: 'fitness'
      }, transaction);

      // Create rarity ENUM type
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          CREATE TYPE "enum_Achievements_rarity" AS ENUM('common', 'rare', 'epic', 'legendary');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;`,
        { transaction }
      );
      await safeAddColumn(table, 'rarity', {
        type: Sequelize.ENUM('common', 'rare', 'epic', 'legendary'),
        allowNull: true,
        defaultValue: 'common'
      }, transaction);

      // --- Reward System ---
      await safeAddColumn(table, 'xpReward', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 100
      }, transaction);

      await safeAddColumn(table, 'requiredPoints', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      }, transaction);

      await safeAddColumn(table, 'bonusRewards', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      }, transaction);

      // --- Progress Configuration ---
      await safeAddColumn(table, 'maxProgress', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1
      }, transaction);

      await safeAddColumn(table, 'progressUnit', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'completion'
      }, transaction);

      // --- Requirements and Logic ---
      await safeAddColumn(table, 'requirements', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      }, transaction);

      await safeAddColumn(table, 'unlockConditions', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      }, transaction);

      await safeAddColumn(table, 'prerequisiteAchievements', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      }, transaction);

      // --- Status and Availability ---
      await safeAddColumn(table, 'isHidden', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }, transaction);

      await safeAddColumn(table, 'isSecret', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }, transaction);

      await safeAddColumn(table, 'isLimited', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }, transaction);

      await safeAddColumn(table, 'availableFrom', {
        type: Sequelize.DATE,
        allowNull: true
      }, transaction);

      await safeAddColumn(table, 'availableUntil', {
        type: Sequelize.DATE,
        allowNull: true
      }, transaction);

      // --- Analytics and Stats ---
      await safeAddColumn(table, 'totalUnlocked', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      }, transaction);

      await safeAddColumn(table, 'unlockRate', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00
      }, transaction);

      await safeAddColumn(table, 'averageTimeToUnlock', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      }, transaction);

      // --- Social Features ---
      await safeAddColumn(table, 'shareCount', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      }, transaction);

      await safeAddColumn(table, 'allowSharing', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      }, transaction);

      // --- Premium Features ---
      await safeAddColumn(table, 'isPremium', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }, transaction);

      await safeAddColumn(table, 'premiumBenefits', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      }, transaction);

      // --- Gamification Logic ---
      // Note: The model defines difficulty as INTEGER (1-5), not ENUM.
      // The original migration does NOT have a 'difficulty' column, so we add it.
      await safeAddColumn(table, 'difficulty', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 3
      }, transaction);

      await safeAddColumn(table, 'estimatedDuration', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, transaction);

      await safeAddColumn(table, 'tags', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      }, transaction);

      // --- Business Intelligence ---
      await safeAddColumn(table, 'businessValue', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 1.00
      }, transaction);

      await safeAddColumn(table, 'conversionImpact', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00
      }, transaction);

      await transaction.commit();
      console.log('Migration 20260301000200: Achievements schema reconciled successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = 'Achievements';
      const columnsToRemove = [
        'title', 'iconEmoji', 'iconUrl', 'category', 'rarity',
        'xpReward', 'requiredPoints', 'bonusRewards', 'maxProgress', 'progressUnit',
        'requirements', 'unlockConditions', 'prerequisiteAchievements',
        'isHidden', 'isSecret', 'isLimited', 'availableFrom', 'availableUntil',
        'totalUnlocked', 'unlockRate', 'averageTimeToUnlock',
        'shareCount', 'allowSharing',
        'isPremium', 'premiumBenefits',
        'difficulty', 'estimatedDuration', 'tags',
        'businessValue', 'conversionImpact'
      ];

      for (const col of columnsToRemove) {
        try {
          await queryInterface.removeColumn(table, col, { transaction });
        } catch (error) {
          // Column may not exist if migration was partially applied
          console.log(`  ~ Could not remove ${table}.${col}: ${error.message}`);
        }
      }

      // Drop ENUM types created by this migration
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Achievements_category";',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Achievements_rarity";',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
