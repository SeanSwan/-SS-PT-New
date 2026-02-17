'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('streaks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      streakType: {
        type: Sequelize.ENUM('workout', 'login', 'goal_progress', 'challenge', 'custom'),
        allowNull: false,
        defaultValue: 'workout',
      },
      currentCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      longestCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastActivityDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      freezesRemaining: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      freezesUsed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastFreezeDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      xpEarnedFromStreak: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      brokenAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      brokenReason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      history: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
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

    // Indexes
    await queryInterface.addIndex('streaks', ['userId', 'streakType'], { unique: true, name: 'streaks_user_type_unique' });
    await queryInterface.addIndex('streaks', ['userId', 'isActive'], { name: 'streaks_user_active' });
    await queryInterface.addIndex('streaks', ['currentCount'], { name: 'streaks_current_count' });
    await queryInterface.addIndex('streaks', ['longestCount'], { name: 'streaks_longest_count' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('streaks', 'streaks_user_type_unique');
    await queryInterface.removeIndex('streaks', 'streaks_user_active');
    await queryInterface.removeIndex('streaks', 'streaks_current_count');
    await queryInterface.removeIndex('streaks', 'streaks_longest_count');
    await queryInterface.dropTable('streaks');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_streaks_streakType";');
  },
};
