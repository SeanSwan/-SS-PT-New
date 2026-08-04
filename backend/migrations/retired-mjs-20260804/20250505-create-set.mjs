/**
 * Migration: Create Sets Table
 * ===========================
 * Creates the 'sets' table for storing exercise set data.
 * This normalizes what was previously stored as a JSON field in workout_exercises.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sets', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      workoutExerciseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'workout_exercises',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      setNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },
      setType: {
        type: DataTypes.ENUM('warmup', 'working', 'dropset', 'superset', 'failure', 'amrap', 'rest_pause'),
        defaultValue: 'working'
      },
      repsGoal: {
        type: DataTypes.INTEGER
      },
      repsCompleted: {
        type: DataTypes.INTEGER
      },
      weightGoal: {
        type: DataTypes.FLOAT
      },
      weightUsed: {
        type: DataTypes.FLOAT
      },
      duration: {
        type: DataTypes.INTEGER
      },
      distance: {
        type: DataTypes.FLOAT
      },
      restGoal: {
        type: DataTypes.INTEGER
      },
      restTaken: {
        type: DataTypes.INTEGER
      },
      rpe: {
        type: DataTypes.FLOAT
      },
      tempo: {
        type: DataTypes.STRING
      },
      notes: {
        type: DataTypes.TEXT
      },
      isPR: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      completedAt: {
        type: DataTypes.DATE
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    });

    // Add indexes for faster queries
    await queryInterface.addIndex('sets', ['workoutExerciseId']);
    await queryInterface.addIndex('sets', ['setNumber']);
    await queryInterface.addIndex('sets', ['isPR']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sets');
  }
};