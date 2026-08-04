'use strict';

/**
 * Drift sweep 2026-08-04 (SWA-115 deep loop): enum_notifications_type has 6 labels
 * (orientation, system, order, workout, client, admin) while Notification.mjs's isIn
 * validator — the intent contract every caller was written against — allows 10. The
 * gap meant ALL EIGHT session-booking/reschedule/cancellation in-app notifications
 * failed on insert (type:'session'), and the body-measurement clear-overdue path
 * compared against a 'measurement' label that could not exist. Every failure was
 * swallowed by caller-side catches, so members simply never received them.
 *
 * Model validator is the intent; the enum drifted. Additive-only: ADD VALUE IF NOT
 * EXISTS, one per statement, no transaction wrapper (ALTER TYPE ... ADD VALUE must not
 * run inside an explicit transaction block on PG < 12; plain statements work on all).
 */
const LABELS = ['session', 'achievement', 'reward', 'measurement'];

module.exports = {
  async up(queryInterface) {
    for (const label of LABELS) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS '${label}'`
      );
    }
  },

  // Postgres cannot remove enum labels without recreating the type; rows may hold the
  // new labels by rollback time. Additive change — down is a documented no-op.
  async down() {
    return Promise.resolve();
  },
};
