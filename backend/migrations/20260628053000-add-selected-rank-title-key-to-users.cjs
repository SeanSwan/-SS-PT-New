'use strict';

const TABLE_NAME = 'Users';
const COLUMN_NAME = 'selectedRankTitleKey';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable(TABLE_NAME);

    if (!table[COLUMN_NAME]) {
      await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME, {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'User-selected earned public rank title key for profile display',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable(TABLE_NAME);

    if (table[COLUMN_NAME]) {
      await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME);
    }
  },
};
