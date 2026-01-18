'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableCheck = await queryInterface.sequelize.query(
      "SELECT to_regclass('public.workout_sessions') AS table_name",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!tableCheck[0]?.table_name) {
      console.log('Skipping migration: workout_sessions table does not exist');
      return;
    }

    const table = await queryInterface.describeTable('workout_sessions');

    // Add sessionType column to workout_sessions table
    if (!table.sessionType) {
      await queryInterface.addColumn('workout_sessions', 'sessionType', {
        type: Sequelize.ENUM('solo', 'trainer-led'),
        defaultValue: 'trainer-led',
        after: 'status',
      });
    } else {
      console.log('sessionType column already exists, skipping...');
    }

    // Add trainerId column (may already exist, handle gracefully)
    if (!table.trainerId) {
      await queryInterface.addColumn('workout_sessions', 'trainerId', {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'recordedBy',
      });
    } else {
      console.log('trainerId column already exists, skipping...');
    }

    // Add sessionId column (link to booked sessions)
    if (!table.sessionId) {
      await queryInterface.addColumn('workout_sessions', 'sessionId', {
        type: Sequelize.INTEGER,
        references: {
          model: 'sessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'trainerId',
      });
    } else {
      console.log('sessionId column already exists, skipping...');
    }

    // Add index for sessionType
    try {
      await queryInterface.addIndex('workout_sessions', ['sessionType']);
    } catch (error) {
      console.log('sessionType index may already exist, skipping...');
    }

    try {
      await queryInterface.addIndex('workout_sessions', ['userId', 'sessionType']);
    } catch (error) {
      console.log('userId + sessionType index may already exist, skipping...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableCheck = await queryInterface.sequelize.query(
      "SELECT to_regclass('public.workout_sessions') AS table_name",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!tableCheck[0]?.table_name) {
      return;
    }

    const table = await queryInterface.describeTable('workout_sessions');

    if (table.sessionType) {
      await queryInterface.removeColumn('workout_sessions', 'sessionType');
    }
    // Only remove if they were added by this migration
    // await queryInterface.removeColumn('workout_sessions', 'trainerId');
    // await queryInterface.removeColumn('workout_sessions', 'sessionId');
  },
};
