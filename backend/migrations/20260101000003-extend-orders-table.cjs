'use strict';

/**
 * Migration: Extend Orders Table for Commission & Tax Tracking
 * Purpose: Add fields needed for:
 * - Trainer attribution
 * - Lead source tracking
 * - Tax calculation data
 * - Commission calculation data
 * - Instant credit grant flow
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add pending_payment to status enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'pending_payment';
    `);

    // Add trainer attribution
    await queryInterface.addColumn('orders', 'trainer_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Trainer attributed to this sale (for commission)'
    });

    // Add lead source tracking
    await queryInterface.addColumn('orders', 'lead_source', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Origin of the sale: platform (business lead), trainer_brought (trainer sourced), resign (renewal)'
    });

    // Add tax tracking fields
    await queryInterface.addColumn('orders', 'tax_amount', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Tax amount charged or absorbed'
    });

    await queryInterface.addColumn('orders', 'tax_rate_applied', {
      type: Sequelize.DECIMAL(5, 4),
      defaultValue: 0.0000,
      allowNull: false,
      comment: 'Tax rate used for calculation (e.g., 0.0725 for 7.25%)'
    });

    await queryInterface.addColumn('orders', 'tax_charged_to_client', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'True if tax charged on top, false if absorbed by business'
    });

    await queryInterface.addColumn('orders', 'client_state', {
      type: Sequelize.STRING(2),
      allowNull: true,
      comment: 'Client state code for tax calculation (e.g., CA, TX)'
    });

    // Add commission tracking fields
    await queryInterface.addColumn('orders', 'business_cut', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Business commission amount in dollars'
    });

    await queryInterface.addColumn('orders', 'trainer_cut', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Trainer commission amount in dollars'
    });

    // Add instant credit grant tracking
    await queryInterface.addColumn('orders', 'grant_reason', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Reason for credit grant: purchase_pending (instant grant), admin_grant (manual), etc.'
    });

    await queryInterface.addColumn('orders', 'sessions_granted', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Total sessions granted from this order'
    });

    await queryInterface.addColumn('orders', 'credits_granted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when credits were granted to client'
    });

    // Add indexes for new fields
    await queryInterface.addIndex('orders', ['trainer_id'], {
      name: 'idx_orders_trainer_id'
    });

    await queryInterface.addIndex('orders', ['lead_source'], {
      name: 'idx_orders_lead_source'
    });

    await queryInterface.addIndex('orders', ['client_state'], {
      name: 'idx_orders_client_state'
    });

    await queryInterface.addIndex('orders', ['grant_reason'], {
      name: 'idx_orders_grant_reason'
    });

    console.log('✅ Extended orders table with commission & tax tracking fields');
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('orders', 'idx_orders_trainer_id');
    await queryInterface.removeIndex('orders', 'idx_orders_lead_source');
    await queryInterface.removeIndex('orders', 'idx_orders_client_state');
    await queryInterface.removeIndex('orders', 'idx_orders_grant_reason');

    // Remove columns
    await queryInterface.removeColumn('orders', 'trainer_id');
    await queryInterface.removeColumn('orders', 'lead_source');
    await queryInterface.removeColumn('orders', 'tax_amount');
    await queryInterface.removeColumn('orders', 'tax_rate_applied');
    await queryInterface.removeColumn('orders', 'tax_charged_to_client');
    await queryInterface.removeColumn('orders', 'client_state');
    await queryInterface.removeColumn('orders', 'business_cut');
    await queryInterface.removeColumn('orders', 'trainer_cut');
    await queryInterface.removeColumn('orders', 'grant_reason');
    await queryInterface.removeColumn('orders', 'sessions_granted');
    await queryInterface.removeColumn('orders', 'credits_granted_at');

    console.log('✅ Reverted orders table extension');
  }
};
