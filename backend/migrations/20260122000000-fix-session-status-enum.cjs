'use strict';

/**
 * FILE: 20260122000000-fix-session-status-enum.cjs
 * SYSTEM: Session Scheduling
 *
 * PURPOSE:
 * - Align PostgreSQL enum_sessions_status with statuses used by the unified session service.
 * - Prevent runtime errors when filtering or writing session status values.
 *
 * WHY:
 * - The service uses statuses like "confirmed", "blocked", and "booked".
 * - Production data showed enum_sessions_status missing "confirmed".
 * - Enum mismatches cause 500s and block schedule stats and booking flows.
 *
 * SAFETY:
 * - Adds missing values only; does not remove existing enum labels.
 * - Safe to re-run; existing values are skipped.
 *
 * CREATED: 2026-01-22
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    console.log('Fixing enum_sessions_status to include missing values...');

    const requiredStatuses = [
      'available',
      'requested',
      'scheduled',
      'confirmed',
      'completed',
      'cancelled',
      'blocked',
      'booked'
    ];

    try {
      await queryInterface.sequelize.transaction(async (t) => {
        const [types] = await queryInterface.sequelize.query(
          `SELECT oid FROM pg_type WHERE typname = 'enum_sessions_status';`,
          { transaction: t }
        );

        if (!types || types.length === 0) {
          console.log('enum_sessions_status not found, skipping migration.');
          return;
        }

        const [currentValues] = await queryInterface.sequelize.query(
          `
          SELECT enumlabel
          FROM pg_enum
          WHERE enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_sessions_status'
          );
          `,
          { transaction: t }
        );

        const existingValues = currentValues.map((row) => row.enumlabel);
        console.log(`Current enum values: ${existingValues.join(', ')}`);

        for (const status of requiredStatuses) {
          if (!existingValues.includes(status)) {
            await queryInterface.sequelize.query(
              `ALTER TYPE "enum_sessions_status" ADD VALUE '${status}';`,
              { transaction: t }
            );
            console.log(`Added enum value: ${status}`);
          }
        }
      });
    } catch (error) {
      console.error('Failed to update enum_sessions_status:', error.message);
      throw error;
    }
  },

  async down() {
    console.log('Rollback not supported for enum_sessions_status values.');
  }
};
