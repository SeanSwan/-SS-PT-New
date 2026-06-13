'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('order_items');

    if (!table.productVariantId) {
      await queryInterface.addColumn('order_items', 'productVariantId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'product_variants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    const indexes = await queryInterface.showIndex('order_items');
    const hasIndex = indexes.some((index) => (
      index.name === 'order_items_product_variant_id_idx'
    ));

    if (!hasIndex) {
      await queryInterface.addIndex('order_items', ['productVariantId'], {
        name: 'order_items_product_variant_id_idx',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('order_items');
    const hasIndex = indexes.some((index) => (
      index.name === 'order_items_product_variant_id_idx'
    ));

    if (hasIndex) {
      await queryInterface.removeIndex('order_items', 'order_items_product_variant_id_idx');
    }

    const table = await queryInterface.describeTable('order_items');
    if (table.productVariantId) {
      await queryInterface.removeColumn('order_items', 'productVariantId');
    }
  },
};
