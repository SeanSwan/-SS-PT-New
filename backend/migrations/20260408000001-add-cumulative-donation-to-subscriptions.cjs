'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('subscriptions');
    if (!tableDesc.cumulativeDonationAmount) {
      await queryInterface.addColumn('subscriptions', 'cumulativeDonationAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total lifetime Guardian donations — triggers Crystalline promo at $25+',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscriptions', 'cumulativeDonationAmount');
  },
};
