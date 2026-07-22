'use strict';

/**
 * P0-4 (SWA-29) — the funnel event stream table (MEASUREMENT-CHARTER.md).
 * One row per funnel step: { event, ref?, meta_json, ts }. Non-identifying payload only
 * (the acquisitionTelemetry sanitizer is the sole writer + guarantees no PII/raw amounts).
 * Idempotent: guarded by an existence check so a re-run is a no-op.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [[{ exists }]] = await queryInterface.sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'acquisition_events'
       ) AS exists`
    );
    if (exists) {
      console.log('acquisition_events already exists — skipping.');
      return;
    }
    await queryInterface.createTable('acquisition_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      event: { type: Sequelize.STRING(48), allowNull: false },
      ref: { type: Sequelize.STRING(64), allowNull: true },
      meta_json: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      ts: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('acquisition_events', ['event']);
    await queryInterface.addIndex('acquisition_events', ['ts']);
    await queryInterface.addIndex('acquisition_events', ['event', 'ts']);
    console.log('Created acquisition_events.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('acquisition_events');
  },
};
