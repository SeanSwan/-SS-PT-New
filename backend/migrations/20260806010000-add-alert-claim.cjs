'use strict';

/**
 * SWA-138 S4b — claim chip for alert triage.
 *
 * Read/archive state is per-admin (that is the point of the side table), but a
 * CLAIM must be visible to every admin: "Sean is handling this" is exactly the
 * signal that stops two people working the same refund. Idempotent.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "notification_read_state" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMPTZ NULL;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "notification_read_state" DROP COLUMN IF EXISTS "claimedAt";'
    );
  },
};
