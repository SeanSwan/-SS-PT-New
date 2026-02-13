'use strict';

/**
 * Add creditsRequired column to session_types table
 * ==================================================
 * Allows different session types to cost different credit amounts.
 * E.g. 90-min extended training = 2 credits, assessment = 0 credits.
 *
 * Default 1 — existing session types cost 1 credit.
 *
 * CREATED: 2026-02-12
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('session_types');

    if (!table.creditsRequired) {
      await queryInterface.addColumn('session_types', 'creditsRequired', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of session credits consumed when booking'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('session_types');

    if (table.creditsRequired) {
      await queryInterface.removeColumn('session_types', 'creditsRequired');
    }
  }
};
