/**
 * Migration: Create Workout Exercise Table (Enhanced)
 * =================================================
 * Creates the 'workout_exercises' table for storing exercise data within workout sessions.
 * 
 * This enhanced version removes the setDetails JSON field, which has been
 * normalized into the separate sets table.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workout_exercises', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      workoutSessionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'workout_sessions',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      exerciseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'exercises',
          key: 'id'
        }
      },
      orderInWorkout: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      // Performance Metrics
      performanceRating: {
        type: DataTypes.INTEGER
      },
      difficultyRating: {
        type: DataTypes.INTEGER
      },
      painLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      // Form Rating (NASM-based)
      formRating: {
        type: DataTypes.INTEGER
      },
      formNotes: {
        type: DataTypes.TEXT
      },
      // Rehabilitation & Physical Therapy
      isRehabExercise: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      rangeOfMotion: {
        type: DataTypes.INTEGER
      },
      stabilityRating: {
        type: DataTypes.INTEGER
      },
      // Gamification Metrics
      experiencePoints: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      achievementProgress: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      // General Notes
      notes: {
        type: DataTypes.TEXT
      },
      // Timestamps for performance tracking
      startedAt: {
        type: DataTypes.DATE
      },
      completedAt: {
        type: DataTypes.DATE
      },
      // Standard timestamps
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
    await queryInterface.addIndex('workout_exercises', ['workoutSessionId']);
    await queryInterface.addIndex('workout_exercises', ['exerciseId']);
    await queryInterface.addIndex('workout_exercises', ['orderInWorkout']);
    await queryInterface.addIndex('workout_exercises', ['isRehabExercise']);
    await queryInterface.addIndex('workout_exercises', ['experiencePoints']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('workout_exercises');
  }
};