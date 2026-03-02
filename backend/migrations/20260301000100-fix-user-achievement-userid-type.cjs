'use strict';

/**
 * Migration: Fix UserAchievements.userId type from UUID to INTEGER
 * ================================================================
 * Root cause: User.id is INTEGER (autoIncrement) but UserAchievements.userId
 * was created as UUID, causing PostgreSQL type cast errors on JOIN/query.
 *
 * RESILIENT: Handles two scenarios:
 *   A) Table exists (from .mjs migration) → fix userId column type
 *   B) Table doesn't exist → create it from scratch with correct types
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Check if UserAchievements table exists
      const [tables] = await queryInterface.sequelize.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserAchievements';`,
        { transaction }
      );

      if (tables.length === 0) {
        // Table doesn't exist — create it fresh with correct INTEGER userId
        await queryInterface.createTable('UserAchievements', {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          achievementId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'Achievements', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          earnedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          },
          progress: {
            type: Sequelize.FLOAT,
            allowNull: false,
            defaultValue: 0
          },
          isCompleted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          pointsAwarded: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          notificationSent: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          }
        }, { transaction });

        console.log('Migration 20260301000100: Created UserAchievements table with INTEGER userId');
      } else {
        // Table exists — check if userId is UUID and fix it
        const [columns] = await queryInterface.sequelize.query(
          `SELECT data_type FROM information_schema.columns
           WHERE table_name = 'UserAchievements' AND column_name = 'userId';`,
          { transaction }
        );

        if (columns.length > 0 && columns[0].data_type === 'uuid') {
          // userId is UUID — fix it to INTEGER
          await queryInterface.bulkDelete('UserAchievements', null, { transaction });
          await queryInterface.removeColumn('UserAchievements', 'userId', { transaction });
          await queryInterface.addColumn('UserAchievements', 'userId', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          }, { transaction });
          console.log('Migration 20260301000100: Fixed userId from UUID to INTEGER');
        } else {
          console.log('Migration 20260301000100: userId already INTEGER — no changes needed');
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Just drop the table since we may have created it
    try {
      await queryInterface.dropTable('UserAchievements');
    } catch (e) {
      console.log('down: UserAchievements table does not exist, nothing to drop');
    }
  }
};
