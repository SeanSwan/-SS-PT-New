'use strict';

/**
 * Slice 3b — create the print_orders table.
 *
 * ⚠ Rule-58 finding (2026-07-06): print_orders NEVER existed in production. The
 * PrintOrder model + the /print-order checkout + the 3b webhook all reference it,
 * but no createTable migration was ever written (the plan mis-stated that one
 * existed). The May 2026 idempotency-index migration (20260520000001) calls
 * describeTable('print_orders') which THREW on the missing table; Render's
 * safe-migrate marked it COMPLETED (silent-fail), so it is in SequelizeMeta as
 * "done" and will not re-run — meaning it never created the idempotency unique
 * index either. This migration therefore creates the FULL table AND the unique
 * partial index the checkout's claimIdempotentRecord relies on for race-safety.
 *
 * Additive + idempotent: if the table already exists (an env where the original
 * intent did run), this is a no-op. Matches backend/models/PrintOrder.mjs exactly.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public."print_orders"') AS reg`
    );
    if (existing?.[0]?.reg) {
      console.log('⚠️ print_orders already exists, skipping createTable');
      return;
    }

    // Clean any orphaned enum types from a partial prior run (safe: no table depends on them).
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_print_orders_product_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_print_orders_status"');

    await queryInterface.createTable('print_orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      visitor_id: { type: Sequelize.INTEGER, allowNull: false },
      photo_id: { type: Sequelize.INTEGER, allowNull: false },
      event_id: { type: Sequelize.INTEGER, allowNull: false },
      product_type: {
        type: Sequelize.ENUM('print', 'canvas', 'metal', 'photobook', 'poster'),
        allowNull: false,
      },
      size: { type: Sequelize.STRING(50), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      crop_data: { type: Sequelize.JSONB, allowNull: true },
      price_usd: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      commission_usd: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      stripe_session_id: { type: Sequelize.STRING(255), allowNull: true },
      idempotency_key: { type: Sequelize.STRING(255), allowNull: true },
      print_provider_order_id: { type: Sequelize.STRING(255), allowNull: true },
      shipping_address: { type: Sequelize.JSONB, allowNull: true },
      tracking_number: { type: Sequelize.STRING(255), allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      shipped_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // Lookup indexes (match the model).
    await queryInterface.addIndex('print_orders', ['visitor_id']);
    await queryInterface.addIndex('print_orders', ['photo_id']);
    await queryInterface.addIndex('print_orders', ['event_id']);
    await queryInterface.addIndex('print_orders', ['status']);

    // Idempotency race-safety: the partial UNIQUE index the /print-order checkout's
    // claimIdempotentRecord(findOrCreate) depends on (the May migration intended
    // this but never applied it — see header).
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_print_orders_idempotency_key"
      ON "print_orders" ("idempotency_key")
      WHERE "idempotency_key" IS NOT NULL;
    `);

    console.log('✅ Created print_orders table + idempotency unique index');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "idx_print_orders_idempotency_key"');
    await queryInterface.dropTable('print_orders');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_print_orders_product_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_print_orders_status"');
  },
};
