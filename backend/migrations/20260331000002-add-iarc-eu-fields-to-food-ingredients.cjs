'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('food_ingredients', 'iarcGroup', {
      type: Sequelize.STRING(10),
      allowNull: true,
    });
    await queryInterface.addColumn('food_ingredients', 'isEUBanned', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('food_ingredients', 'bannedRegions', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('food_ingredients', 'iarcGroup');
    await queryInterface.removeColumn('food_ingredients', 'isEUBanned');
    await queryInterface.removeColumn('food_ingredients', 'bannedRegions');
  },
};
