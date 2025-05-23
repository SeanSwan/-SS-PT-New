/**
 * Migration: Create Workout Plan Day Table
 * =======================================
 * Creates the 'workout_plan_days' table for storing workout plan day data.
 * This normalizes what was previously stored as JSON in the workout_plans table.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workout_plan_days', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      workoutPlanId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'workout_plans',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      dayNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      focus: {
        type: DataTypes.STRING
      },
      dayType: {
        type: DataTypes.ENUM('training', 'active_recovery', 'rest', 'assessment', 'specialization'),
        defaultValue: 'training'
      },
      optPhase: {
        type: DataTypes.ENUM('stabilization_endurance', 'strength_endurance', 'hypertrophy', 'maximal_strength', 'power')
      },
      notes: {
        type: DataTypes.TEXT
      },
      warmupInstructions: {
        type: DataTypes.TEXT
      },
      cooldownInstructions: {
        type: DataTypes.TEXT
      },
      estimatedDuration: {
        type: DataTypes.INTEGER
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isTemplate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
    await queryInterface.addIndex('workout_plan_days', ['workoutPlanId']);
    await queryInterface.addIndex('workout_plan_days', ['dayNumber']);
    await queryInterface.addIndex('workout_plan_days', ['dayType']);
    await queryInterface.addIndex('workout_plan_days', ['optPhase']);
    await queryInterface.addIndex('workout_plan_days', ['isTemplate']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('workout_plan_days');
  }
};