'use strict';

/**
 * Migration: Add 'draft' value to enum_workout_plans_status
 * Idempotent — uses IF NOT EXISTS so safe to re-run.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'draft'
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_workout_plans_status'
          )
        ) THEN
          ALTER TYPE "enum_workout_plans_status" ADD VALUE 'draft';
        END IF;
      END
      $$;
    `);
  },

  down: async () => {
    // PostgreSQL does not support removing enum values — no-op
  },
};
