'use strict';

/**
 * Add endDate + bookingDate + cancellationDate to sessions
 * ========================================================
 * Fixes booking/reschedule queries that reference endDate.
 * Safe/idempotent: checks for existing columns before add.
 *
 * WHY:
 * - session.service.mjs uses endDate in conflict queries
 * - missing column triggers 500s in production
 *
 * CREATED: 2026-02-02
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('sessions');

    if (!table.endDate) {
      await queryInterface.addColumn('sessions', 'endDate', {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
        comment: 'End date/time of the session'
      });
    }

    if (!table.bookingDate) {
      await queryInterface.addColumn('sessions', 'bookingDate', {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
        comment: 'When the session was booked'
      });
    }

    if (!table.cancellationDate) {
      await queryInterface.addColumn('sessions', 'cancellationDate', {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
        comment: 'When the session was cancelled'
      });
    }

    // Backfill endDate for existing rows where possible
    if (!table.endDate) {
      await queryInterface.sequelize.query(`
        UPDATE "sessions"
        SET "endDate" = "sessionDate" + (COALESCE("duration", 60) || ' minutes')::interval
        WHERE "endDate" IS NULL AND "sessionDate" IS NOT NULL;
      `);
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('sessions');

    if (table.endDate) {
      await queryInterface.removeColumn('sessions', 'endDate');
    }

    if (table.bookingDate) {
      await queryInterface.removeColumn('sessions', 'bookingDate');
    }

    if (table.cancellationDate) {
      await queryInterface.removeColumn('sessions', 'cancellationDate');
    }
  }
};

