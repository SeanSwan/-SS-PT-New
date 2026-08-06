'use strict';

/**
 * SWA-138 S14 — archive snapshot.
 *
 * Archiving must survive the source. Contact alerts are backed by rows, but
 * finance alerts are COMPUTED per request — archive one and it simply stops
 * being emitted, so there would be nothing left to render in an archive view.
 * Storing a small snapshot (title/message/type/timestamp) at archive time makes
 * the archive self-contained and readable forever. Idempotent.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "notification_read_state" ADD COLUMN IF NOT EXISTS "snapshot" JSONB NULL;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "notification_read_state" DROP COLUMN IF EXISTS "snapshot";'
    );
  },
};
