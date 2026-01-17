'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_notes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      relatedSessionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      noteType: {
        type: Sequelize.ENUM('observation', 'red_flag', 'achievement', 'concern', 'general'),
        allowNull: false,
        defaultValue: 'general',
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      tagsJson: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      followUpDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      isResolved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      visibility: {
        type: Sequelize.ENUM('private', 'trainer_only', 'admin_only'),
        allowNull: false,
        defaultValue: 'trainer_only',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('client_notes', ['userId']);
    await queryInterface.addIndex('client_notes', ['trainerId']);
    await queryInterface.addIndex('client_notes', ['noteType']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('client_notes');
  },
};
