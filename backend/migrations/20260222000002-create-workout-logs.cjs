'use strict';

/**
 * Create workout_logs table (normalized per-set logging)
 * ------------------------------------------------------
 * One row per set for analytics-friendly aggregation.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();
    const tableNames = existingTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.tableName === 'string') return entry.tableName;
      return '';
    });

    if (tableNames.includes('workout_logs')) {
      console.log('[Migration] workout_logs already exists, skipping table creation');
      return;
    }

    await queryInterface.createTable('workout_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      sessionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'workout_sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      exerciseName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      setNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      reps: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      weight: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      tempo: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      rest: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      rpe: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    const existingIndexes = await queryInterface.showIndex('workout_logs');
    const existingIndexNames = existingIndexes.map((idx) => idx.name);

    if (!existingIndexNames.includes('workout_logs_session_id_idx')) {
      await queryInterface.addIndex('workout_logs', ['sessionId'], {
        name: 'workout_logs_session_id_idx'
      });
    }

    if (!existingIndexNames.includes('workout_logs_session_exercise_set_idx')) {
      await queryInterface.addIndex(
        'workout_logs',
        ['sessionId', 'exerciseName', 'setNumber'],
        { name: 'workout_logs_session_exercise_set_idx' }
      );
    }

    console.log('[Migration] Created workout_logs with indexes');
  },

  async down(queryInterface) {
    const existingTables = await queryInterface.showAllTables();
    const tableNames = existingTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.tableName === 'string') return entry.tableName;
      return '';
    });

    if (tableNames.includes('workout_logs')) {
      await queryInterface.dropTable('workout_logs');
      console.log('[Migration] Dropped workout_logs');
    }
  }
};
