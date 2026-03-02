'use strict';

/**
 * Migration: Reset All Users to Level 0
 * ======================================
 * Fresh start for the Crystalline Swan gamification system.
 * Resets all gamification counters and clears UserAchievements.
 *
 * This migration is intentionally non-reversible in a meaningful way
 * (we can't restore previous point/level values), but the down()
 * migration is provided for structural compliance.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Reset all users' gamification fields to zero
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET
        points = 0,
        level = 0,
        tier = 'bronze_forge',
        "streakDays" = 0
      WHERE 1=1;
    `);

    // Clear all user achievement records for fresh start
    await queryInterface.bulkDelete('UserAchievements', null, {});

    console.log('Migration 20260301000400: All users reset to Level 0, UserAchievements cleared.');
  },

  async down(queryInterface, Sequelize) {
    // Cannot restore previous values - this is a data reset
    // Set sensible defaults as a rollback gesture
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET
        level = 1
      WHERE level = 0;
    `);

    console.log('Migration 20260301000400 (down): Set level back to 1 for users at level 0.');
  }
};
