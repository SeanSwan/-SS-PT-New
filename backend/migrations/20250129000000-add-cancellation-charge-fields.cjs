'use strict';

/**
 * Migration: Add Cancellation Charge Fields
 * ==========================================
 * Adds MindBody-style cancellation charge support to sessions table
 * - cancellationChargeType: none, full, partial, late_fee
 * - cancellationChargeAmount: decimal amount charged
 * - sessionCreditRestored: whether the session credit was restored to client
 * - cancellationChargedAt: timestamp when charge was processed
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // H-02 class guard (hostile review of the review, 2026-09-18).
    //
    // This migration runs at 20250129000000, but `sessions` is not created
    // until 20250305000000-create-sessions.cjs:304 — 39 days LATER in chain
    // order. queryInterface.describeTable() below throws
    // `relation "sessions" does not exist` on any database built from empty,
    // so the chain dies here immediately after H-01's fix removes the earlier
    // wall. Same defect class as H-01/H-02; the ledger filed H-02 once and
    // dismissed it as "covered by H-01's guard", which it is not.
    if (!(await queryInterface.tableExists('sessions'))) {
      console.log('  [20250129000000] sessions table absent — skipping (H-02 class guard)');
      return;
    }

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if columns already exist
      const tableInfo = await queryInterface.describeTable('sessions');

      // Add cancellationChargeType column
      if (!tableInfo.cancellationChargeType) {
        await queryInterface.addColumn('sessions', 'cancellationChargeType', {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: null,
          comment: 'Type of cancellation charge: none, full, partial, late_fee'
        }, { transaction });
        console.log('Added cancellationChargeType column');
      }

      // Add cancellationChargeAmount column
      if (!tableInfo.cancellationChargeAmount) {
        await queryInterface.addColumn('sessions', 'cancellationChargeAmount', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: null,
          comment: 'Amount charged for cancellation (in dollars)'
        }, { transaction });
        console.log('Added cancellationChargeAmount column');
      }

      // Add sessionCreditRestored column
      if (!tableInfo.sessionCreditRestored) {
        await queryInterface.addColumn('sessions', 'sessionCreditRestored', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether session credit was restored to client after cancellation'
        }, { transaction });
        console.log('Added sessionCreditRestored column');
      }

      // Add cancellationChargedAt column
      if (!tableInfo.cancellationChargedAt) {
        await queryInterface.addColumn('sessions', 'cancellationChargedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
          comment: 'Timestamp when cancellation charge was processed'
        }, { transaction });
        console.log('Added cancellationChargedAt column');
      }

      await transaction.commit();
      console.log('Migration completed: Added cancellation charge fields to sessions table');

    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await queryInterface.tableExists('sessions'))) return;
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('sessions');

      if (tableInfo.cancellationChargeType) {
        await queryInterface.removeColumn('sessions', 'cancellationChargeType', { transaction });
      }

      if (tableInfo.cancellationChargeAmount) {
        await queryInterface.removeColumn('sessions', 'cancellationChargeAmount', { transaction });
      }

      if (tableInfo.sessionCreditRestored) {
        await queryInterface.removeColumn('sessions', 'sessionCreditRestored', { transaction });
      }

      if (tableInfo.cancellationChargedAt) {
        await queryInterface.removeColumn('sessions', 'cancellationChargedAt', { transaction });
      }

      await transaction.commit();
      console.log('Rollback completed: Removed cancellation charge fields from sessions table');

    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error.message);
      throw error;
    }
  }
};
