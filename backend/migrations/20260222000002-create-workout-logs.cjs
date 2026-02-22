'use strict';

/**
 * Create workout_logs table (normalized per-set logging)
 * ------------------------------------------------------
 * One row per set for analytics-friendly aggregation.
 *
 * Guard: ensures workout_sessions exists first (its original migration
 * may be recorded in SequelizeMeta without the table actually present).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();
    const tableNames = existingTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.tableName === 'string') return entry.tableName;
      return '';
    });

    // --- Ensure workout_sessions exists (FK target) ---
    if (!tableNames.includes('workout_sessions')) {
      console.log('[Migration] workout_sessions missing — creating prerequisite table');
      await queryInterface.createTable('workout_sessions', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        title: { type: Sequelize.STRING, allowNull: false },
        date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        duration: { type: Sequelize.INTEGER, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        totalWeight: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
        totalReps: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
        totalSets: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
        isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        avgRPE: { type: Sequelize.FLOAT, allowNull: true },
        experiencePoints: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        workoutPlanId: { type: Sequelize.UUID, allowNull: true },
        workoutPlanDayId: { type: Sequelize.UUID, allowNull: true },
        status: {
          type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'skipped', 'cancelled'),
          allowNull: false,
          defaultValue: 'planned'
        },
        startedAt: { type: Sequelize.DATE, allowNull: true },
        completedAt: { type: Sequelize.DATE, allowNull: true },
        intensity: { type: Sequelize.INTEGER, allowNull: true },
        sessionType: { type: Sequelize.STRING, allowNull: true },
        trainerId: { type: Sequelize.INTEGER, allowNull: true },
        sessionId: { type: Sequelize.INTEGER, allowNull: true },
        isMilestone: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        milestoneType: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
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
      console.log('[Migration] Created workout_sessions prerequisite table');
    }

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
