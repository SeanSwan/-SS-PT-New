'use strict';

/**
 * Add trainerNotes and clientSummary to daily_workout_forms
 * =========================================================
 * Supports trainer homework assignments and client-readable summaries.
 *
 * CREATED: 2026-02-12
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('daily_workout_forms');

    if (!table.trainer_notes) {
      await queryInterface.addColumn('daily_workout_forms', 'trainer_notes', {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
        comment: 'Trainer notes visible to client (homework, focus areas)'
      });
    }

    if (!table.client_summary) {
      await queryInterface.addColumn('daily_workout_forms', 'client_summary', {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
        comment: 'Client-ready workout summary (auto-generated or manual)'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('daily_workout_forms');

    if (table.client_summary) {
      await queryInterface.removeColumn('daily_workout_forms', 'client_summary');
    }

    if (table.trainer_notes) {
      await queryInterface.removeColumn('daily_workout_forms', 'trainer_notes');
    }
  }
};
