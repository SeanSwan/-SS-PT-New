'use strict';

/**
 * SWA-138 S3 — persisted read-state for Business Intelligence Alerts.
 *
 * The Contact model has declared viewedAt/respondedAt for a long time, but the
 * production `contacts` table has a history of drifting from the model (the
 * routes probe for `priority` for exactly this reason). This migration makes
 * the columns real, idempotently: ADD COLUMN IF NOT EXISTS is safe whether or
 * not a given environment already has them.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "viewedAt" TIMESTAMPTZ NULL;'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMPTZ NULL;'
    );
  },

  async down() {
    // Intentional no-op: `up` cannot distinguish environments where these
    // columns pre-existed (model declared them for months) from ones where it
    // added them. Dropping on rollback could destroy pre-existing read-state
    // data, so rollback preserves the columns. (Nullable columns are inert to
    // all code that predates this migration.)
  },
};
