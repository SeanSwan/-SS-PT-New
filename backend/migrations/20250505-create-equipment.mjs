/**
 * Migration: Create Equipment Table
 * ================================
 * Creates the 'equipment' table for storing exercise equipment data.
 * This normalizes what was previously stored as JSON arrays in the exercises table.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('equipment', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      category: {
        type: DataTypes.ENUM('free_weight', 'machine', 'bodyweight', 'cable', 'cardio', 'resistance_band', 'kettlebell', 'medicine_ball', 'stability', 'other'),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT
      },
      setupInstructions: {
        type: DataTypes.TEXT
      },
      safetyNotes: {
        type: DataTypes.TEXT
      },
      imageUrl: {
        type: DataTypes.STRING
      },
      availability: {
        type: DataTypes.ENUM('common', 'specialized', 'rare'),
        defaultValue: 'common'
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
    await queryInterface.addIndex('equipment', ['name']);
    await queryInterface.addIndex('equipment', ['category']);
    await queryInterface.addIndex('equipment', ['availability']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('equipment');
  }
};