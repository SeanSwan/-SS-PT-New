// Migration to add new fields to Orientation table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Make userId nullable
      await queryInterface.changeColumn('orientations', 'userId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      }, { transaction });

      // Add new columns
      await queryInterface.addColumn('orientations', 'status', {
        type: Sequelize.ENUM('pending', 'scheduled', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      }, { transaction });

      await queryInterface.addColumn('orientations', 'assignedTrainer', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('orientations', 'scheduledDate', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('orientations', 'completedDate', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('orientations', 'source', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'website'
      }, { transaction });
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Remove added columns
      await queryInterface.removeColumn('orientations', 'status', { transaction });
      await queryInterface.removeColumn('orientations', 'assignedTrainer', { transaction });
      await queryInterface.removeColumn('orientations', 'scheduledDate', { transaction });
      await queryInterface.removeColumn('orientations', 'completedDate', { transaction });
      await queryInterface.removeColumn('orientations', 'source', { transaction });

      // Revert userId to not nullable
      await queryInterface.changeColumn('orientations', 'userId', {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      }, { transaction });
    });
  }
};