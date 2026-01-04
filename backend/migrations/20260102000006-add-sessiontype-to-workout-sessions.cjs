'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add sessionType column to workout_sessions table
    await queryInterface.addColumn('workout_sessions', 'sessionType', {
      type: Sequelize.ENUM('solo', 'trainer-led'),
      defaultValue: 'trainer-led',
      after: 'status',
    });

    // Add trainerId column (may already exist, handle gracefully)
    try {
      await queryInterface.addColumn('workout_sessions', 'trainerId', {
        type: Sequelize.UUID,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'recordedBy',
      });
    } catch (error) {
      console.log('trainerId column may already exist, skipping...');
    }

    // Add sessionId column (link to booked sessions)
    try {
      await queryInterface.addColumn('workout_sessions', 'sessionId', {
        type: Sequelize.UUID,
        references: {
          model: 'Sessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'trainerId',
      });
    } catch (error) {
      console.log('sessionId column may already exist, skipping...');
    }

    // Add index for sessionType
    await queryInterface.addIndex('workout_sessions', ['sessionType']);
    await queryInterface.addIndex('workout_sessions', ['userId', 'sessionType']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('workout_sessions', 'sessionType');
    // Only remove if they were added by this migration
    // await queryInterface.removeColumn('workout_sessions', 'trainerId');
    // await queryInterface.removeColumn('workout_sessions', 'sessionId');
  },
};
