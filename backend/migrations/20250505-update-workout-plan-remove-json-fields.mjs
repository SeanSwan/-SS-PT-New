/**
 * Migration: Update Workout Plan Model - Remove JSON Fields
 * =======================================================
 * Updates the workout_plans table to remove the workoutStructure JSON field
 * that has been normalized into separate tables (workout_plan_days and
 * workout_plan_day_exercises).
 * 
 * Note: This migration should be run after data has been migrated from
 * the JSON fields to the new normalized tables.
 */

import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    // Add a comment to help track this migration
    await queryInterface.sequelize.query(
      "COMMENT ON TABLE workout_plans IS 'Updated to normalize JSON fields into separate tables'"
    ).catch(err => {
      console.log('Comment operation failed, but continuing migration');
    });
    
    // Remove the JSON field that is now normalized in separate tables
    return queryInterface.removeColumn('workout_plans', 'workoutStructure');
  },

  async down(queryInterface, Sequelize) {
    // Add back the JSON field if we need to rollback
    return queryInterface.addColumn('workout_plans', 'workoutStructure', {
      type: DataTypes.JSON,
      defaultValue: {}
    });
  }
};