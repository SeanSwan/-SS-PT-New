'use strict';

/**
 * S0.4 (nutrition blueprint 2026-08-04): macro-write idempotency.
 *
 * POST /api/macros had no idempotency — a retried mobile request (flaky gym
 * wifi, double-tap) double-logged the meal. The route now accepts an optional
 * client-generated `clientRequestId`; this partial unique index makes the replay
 * a fetch instead of a second row, atomically, across all Render instances.
 * Partial (WHERE NOT NULL) so the column stays optional for every existing
 * writer — same pattern as point_transactions' idempotency index.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('daily_macro_logs');
    if (!tableInfo.clientRequestId) {
      await queryInterface.addColumn('daily_macro_logs', 'clientRequestId', {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: null,
        comment: 'Client-generated idempotency key; unique per user when present',
      });
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS daily_macro_logs_user_client_request_id
      ON daily_macro_logs ("userId", "clientRequestId")
      WHERE "clientRequestId" IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS daily_macro_logs_user_client_request_id'
    );
    await queryInterface.removeColumn('daily_macro_logs', 'clientRequestId');
  },
};
