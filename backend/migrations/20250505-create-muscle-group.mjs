/**
 * Migration: Create Muscle Groups Table
 * ====================================
 * Creates the 'muscle_groups' table for storing muscle group data.
 * This normalizes what was previously stored as JSON arrays in the exercises table.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('muscle_groups', {
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
      shortName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      bodyRegion: {
        type: DataTypes.ENUM('upper_body', 'lower_body', 'core', 'full_body'),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT
      },
      anatomicalInfo: {
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
    await queryInterface.addIndex('muscle_groups', ['name']);
    await queryInterface.addIndex('muscle_groups', ['bodyRegion']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('muscle_groups');
  }
};