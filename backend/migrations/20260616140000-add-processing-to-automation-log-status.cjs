'use strict';

/**
 * FILE: 20260616140000-add-processing-to-automation-log-status.cjs
 * SYSTEM: Outbound Automation (nurture follow-up engine)
 *
 * PURPOSE:
 * - Add the 'processing' label to PostgreSQL enum_automation_logs_status so the drip
 *   sender can atomically CLAIM a log (pending -> processing) before sending.
 *
 * WHY (NURTURE-PRE-ARM-AUDIT-2026-06-16, BLOCKER 2):
 * - resolveFrequencyCap counts status='sent', but a log stays 'pending' through the actual
 *   send with no atomic claim, so two concurrent runners (cron tick + admin /process, or
 *   two Render instances) both read the same stale count and both send -> exceed the
 *   per-recipient cap, and the same 'pending' log can be double-sent.
 * - The fix claims each log (UPDATE ... SET status='processing' WHERE id=? AND status=?),
 *   proceeding only when exactly 1 row is claimed; the frequency cap then also counts
 *   in-flight 'processing' peers. Both require this enum value to exist.
 *
 * SAFETY:
 * - Adds the missing value only; never removes labels (mirrors 20260613000000 pattern).
 * - Idempotent + safe to re-run; an existing value is skipped.
 * - PG 12+ permits ALTER TYPE ... ADD VALUE inside a transaction (Render PG 13+); the new
 *   value is only ADDED here, never USED in the same txn.
 *
 * CREATED: 2026-06-16
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    console.log('Aligning enum_automation_logs_status with the drip-claim send path (adding "processing" if missing)...');

    try {
      await queryInterface.sequelize.transaction(async (t) => {
        const [types] = await queryInterface.sequelize.query(
          `SELECT oid FROM pg_type WHERE typname = 'enum_automation_logs_status';`,
          { transaction: t }
        );

        if (!types || types.length === 0) {
          console.log('enum_automation_logs_status not found, skipping migration.');
          return;
        }

        const [currentValues] = await queryInterface.sequelize.query(
          `
          SELECT enumlabel
          FROM pg_enum
          WHERE enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_automation_logs_status'
          );
          `,
          { transaction: t }
        );

        const existingValues = currentValues.map((row) => row.enumlabel);
        console.log(`Current enum values: ${existingValues.join(', ')}`);

        if (!existingValues.includes('processing')) {
          await queryInterface.sequelize.query(
            `ALTER TYPE "enum_automation_logs_status" ADD VALUE 'processing';`,
            { transaction: t }
          );
          console.log('Added enum value: processing');
        }
      });
    } catch (error) {
      console.error('Failed to update enum_automation_logs_status:', error.message);
      throw error;
    }
  },

  async down() {
    // PostgreSQL cannot drop enum values; aligning labels forward-only is safe.
    console.log('Rollback not supported for enum_automation_logs_status values.');
  }
};
