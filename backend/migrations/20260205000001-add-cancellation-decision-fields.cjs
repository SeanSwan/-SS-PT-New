'use strict';

/**
 * Migration: Add Cancellation Decision Fields
 * ============================================
 * MindBody Parity: Admin Charge/Waive Decision Tracking
 *
 * Adds fields for tracking admin cancellation decisions:
 * - cancellationDecision: ENUM (pending, charged, waived)
 * - cancellationReviewedBy: FK to user who made decision
 * - cancellationReviewedAt: TIMESTAMP when decision was made
 * - cancellationReviewReason: TEXT justification for decision
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if columns already exist
      const tableInfo = await queryInterface.describeTable('sessions');

      // Add cancellationDecision column
      if (!tableInfo.cancellationDecision) {
        await queryInterface.addColumn('sessions', 'cancellationDecision', {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: null,
          comment: 'Admin decision: pending, charged, waived, or null (not cancelled)'
        }, { transaction });
        console.log('✅ Added cancellationDecision column');
      } else {
        console.log('⏭️ cancellationDecision column already exists');
      }

      // Add cancellationReviewedBy column (FK to users)
      if (!tableInfo.cancellationReviewedBy) {
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
        console.log('✅ Added cancellationReviewedBy column');
      } else {
        console.log('⏭️ cancellationReviewedBy column already exists');
      }

      // Add cancellationReviewedAt column
      if (!tableInfo.cancellationReviewedAt) {
        await queryInterface.addColumn('sessions', 'cancellationReviewedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when admin made charge/waive decision'
        }, { transaction });
        console.log('✅ Added cancellationReviewedAt column');
      } else {
        console.log('⏭️ cancellationReviewedAt column already exists');
      }

      // Add cancellationReviewReason column
      if (!tableInfo.cancellationReviewReason) {
        await queryInterface.addColumn('sessions', 'cancellationReviewReason', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Admin justification for charge/waive decision'
        }, { transaction });
        console.log('✅ Added cancellationReviewReason column');
      } else {
        console.log('⏭️ cancellationReviewReason column already exists');
      }

      // Add index for decision status queries
      try {
        await queryInterface.addIndex('sessions', ['cancellationDecision'], {
          name: 'sessions_cancellation_decision_idx',
          transaction
        });
        console.log('✅ Added cancellation decision index');
      } catch (indexError) {
        if (indexError.message.includes('already exists')) {
          console.log('⏭️ Cancellation decision index already exists');
        } else {
          throw indexError;
        }
      }

      // Check if cancellationChargedAt column exists before using it
      const hasChargedAtColumn = tableInfo.cancellationChargedAt !== undefined;

      if (hasChargedAtColumn) {
        // Update existing cancelled sessions to have 'pending' decision if they have charges pending
        await queryInterface.sequelize.query(`
          UPDATE sessions
          SET "cancellationDecision" = 'pending'
          WHERE status = 'cancelled'
          AND "cancellationDecision" IS NULL
          AND "cancellationChargedAt" IS NULL
        `, { transaction });
        console.log('✅ Updated existing cancelled sessions with pending decision');

        // Update existing cancelled sessions that were already charged
        await queryInterface.sequelize.query(`
          UPDATE sessions
          SET "cancellationDecision" = CASE
            WHEN "cancellationChargeType" = 'none' THEN 'waived'
            ELSE 'charged'
          END
          WHERE status = 'cancelled'
          AND "cancellationDecision" IS NULL
          AND "cancellationChargedAt" IS NOT NULL
        `, { transaction });
        console.log('✅ Updated existing charged/waived sessions');
      } else {
        // If cancellationChargedAt doesn't exist, just set all cancelled sessions to 'pending'
        await queryInterface.sequelize.query(`
          UPDATE sessions
          SET "cancellationDecision" = 'pending'
          WHERE status = 'cancelled'
          AND "cancellationDecision" IS NULL
        `, { transaction });
        console.log('✅ Updated existing cancelled sessions with pending decision (no charge columns yet)');
      }

      await transaction.commit();
      console.log('✅ Migration completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove index
      try {
        await queryInterface.removeIndex('sessions', 'sessions_cancellation_decision_idx', { transaction });
      } catch (e) {
        // Index might not exist
      }

      // Remove columns in reverse order
      const columnsToRemove = [
        'cancellationReviewReason',
        'cancellationReviewedAt',
        'cancellationReviewedBy',
        'cancellationDecision'
      ];

      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn('sessions', column, { transaction });
          console.log(`✅ Removed ${column} column`);
        } catch (e) {
          console.log(`⏭️ ${column} column doesn't exist or couldn't be removed`);
        }
      }

      await transaction.commit();
      console.log('✅ Rollback completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
