'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('order_items');

    if (!table.fulfillmentStatus) {
      await queryInterface.addColumn('order_items', 'fulfillmentStatus', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'not_required',
      });
    }

    if (!table.fulfilledAt) {
      await queryInterface.addColumn('order_items', 'fulfilledAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!table.fulfilledBy) {
      await queryInterface.addColumn('order_items', 'fulfilledBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!table.fulfillmentNotes) {
      await queryInterface.addColumn('order_items', 'fulfillmentNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    const indexes = await queryInterface.showIndex('order_items');
    const hasIndex = indexes.some((index) => (
      index.name === 'order_items_fulfillment_status_idx'
    ));

    if (!hasIndex) {
      await queryInterface.addIndex('order_items', ['fulfillmentStatus'], {
        name: 'order_items_fulfillment_status_idx',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('order_items');
    const hasIndex = indexes.some((index) => (
      index.name === 'order_items_fulfillment_status_idx'
    ));

    if (hasIndex) {
      await queryInterface.removeIndex('order_items', 'order_items_fulfillment_status_idx');
    }

    const table = await queryInterface.describeTable('order_items');
    for (const column of ['fulfillmentNotes', 'fulfilledBy', 'fulfilledAt', 'fulfillmentStatus']) {
      if (table[column]) {
        await queryInterface.removeColumn('order_items', column);
      }
    }
  },
};
