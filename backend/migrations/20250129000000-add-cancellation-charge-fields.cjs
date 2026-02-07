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
