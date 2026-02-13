'use strict';

/**
 * Add bannerPhoto column to Users table
 * ======================================
 * Stores the path/URL for client profile banner images.
 *
 * CREATED: 2026-02-12
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.bannerPhoto) {
      await queryInterface.addColumn('Users', 'bannerPhoto', {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
        comment: 'Banner/cover photo URL for client profile'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.bannerPhoto) {
      await queryInterface.removeColumn('Users', 'bannerPhoto');
    }
  }
};
