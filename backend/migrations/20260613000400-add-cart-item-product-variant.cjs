/**
 * FILE: 20260613000400-add-cart-item-product-variant.cjs
 * PURPOSE: Preserve selected physical-product variants through cart checkout.
 *
 * Training packages keep productVariantId NULL. Physical products can point to
 * product_variants.id so cart, Stripe metadata, and fulfillment know the exact
 * drink size / merch option selected by the buyer.
 */
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((table) => (
      typeof table === 'string' ? table : table.tableName
    ));

    if (!normalizedTables.includes('cart_items') || !normalizedTables.includes('product_variants')) {
      console.log('cart_items or product_variants missing; skipping cart variant column.');
      return;
    }

    const columns = await queryInterface.describeTable('cart_items');
    if (!columns.productVariantId) {
      await queryInterface.addColumn('cart_items', 'productVariantId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'product_variants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    await queryInterface.addIndex('cart_items', ['productVariantId'], {
      name: 'cart_items_product_variant_id_idx',
    }).catch(() => {});
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((table) => (
      typeof table === 'string' ? table : table.tableName
    ));

    if (!normalizedTables.includes('cart_items')) return;

    await queryInterface.removeIndex('cart_items', 'cart_items_product_variant_id_idx').catch(() => {});

    const columns = await queryInterface.describeTable('cart_items');
    if (columns.productVariantId) {
      await queryInterface.removeColumn('cart_items', 'productVariantId');
    }
  },
};
