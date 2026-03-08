'use strict';

/**
 * Migration: Update Orientation Session Type to 60 Minutes
 * ========================================================
 * Updates the "Orientation / Onboarding" session type from 30 min to 60 min
 * to support VIP Photography clients who get a full 1-hour NASM Assessment
 * orientation as part of their VIP package.
 *
 * Also adds 15-min buffer after (consistent with PT sessions).
 */
module.exports = {
  async up(queryInterface) {
    // Update existing orientation type if it exists
    await queryInterface.sequelize.query(`
      UPDATE "session_types"
      SET
        "name" = 'Orientation / Onboarding (60 min)',
        "description" = 'New client orientation — NASM Movement Assessment, goals discussion, health history review, mobility/flexibility evaluation, personalized 90-Day Blueprint creation',
        "duration" = 60,
        "bufferAfter" = 15,
        "updatedAt" = NOW()
      WHERE "name" IN ('Orientation / Onboarding', 'Orientation / Onboarding (60 min)')
    `);
  },

  async down(queryInterface) {
    // Revert to original 30-min orientation
    await queryInterface.sequelize.query(`
      UPDATE "session_types"
      SET
        "name" = 'Orientation / Onboarding',
        "description" = 'New client orientation — facility tour, PAR-Q review, goal setting',
        "duration" = 30,
        "bufferAfter" = 0,
        "updatedAt" = NOW()
      WHERE "name" IN ('Orientation / Onboarding (60 min)', 'Orientation / Onboarding')
    `);
  },
};
