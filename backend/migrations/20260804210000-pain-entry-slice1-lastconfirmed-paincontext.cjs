'use strict';

/**
 * Pain-Chart Slice 1 (PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04 §6):
 *  - lastConfirmedAt: when a human last confirmed the entry's current state.
 *    Drives staleness (re-confirmation clears it) without ever silently
 *    DROPPING a severe exclusion — fixes the C8 createdAt/updatedAt split.
 *  - painContext: rest | daily_activity | loaded_movement (F5) — pain at rest
 *    is a different clinical signal than pain under load; default preserves
 *    the historical meaning of existing rows (all were logged as load pain).
 *
 * Idempotent: guarded by describeTable so re-runs and partially-applied
 * environments are safe. Backfill: lastConfirmedAt seeds from "updatedAt"
 * (the column staleness previously keyed on) — never NULL-for-existing-rows
 * semantics that would flag every legacy entry stale on day one.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('client_pain_entries');

    if (!table.lastConfirmedAt) {
      await queryInterface.addColumn('client_pain_entries', 'lastConfirmedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time a human confirmed this entry state (staleness anchor)',
      });
      await queryInterface.sequelize.query(
        'UPDATE client_pain_entries SET "lastConfirmedAt" = "updatedAt" WHERE "lastConfirmedAt" IS NULL'
      );
    }

    if (!table.painContext) {
      await queryInterface.addColumn('client_pain_entries', 'painContext', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'loaded_movement',
        comment: 'rest | daily_activity | loaded_movement (F5 rest-pain escalation)',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('client_pain_entries');
    if (table.painContext) {
      await queryInterface.removeColumn('client_pain_entries', 'painContext');
    }
    if (table.lastConfirmedAt) {
      await queryInterface.removeColumn('client_pain_entries', 'lastConfirmedAt');
    }
  },
};
