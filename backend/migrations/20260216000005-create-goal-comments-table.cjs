'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('goal_comments', {
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
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      commentType: {
        type: Sequelize.ENUM('encouragement', 'tip', 'celebration', 'general'),
        allowNull: false,
        defaultValue: 'general',
      },
      isHidden: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      hiddenReason: {
        type: Sequelize.STRING,
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

    await queryInterface.addIndex('goal_comments', ['goalId', 'createdAt'], { name: 'goal_comments_goal_date' });
    await queryInterface.addIndex('goal_comments', ['userId'], { name: 'goal_comments_user' });
    await queryInterface.addIndex('goal_comments', ['commentType'], { name: 'goal_comments_type' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('goal_comments', 'goal_comments_goal_date');
    await queryInterface.removeIndex('goal_comments', 'goal_comments_user');
    await queryInterface.removeIndex('goal_comments', 'goal_comments_type');
    await queryInterface.dropTable('goal_comments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_goal_comments_commentType";');
  },
};
