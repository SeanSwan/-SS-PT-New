'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('measurement_milestones', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      measurementId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'body_measurements',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      milestoneType: {
        type: Sequelize.ENUM(
          'weight_loss_5lbs',
          'weight_loss_10lbs',
          'weight_loss_20lbs',
          'weight_loss_50lbs',
          'waist_loss_1inch',
          'waist_loss_2inches',
          'waist_loss_4inches',
          'body_fat_drop_1pct',
          'body_fat_drop_5pct',
          'muscle_gain_5lbs',
          'muscle_gain_10lbs',
          'bmi_normal_range',
          'goal_weight_achieved',
          'custom'
        ),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      celebrationMessage: {
        type: Sequelize.TEXT,
      },
      metricType: {
        type: Sequelize.STRING,
      },
      startValue: {
        type: Sequelize.DECIMAL(6, 2),
      },
      endValue: {
        type: Sequelize.DECIMAL(6, 2),
      },
      changeAmount: {
        type: Sequelize.DECIMAL(6, 2),
      },
      changePercentage: {
        type: Sequelize.DECIMAL(5, 2),
      },
      achievedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      daysSinceStart: {
        type: Sequelize.INTEGER,
      },
      triggersRenewalConversation: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      renewalConversationHeld: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      renewalConversationDate: {
        type: Sequelize.DATE,
      },
      renewalConversationNotes: {
        type: Sequelize.TEXT,
      },
      xpReward: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      badgeAwarded: {
        type: Sequelize.STRING,
      },
      isShared: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      shareableImageUrl: {
        type: Sequelize.STRING,
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
    await queryInterface.addIndex('measurement_milestones', ['userId']);
    await queryInterface.addIndex('measurement_milestones', ['measurementId']);
    await queryInterface.addIndex('measurement_milestones', ['milestoneType']);
    await queryInterface.addIndex('measurement_milestones', ['achievedAt']);
    await queryInterface.addIndex('measurement_milestones', ['triggersRenewalConversation']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('measurement_milestones');
  },
};
