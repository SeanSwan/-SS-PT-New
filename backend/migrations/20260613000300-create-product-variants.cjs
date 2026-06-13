'use strict';

/**
 * FILE: 20260613000300-create-product-variants.cjs
 * SYSTEM: Storefront / Catalog (commerce expansion Phase 1)
 *
 * PURPOSE:
 * - Create product_variants so a physical StorefrontItem product can have
 *   sellable variants (e.g. the recovery drink in 1.5L / 16oz; merch in
 *   size × color), each with optional price override + inventory + SKU.
 *
 * WHY (2026-06-13): Phase 1 product cards need a variant picker. Training
 * packages have no variants. See
 * docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 *
 * SAFETY:
 * - Additive new table; idempotent (skips if it already exists). FK to
 *   storefront_items with ON DELETE CASCADE (variants die with their product).
 *
 * CREATED: 2026-06-13
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('product_variants')) {
      console.log('product_variants already exists; skipping.');
      return;
    }

    await queryInterface.createTable('product_variants', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      storefrontItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'storefront_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      label: { type: Sequelize.STRING(96), allowNull: false },
      sku: { type: Sequelize.STRING(64), allowNull: true },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      stockQuantity: { type: Sequelize.INTEGER, allowNull: true },
      attributes: { type: Sequelize.JSONB, allowNull: true },
      displayOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('product_variants', ['storefrontItemId']);
    await queryInterface.addIndex('product_variants', ['isActive']);
    console.log('Created product_variants table.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_variants');
  },
};
