'use strict';

/**
 * Add follow-up timestamps to client onboarding coverage rows.
 * P6 uses these to track when missing data was requested from the client and
 * when a field was later resolved, without gating workout logging.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('client_onboarding_coverage_items').catch(() => null);
    if (!table) return;

    if (!table.requestedFromClientAt) {
      await queryInterface.addColumn('client_onboarding_coverage_items', 'requestedFromClientAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!table.resolvedAt) {
      await queryInterface.addColumn('client_onboarding_coverage_items', 'resolvedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('client_onboarding_coverage_items').catch(() => null);
    if (!table) return;

    if (table.resolvedAt) await queryInterface.removeColumn('client_onboarding_coverage_items', 'resolvedAt');
    if (table.requestedFromClientAt) await queryInterface.removeColumn('client_onboarding_coverage_items', 'requestedFromClientAt');
  },
};