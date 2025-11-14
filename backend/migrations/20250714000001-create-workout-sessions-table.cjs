/**
 * Migration: Create Workout Sessions Table
 * ==========================================
 *
 * Creates the workout_sessions table for tracking completed workout sessions.
 * This table is referenced by daily_workout_forms and other workout tracking features.
 *
 * Part of the NASM Workout Tracking System - Phase 2.1: Database Foundation
 * Prerequisite for daily_workout_forms migration
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('workout_sessions')) {
      console.log('⏭️  Table workout_sessions already exists, skipping...');
      return;
    }

    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('💪 Creating workout_sessions table...');

      await queryInterface.createTable('workout_sessions', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: 'Unique identifier for the workout session'
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'User who performed this workout session (client)'
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Title/name of the workout session'
        },
        date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Date when the workout was performed'
        },
        duration: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Duration in minutes'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Session notes'
        },
        totalWeight: {
          type: Sequelize.FLOAT,
          allowNull: true,
          defaultValue: 0,
          comment: 'Total weight lifted in this session (calculated)'
        },
        totalReps: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
          comment: 'Total number of reps in this session (calculated)'
        },
        totalSets: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
          comment: 'Total number of sets in this session (calculated)'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether this workout session is currently in progress'
        },
        avgRPE: {
          type: Sequelize.FLOAT,
          allowNull: true,
          comment: 'Average Rate of Perceived Exertion for the session (1-10)'
        },
        experiencePoints: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultTo: 0,
          comment: 'XP earned from this workout session'
        },
        workoutPlanId: {
          type: Sequelize.UUID,
          allowNull: true,
          comment: 'Reference to workout plan if this session was part of a plan'
        },
        workoutPlanDayId: {
          type: Sequelize.UUID,
          allowNull: true,
          comment: 'Reference to specific workout plan day if applicable'
        },
        status: {
          type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'skipped', 'cancelled'),
          allowNull: false,
          defaultValue: 'planned',
          comment: 'Current status of the workout session'
        },
        startedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When the workout was actually started'
        },
        completedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When the workout was completed'
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
      }, {
        transaction,
        comment: 'Tracks completed workout sessions with performance data'
      });

      // Create indexes
      await queryInterface.addIndex('workout_sessions', ['userId'], {
        name: 'workout_session_user_idx',
        transaction
      });

      await queryInterface.addIndex('workout_sessions', ['date'], {
        name: 'workout_session_date_idx',
        transaction
      });

      await queryInterface.addIndex('workout_sessions', ['status'], {
        name: 'workout_session_status_idx',
        transaction
      });

      await queryInterface.addIndex('workout_sessions', ['workoutPlanId'], {
        name: 'workout_session_plan_idx',
        transaction
      });

      // Composite index for common queries
      await queryInterface.addIndex('workout_sessions', ['userId', 'date'], {
        name: 'workout_session_user_date_idx',
        transaction
      });

      await transaction.commit();
      console.log('✅ Successfully created workout_sessions table');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating workout_sessions table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🗑️  Dropping workout_sessions table...');

      // Remove indexes first
      const indexes = [
        'workout_session_user_idx',
        'workout_session_date_idx',
        'workout_session_status_idx',
        'workout_session_plan_idx',
        'workout_session_user_date_idx'
      ];

      for (const indexName of indexes) {
        try {
          await queryInterface.removeIndex('workout_sessions', indexName, { transaction });
        } catch (error) {
          console.warn(`Index ${indexName} might not exist, continuing...`);
        }
      }

      // Drop enum type
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_workout_sessions_status";',
        { transaction }
      );

      // Drop table
      await queryInterface.dropTable('workout_sessions', { transaction });

      await transaction.commit();
      console.log('✅ Successfully dropped workout_sessions table');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping workout_sessions table:', error);
      throw error;
    }
  }
};
