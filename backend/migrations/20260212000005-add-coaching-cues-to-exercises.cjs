'use strict';

/**
 * Add coachingCues JSONB column to Exercises table
 * =================================================
 * Stores structured coaching/form cues for each exercise.
 *
 * CREATED: 2026-02-12
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // H-02 class guard (hostile review of the review, 2026-09-18).
    // `Exercises` is not created until 20260307000002-create-exercises-table.cjs,
    // which runs AFTER this migration. describeTable() throws on a missing
    // table, so this kills a from-empty bootstrap.
    if (!(await queryInterface.tableExists('Exercises'))) {
      console.log('  [20260212000005] Exercises table absent — skipping (H-02 class guard)');
      return;
    }

    const table = await queryInterface.describeTable('Exercises');

    if (!table.coachingCues) {
      await queryInterface.addColumn('Exercises', 'coachingCues', {
        type: Sequelize.DataTypes.JSONB,
        allowNull: true,
        comment: 'Array of coaching/form cues for the exercise'
      });
    }
  },

  async down(queryInterface) {
    if (!(await queryInterface.tableExists('Exercises'))) return;
    const table = await queryInterface.describeTable('Exercises');

    if (table.coachingCues) {
      await queryInterface.removeColumn('Exercises', 'coachingCues');
    }
  }
};
