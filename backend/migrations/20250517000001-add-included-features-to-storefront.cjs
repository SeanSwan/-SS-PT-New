'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('storefront_items', 'includedFeatures', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON string of included features array'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('storefront_items', 'includedFeatures');
  }
};
