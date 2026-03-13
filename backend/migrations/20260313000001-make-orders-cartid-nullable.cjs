'use strict';

/**
 * Migration: Make orders.cartId nullable for offline payments
 *
 * Offline payment orders (Zelle, Check, Venmo) don't have a shopping cart.
 * The FK constraint to shopping_carts prevents inserting cartId=0 or NULL.
 * This migration drops the FK and makes the column nullable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Find and drop the FK constraint on cartId
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'orders'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%cartId%' OR constraint_name LIKE '%cart_id%'
    `);

    for (const row of constraints) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`
      );
      console.log(`  Dropped FK constraint: ${row.constraint_name}`);
    }

    // 2. Also try the default Sequelize FK naming convention
    await queryInterface.sequelize.query(`
      ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_cartId_fkey"
    `);

    // 3. Make cartId nullable
    await queryInterface.changeColumn('orders', 'cartId', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    console.log('✅ orders.cartId is now nullable (offline payments supported)');
  },

  async down(queryInterface, Sequelize) {
    // Revert: make cartId NOT NULL again (only safe if no NULL values exist)
    await queryInterface.changeColumn('orders', 'cartId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    console.log('✅ Reverted orders.cartId to NOT NULL');
  }
};
