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
    const table = await queryInterface.describeTable('Exercises');

    if (table.coachingCues) {
      await queryInterface.removeColumn('Exercises', 'coachingCues');
    }
  }
};
