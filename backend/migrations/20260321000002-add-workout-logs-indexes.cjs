'use strict';

/**
 * Migration: Add performance indexes to workout_logs table
 *
 * CEO Ruling V2.0 Issue #5: Missing DB indexes on workout_logs
 * Adds both single-column and composite index for exercise lookups.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Verify workout_logs table exists before adding indexes
    const tableDesc = await queryInterface.describeTable('workout_logs').catch(() => null);
    if (!tableDesc) {
      console.log('workout_logs table does not exist — skipping index creation');
      return;
    }

    // Single-column index on exercise_id (for joins)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise_id ON workout_logs("exerciseId");
    `).catch((e) => console.log('workout_logs exercise_id index:', e.message));

    // Composite index for client + exercise queries (most common lookup pattern)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_workout_logs_client_exercise ON workout_logs("clientId", "exerciseId");
    `).catch((e) => console.log('workout_logs composite index:', e.message));

    console.log('workout_logs indexes migration complete');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_workout_logs_exercise_id;').catch(() => {});
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_workout_logs_client_exercise;').catch(() => {});
  },
};
