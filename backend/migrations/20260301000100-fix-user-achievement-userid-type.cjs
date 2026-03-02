'use strict';

/**
 * Migration: Fix UserAchievements.userId type from UUID to INTEGER
 * ================================================================
 * Root cause: User.id is INTEGER (autoIncrement) but UserAchievements.userId
 * was created as UUID, causing PostgreSQL type cast errors on JOIN/query.
 *
 * Strategy: Clear existing data (no real user achievements exist yet),
 * drop the old UUID column, recreate as INTEGER with proper FK reference.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Clear any existing data (no real user achievements exist yet)
      await queryInterface.bulkDelete('UserAchievements', null, { transaction });

      // Remove the old userId column (UUID type)
      await queryInterface.removeColumn('UserAchievements', 'userId', { transaction });

      // Recreate userId as INTEGER to match Users.id
      await queryInterface.addColumn('UserAchievements', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('UserAchievements', 'userId', { transaction });
      await queryInterface.addColumn('UserAchievements', 'userId', {
        type: Sequelize.UUID,
        allowNull: false
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
