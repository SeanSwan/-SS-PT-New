'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('goal_likes', {
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
      reactionType: {
        type: Sequelize.ENUM('like', 'celebrate', 'support', 'fire', 'inspire'),
        allowNull: false,
        defaultValue: 'like',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('goal_likes', ['goalId', 'userId', 'reactionType'], { unique: true, name: 'goal_likes_unique_reaction' });
    await queryInterface.addIndex('goal_likes', ['goalId'], { name: 'goal_likes_goal' });
    await queryInterface.addIndex('goal_likes', ['userId'], { name: 'goal_likes_user' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('goal_likes', 'goal_likes_unique_reaction');
    await queryInterface.removeIndex('goal_likes', 'goal_likes_goal');
    await queryInterface.removeIndex('goal_likes', 'goal_likes_user');
    await queryInterface.dropTable('goal_likes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_goal_likes_reactionType";');
  },
};
