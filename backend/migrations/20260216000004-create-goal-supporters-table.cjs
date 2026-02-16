'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('goal_supporters', {
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
      supporterId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      notifyOnProgress: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notifyOnCompletion: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      encouragementsSent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastEncouragementAt: {
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

    await queryInterface.addIndex('goal_supporters', ['goalId', 'supporterId'], { unique: true, name: 'goal_supporters_unique' });
    await queryInterface.addIndex('goal_supporters', ['supporterId'], { name: 'goal_supporters_supporter' });
    await queryInterface.addIndex('goal_supporters', ['goalId'], { name: 'goal_supporters_goal' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('goal_supporters', 'goal_supporters_unique');
    await queryInterface.removeIndex('goal_supporters', 'goal_supporters_supporter');
    await queryInterface.removeIndex('goal_supporters', 'goal_supporters_goal');
    await queryInterface.dropTable('goal_supporters');
  },
};
