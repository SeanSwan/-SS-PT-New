'use strict';

/**
 * REPAIR Migration: Add Missing Columns
 * =====================================
 * This migration adds columns that are defined in models but missing from the database.
 * It's safe to run multiple times - it checks if columns exist before adding.
 *
 * Missing columns identified from Render logs:
 * - sessions: cancellationChargeType, cancellationChargeAmount, sessionCreditRestored, cancellationChargedAt
 * - client_trainer_assignments: deactivated_at
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔧 Starting repair migration for missing columns...');

      // ========================================
      // SESSIONS TABLE - Cancellation Charge Fields
      // ========================================
      const sessionInfo = await queryInterface.describeTable('sessions');

      if (!sessionInfo.cancellationChargeType) {
        await queryInterface.addColumn('sessions', 'cancellationChargeType', {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: null,
          comment: 'Type of cancellation charge: none, full, partial, late_fee'
        }, { transaction });
        console.log('✅ Added cancellationChargeType column to sessions');
      } else {
        console.log('⏭️ cancellationChargeType already exists');
      }

      if (!sessionInfo.cancellationChargeAmount) {
        await queryInterface.addColumn('sessions', 'cancellationChargeAmount', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: null,
          comment: 'Amount charged for cancellation (in dollars)'
        }, { transaction });
        console.log('✅ Added cancellationChargeAmount column to sessions');
      } else {
        console.log('⏭️ cancellationChargeAmount already exists');
      }

      if (!sessionInfo.sessionCreditRestored) {
        await queryInterface.addColumn('sessions', 'sessionCreditRestored', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Whether session credit was restored to client after cancellation'
        }, { transaction });
        console.log('✅ Added sessionCreditRestored column to sessions');
      } else {
        console.log('⏭️ sessionCreditRestored already exists');
      }

      if (!sessionInfo.cancellationChargedAt) {
        await queryInterface.addColumn('sessions', 'cancellationChargedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
          comment: 'Timestamp when cancellation charge was processed'
        }, { transaction });
        console.log('✅ Added cancellationChargedAt column to sessions');
      } else {
        console.log('⏭️ cancellationChargedAt already exists');
      }

      // Cancellation Decision Fields (from 20260205000001 migration)
      if (!sessionInfo.cancellationDecision) {
        await queryInterface.addColumn('sessions', 'cancellationDecision', {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: null,
          comment: 'Admin decision: pending, charged, waived, or null'
        }, { transaction });
        console.log('✅ Added cancellationDecision column to sessions');
      } else {
        console.log('⏭️ cancellationDecision already exists');
      }

      if (!sessionInfo.cancellationReviewedBy) {
        await queryInterface.addColumn('sessions', 'cancellationReviewedBy', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Admin user ID who made charge/waive decision'
        }, { transaction });
        console.log('✅ Added cancellationReviewedBy column to sessions');
      } else {
        console.log('⏭️ cancellationReviewedBy already exists');
      }

      if (!sessionInfo.cancellationReviewedAt) {
        await queryInterface.addColumn('sessions', 'cancellationReviewedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when admin made charge/waive decision'
        }, { transaction });
        console.log('✅ Added cancellationReviewedAt column to sessions');
      } else {
        console.log('⏭️ cancellationReviewedAt already exists');
      }

      if (!sessionInfo.cancellationReviewReason) {
        await queryInterface.addColumn('sessions', 'cancellationReviewReason', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Admin justification for charge/waive decision'
        }, { transaction });
        console.log('✅ Added cancellationReviewReason column to sessions');
      } else {
        console.log('⏭️ cancellationReviewReason already exists');
      }

      // ========================================
      // CLIENT_TRAINER_ASSIGNMENTS TABLE
      // ========================================
      const tables = await queryInterface.showAllTables();

      if (tables.includes('client_trainer_assignments')) {
        const assignmentInfo = await queryInterface.describeTable('client_trainer_assignments');

        if (!assignmentInfo.deactivated_at) {
          await queryInterface.addColumn('client_trainer_assignments', 'deactivated_at', {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Timestamp when assignment was deactivated'
          }, { transaction });
          console.log('✅ Added deactivated_at column to client_trainer_assignments');
        } else {
          console.log('⏭️ deactivated_at already exists in client_trainer_assignments');
        }

        if (!assignmentInfo.last_modified_by) {
          await queryInterface.addColumn('client_trainer_assignments', 'last_modified_by', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'ID of the last admin to modify this assignment'
          }, { transaction });
          console.log('✅ Added last_modified_by column to client_trainer_assignments');
        } else {
          console.log('⏭️ last_modified_by already exists in client_trainer_assignments');
        }
      } else {
        console.log('⚠️ client_trainer_assignments table does not exist');
      }

      await transaction.commit();
      console.log('✅ Repair migration completed successfully!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Repair migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // This is a repair migration - down is intentionally minimal
    // to avoid accidentally removing columns that should exist
    console.log('⚠️ Down migration for repair is a no-op to prevent data loss');
  }
};
