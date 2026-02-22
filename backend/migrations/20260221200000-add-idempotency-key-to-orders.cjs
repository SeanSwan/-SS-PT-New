'use strict';

/**
 * Migration: Add idempotencyKey column to Orders table
 * Purpose: DB-backed idempotency for payment recovery flow.
 * A partial UNIQUE index on this column prevents race-condition duplicates
 * that the app-level 60-second window check cannot catch.
 *
 * Key format: Frontend-generated UUID v4 token
 * Partial index: only non-null rows are indexed (existing orders unaffected)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('orders');
    const indexes = await queryInterface.showIndex('orders');
    const indexNames = indexes.map(i => i.name);

    // Add column if not exists
    if (!tableDescription.idempotencyKey) {
      await queryInterface.addColumn('orders', 'idempotencyKey', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Idempotency key for payment recovery dedup (frontend UUID v4)'
      });
      console.log('[Migration] Added idempotencyKey column to orders table');
    } else {
      console.log('[Migration] idempotencyKey column already exists, skipping');
    }

    // Add partial unique index if not exists
    if (!indexNames.includes('idx_orders_idempotency_key')) {
      await queryInterface.addIndex('orders', ['idempotencyKey'], {
        unique: true,
        name: 'idx_orders_idempotency_key',
        where: {
          idempotencyKey: { [Sequelize.Op.ne]: null }
        }
      });
      console.log('[Migration] Added partial unique index idx_orders_idempotency_key');
    } else {
      console.log('[Migration] idx_orders_idempotency_key index already exists, skipping');
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('orders');
    const indexNames = indexes.map(i => i.name);

    if (indexNames.includes('idx_orders_idempotency_key')) {
      await queryInterface.removeIndex('orders', 'idx_orders_idempotency_key');
      console.log('[Migration] Removed idx_orders_idempotency_key index');
    }

    const tableDescription = await queryInterface.describeTable('orders');
    if (tableDescription.idempotencyKey) {
      await queryInterface.removeColumn('orders', 'idempotencyKey');
      console.log('[Migration] Removed idempotencyKey column from orders table');
    }
  }
};
