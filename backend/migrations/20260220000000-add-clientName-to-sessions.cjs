'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists (idempotent)
    const tableDescription = await queryInterface.describeTable('sessions');
    if (!tableDescription.clientName) {
      await queryInterface.addColumn('sessions', 'clientName', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Manual client name for sessions without a linked user account'
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('sessions');
    if (tableDescription.clientName) {
      await queryInterface.removeColumn('sessions', 'clientName');
    }
  }
};
