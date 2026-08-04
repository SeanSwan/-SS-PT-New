/**
 * Migration: Create Workout Plan Day Exercise Table
 * ===============================================
 * Creates the 'workout_plan_day_exercises' table for storing exercises within workout plan days.
 * This further normalizes what was previously stored as JSON in the workout_plans table.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workout_plan_day_exercises', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      workoutPlanDayId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'workout_plan_days',
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
        allowNull: false
      },
      setScheme: {
        type: DataTypes.STRING
      },
      repGoal: {
        type: DataTypes.STRING
      },
      restPeriod: {
        type: DataTypes.INTEGER
      },
      tempo: {
        type: DataTypes.STRING
      },
      intensityGuideline: {
        type: DataTypes.STRING
      },
      supersetGroup: {
        type: DataTypes.INTEGER
      },
      notes: {
        type: DataTypes.TEXT
      },
      isOptional: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      alternateExerciseId: {
        type: DataTypes.UUID,
        references: {
          model: 'exercises',
          key: 'id'
        }
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
    await queryInterface.addIndex('workout_plan_day_exercises', ['workoutPlanDayId']);
    await queryInterface.addIndex('workout_plan_day_exercises', ['exerciseId']);
    await queryInterface.addIndex('workout_plan_day_exercises', ['orderInWorkout']);
    await queryInterface.addIndex('workout_plan_day_exercises', ['supersetGroup']);
    await queryInterface.addIndex('workout_plan_day_exercises', ['alternateExerciseId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('workout_plan_day_exercises');
  }
};