/**
 * Migration: Create Exercise Equipment Junction Table
 * =================================================
 * Creates the junction table between exercises and equipment.
 * This allows many-to-many relationships with metadata about the relationship.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exercise_equipment', {
      exerciseId: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: {
          model: 'exercises',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      equipmentId: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: {
          model: 'equipment',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      preferredWeight: {
        type: DataTypes.STRING
      },
      setupInstructions: {
        type: DataTypes.TEXT
      },
      alternatives: {
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
    await queryInterface.addIndex('exercise_equipment', ['exerciseId']);
    await queryInterface.addIndex('exercise_equipment', ['equipmentId']);
    await queryInterface.addIndex('exercise_equipment', ['required']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('exercise_equipment');
  }
};