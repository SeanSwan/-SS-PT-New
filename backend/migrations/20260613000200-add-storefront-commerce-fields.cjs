'use strict';

/**
 * FILE: 20260613000200-add-storefront-commerce-fields.cjs
 * SYSTEM: Storefront / Catalog (commerce expansion Phase 0)
 *
 * PURPOSE:
 * - Prepare the catalog to hold physical products (supplements, merch) alongside
 *   training packages, so Sean can add sellable products. Adds:
 *     itemKind        'training_package' (default) | 'physical_product'
 *     isTaxable       BOOLEAN default false  (services not CA-taxed; goods = true)
 *     fulfillmentType 'none' (default) | 'dropship' (AGI) | 'self_ship' (merch)
 *     stockQuantity   INTEGER null (self-ship inventory; null = untracked)
 *     sku             STRING null
 *     shippingWeightOz INTEGER null
 *
 * WHY (2026-06-13): Decisions locked — mixed fulfillment (supplements dropship,
 * merch self-ship) + Stripe Tax for CA. Taxability is PER ITEM; training
 * packages stay non-taxable. See
 * docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md.
 *
 * SAFETY:
 * - Additive + defaulted; existing package rows are unchanged (default itemKind
 *   training_package, isTaxable false, fulfillmentType none).
 * - Idempotent: only adds a column when missing. Safe to re-run.
 *
 * CREATED: 2026-06-13
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('storefront_items')) {
        console.log('storefront_items not found, skipping commerce-fields migration.');
        await transaction.commit();
        return;
      }

      const columns = await queryInterface.describeTable('storefront_items', { transaction });
      const addColumnIfMissing = async (name, definition) => {
        if (!columns[name]) {
          await queryInterface.addColumn('storefront_items', name, definition, { transaction });
          console.log(`Added storefront_items.${name}`);
        } else {
          console.log(`storefront_items.${name} already present; skipping.`);
        }
      };

      await addColumnIfMissing('itemKind', {
        type: Sequelize.STRING(32), allowNull: false, defaultValue: 'training_package'
      });
      await addColumnIfMissing('isTaxable', {
        type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false
      });
      await addColumnIfMissing('fulfillmentType', {
        type: Sequelize.STRING(16), allowNull: false, defaultValue: 'none'
      });
      await addColumnIfMissing('stockQuantity', {
        type: Sequelize.INTEGER, allowNull: true
      });
      await addColumnIfMissing('sku', {
        type: Sequelize.STRING(64), allowNull: true
      });
      await addColumnIfMissing('shippingWeightOz', {
        type: Sequelize.INTEGER, allowNull: true
      });

      await transaction.commit();
      console.log('storefront_items commerce fields migration complete.');
    } catch (error) {
      await transaction.rollback();
      console.error('Failed to add storefront commerce fields:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const name of ['shippingWeightOz', 'sku', 'stockQuantity', 'fulfillmentType', 'isTaxable', 'itemKind']) {
        await queryInterface.removeColumn('storefront_items', name, { transaction }).catch(() => {});
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
