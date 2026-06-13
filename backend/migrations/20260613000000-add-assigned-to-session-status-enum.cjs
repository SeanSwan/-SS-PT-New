'use strict';

/**
 * FILE: 20260613000000-add-assigned-to-session-status-enum.cjs
 * SYSTEM: Session Scheduling
 *
 * PURPOSE:
 * - Add the missing 'assigned' label to PostgreSQL enum_sessions_status so the
 *   model + services that already USE it stop 500ing in production.
 *
 * WHY (incident 2026-06-13):
 * - Session.mjs SESSION_STATUSES declares 'assigned'.
 * - TrainerAssignmentService.mjs writes `status: 'assigned'` ("assigned but not
 *   yet scheduled") -> INSERT 500s: invalid input value for enum
 *   enum_sessions_status: "assigned".
 * - conflictService.mjs ACTIVE_STATUSES filters `status IN (...'assigned'...)`
 *   -> every scheduling conflict check 500s the same way.
 * - The prior enum fix (20260122) added 'booked'/'blocked' but OMITTED
 *   'assigned'. This completes the alignment with the model + service usage.
 *
 * SAFETY:
 * - Adds missing values only; never removes labels (mirrors 20260122 pattern).
 * - Idempotent + safe to re-run; existing values are skipped.
 * - PG 12+ permits ALTER TYPE ... ADD VALUE inside a transaction (Render PG 13+);
 *   the new value is only ADDED here, never USED in the same txn.
 *
 * CREATED: 2026-06-13
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    console.log('Aligning enum_sessions_status with Session model + services (adding any missing values)...');

    // Full intended set: every Session.mjs SESSION_STATUSES value + 'booked'
    // (used by conflictService ACTIVE_STATUSES / booking flow, ensured by 20260122).
    const requiredStatuses = [
      'available',
      'assigned',
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
    // PostgreSQL cannot drop enum values; aligning labels forward-only is safe.
    console.log('Rollback not supported for enum_sessions_status values.');
  }
};
