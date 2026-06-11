'use strict';

/**
 * Repair migration: hashtag tables, re-homed into the scanned directory.
 *
 * The original migration (backend/migrations/social/20260324-create-hashtag-
 * tables.cjs) lives in a SUBDIRECTORY the migration runner never scans, so
 * production never got the Hashtags / PostHashtags / UserHashtagFollows
 * tables. Consequence (found 2026-06-11): every post containing a hashtag
 * silently vanished — the failed hashtag query poisoned the post's shared
 * transaction, the catch swallowed it, and Postgres turned COMMIT into a
 * silent ROLLBACK while the API returned 201 (data-loss class; the route fix
 * lands in the same commit). Production was hot-fixed 2026-06-11 by running
 * the original migration's up() directly; this wrapper makes the repair part
 * of the scanned ledger so other environments converge.
 *
 * Idempotent: skips when the tables already exist (the repaired production
 * case). No try/catch around the real work — failures must fail the deploy.
 */
const original = require('./social/20260324-create-hashtag-tables.cjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Hashtags'`
    );
    if (rows.length > 0) {
      console.log('Hashtag tables already present — repair migration is a no-op.');
      return;
    }
    await original.up(queryInterface, Sequelize);
  },

  async down(queryInterface) {
    await original.down(queryInterface);
  },
};
