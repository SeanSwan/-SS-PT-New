/**
 * FILE: 20260206000000-add-billing-sessions-fields.cjs
 * SYSTEM: Admin Client Overview - Billing & Sessions Feature (P0)
 *
 * PURPOSE:
 * Add payment tracking fields to Orders table and admin booking field to Sessions
 * table to support MindBody-like payment application with idempotency.
 *
 * FIELDS ADDED:
 * - orders.paymentAppliedAt: Timestamp when payment was applied (idempotency check)
 * - orders.paymentAppliedBy: Admin user ID who applied the payment
 * - orders.paymentReference: External payment reference (Venmo ID, cash receipt, etc.)
 * - sessions.bookedByAdminId: Admin user who booked session on behalf of client
 *
 * IDEMPOTENCY PATTERN:
 * When applying payment, check if paymentAppliedAt is set. If set, return
 * success with "already_paid" flag without reprocessing.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Migration: Adding billing & sessions fields...');

    // Add paymentAppliedAt to orders
    try {
      await queryInterface.addColumn('orders', 'paymentAppliedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when payment was applied (idempotency check)'
      });
      console.log('Added orders.paymentAppliedAt');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log('orders.paymentAppliedAt already exists, skipping');
      } else {
        throw err;
      }
    }

    // Add paymentAppliedBy to orders
    try {
      await queryInterface.addColumn('orders', 'paymentAppliedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Admin user ID who applied the payment'
      });
      console.log('Added orders.paymentAppliedBy');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log('orders.paymentAppliedBy already exists, skipping');
      } else {
        throw err;
      }
    }

    // Add paymentReference to orders
    try {
      await queryInterface.addColumn('orders', 'paymentReference', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'External payment reference (Venmo ID, cash receipt, check #, Stripe PI)'
      });
      console.log('Added orders.paymentReference');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log('orders.paymentReference already exists, skipping');
      } else {
        throw err;
      }
    }

    // Add bookedByAdminId to sessions
    try {
      await queryInterface.addColumn('sessions', 'bookedByAdminId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Admin user who booked this session on behalf of the client'
      });
      console.log('Added sessions.bookedByAdminId');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log('sessions.bookedByAdminId already exists, skipping');
      } else {
        throw err;
      }
    }

    console.log('Migration complete: Billing & sessions fields added');
  },

  async down(queryInterface, Sequelize) {
    console.log('Rollback: Removing billing & sessions fields...');

    try {
      await queryInterface.removeColumn('orders', 'paymentAppliedAt');
      console.log('Removed orders.paymentAppliedAt');
    } catch (err) {
      console.log('Could not remove orders.paymentAppliedAt:', err.message);
    }

    try {
      await queryInterface.removeColumn('orders', 'paymentAppliedBy');
      console.log('Removed orders.paymentAppliedBy');
    } catch (err) {
      console.log('Could not remove orders.paymentAppliedBy:', err.message);
    }

    try {
      await queryInterface.removeColumn('orders', 'paymentReference');
      console.log('Removed orders.paymentReference');
    } catch (err) {
      console.log('Could not remove orders.paymentReference:', err.message);
    }

    try {
      await queryInterface.removeColumn('sessions', 'bookedByAdminId');
      console.log('Removed sessions.bookedByAdminId');
    } catch (err) {
      console.log('Could not remove sessions.bookedByAdminId:', err.message);
    }

    console.log('Rollback complete');
  }
};
