/**
 * Migration: Create Exercise Muscle Group Junction Table
 * ====================================================
 * Creates the junction table between exercises and muscle groups.
 * This allows many-to-many relationships with metadata about the relationship.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exercise_muscle_groups', {
      exerciseId: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: {
          model: 'exercises',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      muscleGroupId: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: {
          model: 'muscle_groups',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      activationType: {
        type: DataTypes.ENUM('primary', 'secondary', 'stabilizer'),
        allowNull: false,
        defaultValue: 'primary'
      },
      activationLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      notes: {
        type: DataTypes.TEXT
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
    await queryInterface.addIndex('exercise_muscle_groups', ['exerciseId']);
    await queryInterface.addIndex('exercise_muscle_groups', ['muscleGroupId']);
    await queryInterface.addIndex('exercise_muscle_groups', ['activationType']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('exercise_muscle_groups');
  }
};