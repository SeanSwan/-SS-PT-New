'use strict';

/**
 * G09/S9 — forget + purge columns for coach_facts.
 *
 * - forgottenAt: when a human forget operator invalidated this fact for
 *   privacy/deletion reasons (distinct from a normal supersede invalidation).
 * - purgeAfterAt: forgottenAt + 24h; purgeDueFacts() hard-destroys the row
 *   after this instant (contract: purge within 24h).
 * - conflictMetadata: T37 conflict annotations (JSONB), written only by an
 *   explicit reconcile step — never a silent mutation.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('coach_facts');
    if (!table.forgottenAt) {
      await queryInterface.addColumn('coach_facts', 'forgottenAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!table.purgeAfterAt) {
      await queryInterface.addColumn('coach_facts', 'purgeAfterAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!table.conflictMetadata) {
      await queryInterface.addColumn('coach_facts', 'conflictMetadata', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('coach_facts');
    if (table.conflictMetadata) {
      await queryInterface.removeColumn('coach_facts', 'conflictMetadata');
    }
    if (table.purgeAfterAt) {
      await queryInterface.removeColumn('coach_facts', 'purgeAfterAt');
    }
    if (table.forgottenAt) {
      await queryInterface.removeColumn('coach_facts', 'forgottenAt');
    }
  },
};
