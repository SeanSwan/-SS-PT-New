'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('variation_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      clientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      templateCategory: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      sessionType: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      rotationPattern: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'standard',
      },
      sessionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      exercisesUsed: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      swapDetails: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      equipmentProfileId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'equipment_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      nasmPhase: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      sessionDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      accepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      acceptedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('variation_logs', ['clientId'], { name: 'idx_variation_log_client' });
    await queryInterface.addIndex('variation_logs', ['trainerId'], { name: 'idx_variation_log_trainer' });
    await queryInterface.addIndex('variation_logs', ['clientId', 'templateCategory'], { name: 'idx_variation_log_client_category' });
    await queryInterface.addIndex('variation_logs', ['sessionDate'], { name: 'idx_variation_log_date' });
    await queryInterface.addIndex('variation_logs', ['sessionType'], { name: 'idx_variation_log_type' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('variation_logs');
  },
};
