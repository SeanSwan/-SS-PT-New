'use strict';

/**
 * Persist all Board 2 joint-friendly modification fields rendered by the UI.
 */

const COLUMNS = [
  ['elbowMod', 'STRING'],
  ['footMod', 'STRING'],
  ['hipMod', 'STRING'],
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const [column, typeName] of COLUMNS) {
      await queryInterface.addColumn('bootcamp_exercises', column, {
        type: Sequelize[typeName](100),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    for (const [column] of [...COLUMNS].reverse()) {
      await queryInterface.removeColumn('bootcamp_exercises', column);
    }
  },
};
