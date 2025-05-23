/**
 * Migration: Update Exercise Model - Remove JSON Fields
 * ===================================================
 * Updates the exercises table to remove JSON fields that have been normalized
 * into separate tables (primaryMuscles, secondaryMuscles, equipmentNeeded).
 * 
 * Note: This migration should be run after data has been migrated from
 * the JSON fields to the new normalized tables.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    // Add a comment to help track this migration
    await queryInterface.sequelize.query(
      "COMMENT ON TABLE exercises IS 'Updated to normalize JSON fields into separate tables'"
    ).catch(err => {
      console.log('Comment operation failed, but continuing migration');
    });
    
    // Remove the JSON fields that are now normalized in separate tables
    return Promise.all([
      queryInterface.removeColumn('exercises', 'primaryMuscles'),
      queryInterface.removeColumn('exercises', 'secondaryMuscles'),
      queryInterface.removeColumn('exercises', 'equipmentNeeded'),
      queryInterface.removeColumn('exercises', 'progressionPath')
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Add back the JSON fields if we need to rollback
    return Promise.all([
      queryInterface.addColumn('exercises', 'primaryMuscles', {
        type: DataTypes.JSON,
        defaultValue: []
      }),
      queryInterface.addColumn('exercises', 'secondaryMuscles', {
        type: DataTypes.JSON,
        defaultValue: []
      }),
      queryInterface.addColumn('exercises', 'equipmentNeeded', {
        type: DataTypes.JSON,
        defaultValue: []
      }),
      queryInterface.addColumn('exercises', 'progressionPath', {
        type: DataTypes.JSON,
        defaultValue: {}
      })
    ]);
  }
};