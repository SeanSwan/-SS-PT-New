'use strict';

const TABLE_NAME = 'Users';
const COLUMN_NAME = 'sessionBillingMode';
const INDEX_NAME = 'users_session_billing_mode_idx';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable(TABLE_NAME);

    if (!table[COLUMN_NAME]) {
      await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME, {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'paid_sessions',
      });
    }

    const indexes = await queryInterface.showIndex(TABLE_NAME);
    if (!indexes.some((index) => index.name === INDEX_NAME)) {
      await queryInterface.addIndex(TABLE_NAME, [COLUMN_NAME], {
        name: INDEX_NAME,
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex(TABLE_NAME);
    if (indexes.some((index) => index.name === INDEX_NAME)) {
      await queryInterface.removeIndex(TABLE_NAME, INDEX_NAME);
    }

    const table = await queryInterface.describeTable(TABLE_NAME);
    if (table[COLUMN_NAME]) {
      await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME);
    }
  },
};
