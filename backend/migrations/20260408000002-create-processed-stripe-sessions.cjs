'use strict';

/**
 * Migration: processed_stripe_sessions
 * Purpose: Idempotency ledger for Stripe webhook events.
 *          Prevents duplicate processing of checkout.session.completed
 *          (Stripe can deliver the same event more than once).
 *
 * Usage in webhook: INSERT INTO processed_stripe_sessions (session_id)
 *                   ON CONFLICT DO NOTHING RETURNING id
 *                   — if no row returned, event was already processed.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public."processed_stripe_sessions"') AS exists`
    );
    if (tableExists[0][0]?.exists) return;

    await queryInterface.createTable('processed_stripe_sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sessionId: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
        comment: 'Stripe checkout.session.id — unique guarantees idempotency',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User this session belonged to (for audit)',
      },
      tier: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Tier activated by this session',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Amount charged in this session',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('processed_stripe_sessions');
  },
};
