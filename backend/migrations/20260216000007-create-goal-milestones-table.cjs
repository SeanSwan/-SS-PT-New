'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('goal_milestones', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      goalId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'goals', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      targetValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      targetPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      isAchieved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      achievedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      xpReward: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 25,
      },
      badgeId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('goal_milestones', ['goalId', 'sortOrder'], { name: 'goal_milestones_goal_order' });
    await queryInterface.addIndex('goal_milestones', ['goalId', 'isAchieved'], { name: 'goal_milestones_goal_achieved' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('goal_milestones', 'goal_milestones_goal_order');
    await queryInterface.removeIndex('goal_milestones', 'goal_milestones_goal_achieved');
    await queryInterface.dropTable('goal_milestones');
  },
};
