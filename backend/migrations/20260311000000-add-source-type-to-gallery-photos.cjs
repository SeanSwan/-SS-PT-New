'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('gallery_photos', 'source_type', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'jpeg',
      comment: 'Original upload type: raw | jpeg',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('gallery_photos', 'source_type');
  },
};
