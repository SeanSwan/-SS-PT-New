'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('renewal_alerts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sessionsRemaining: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      lastSessionDate: {
        type: Sequelize.DATE,
      },
      daysSinceLastSession: {
        type: Sequelize.INTEGER,
      },
      urgencyScore: {
        type: Sequelize.INTEGER,
        validate: {
          min: 1,
          max: 10,
        },
      },
      status: {
        type: Sequelize.ENUM('active', 'contacted', 'renewed', 'dismissed'),
        defaultValue: 'active',
      },
      contactedAt: {
        type: Sequelize.DATE,
      },
      contactedBy: {
        type: Sequelize.UUID,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      notes: {
        type: Sequelize.TEXT,
      },
      renewedAt: {
        type: Sequelize.DATE,
      },
      dismissedAt: {
        type: Sequelize.DATE,
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

    // Add indexes
    await queryInterface.addIndex('renewal_alerts', ['userId']);
    await queryInterface.addIndex('renewal_alerts', ['status']);
    await queryInterface.addIndex('renewal_alerts', ['urgencyScore']);
    await queryInterface.addIndex('renewal_alerts', ['userId', 'status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('renewal_alerts');
  },
};
