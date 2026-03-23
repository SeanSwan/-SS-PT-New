/**
 * ============================================================================
 * MIGRATION: Add streak freeze fields to Gamifications table
 * PURPOSE: Support streak freeze mechanic (Loss Aversion psychology)
 * AUTHOR: Claude Opus 4.6 | DATE: 2026-03-23
 * ============================================================================
 *
 * PSYCHOLOGY: Loss Aversion — users fear losing streaks more than they value
 * gaining points. Streak freezes reduce anxiety while maintaining engagement.
 * Users earn freezes through consistency (7-day streaks grant 1 freeze).
 * Max 3 freezes stored. Using a freeze preserves streak for 1 missed day.
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Check if table exists first (non-fatal)
      const [tableCheck] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public."Gamifications"') AS exists`,
        { transaction }
      );
      if (!tableCheck?.[0]?.exists) {
        console.log('Gamifications table does not exist yet — skipping streak freeze migration');
        await transaction.commit();
        return;
      }

      // Check if columns already exist
      const [columns] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'Gamifications' AND column_name = 'streakFreezes'`,
        { transaction }
      );

      if (columns.length > 0) {
        console.log('streakFreezes column already exists — skipping');
        await transaction.commit();
        return;
      }

      // Add streak freeze columns
      await queryInterface.addColumn('Gamifications', 'streakFreezes', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of streak freeze tokens available (max 3)'
      }, { transaction });

      await queryInterface.addColumn('Gamifications', 'streakFreezesUsed', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total streak freezes used (lifetime)'
      }, { transaction });

      await queryInterface.addColumn('Gamifications', 'lastStreakFreezeUsed', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the last streak freeze was consumed'
      }, { transaction });

      await queryInterface.addColumn('Gamifications', 'lastStreakFreezeEarned', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the last streak freeze was earned'
      }, { transaction });

      await transaction.commit();
      console.log('✅ Added streak freeze columns to Gamifications table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to add streak freeze columns:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('Gamifications', 'streakFreezes', { transaction });
      await queryInterface.removeColumn('Gamifications', 'streakFreezesUsed', { transaction });
      await queryInterface.removeColumn('Gamifications', 'lastStreakFreezeUsed', { transaction });
      await queryInterface.removeColumn('Gamifications', 'lastStreakFreezeEarned', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
