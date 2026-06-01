'use strict';

/**
 * Preserve generated Board 2/3 source pairing for saved Boot Camp templates.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bootcamp_exercises', 'sourceExerciseName', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bootcamp_exercises', 'sourceExerciseName');
  },
};
