'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // H-02 class guard (hostile review of the review, 2026-09-18).
    // `gallery_visitors` is not created until 20260308-create-gallery-tables.cjs,
    // which sorts AFTER this file. Unguarded addColumn() here killed any
    // from-empty bootstrap.
    if (!(await queryInterface.tableExists('gallery_visitors'))) {
      console.log('  [20260308-add-enhancement-credits] gallery_visitors absent — skipping (H-02 class guard)');
      return;
    }

    // Per-column idempotency: the from-empty path now receives these columns
    // from the create-table migration itself, so this migration must no-op
    // cleanly wherever they already exist (Meta-loss re-run, post-fold
    // databases). Matches the per-column pattern in
    // 20250129000000-add-cancellation-charge-fields.cjs.
    const tableDesc = await queryInterface.describeTable('gallery_visitors');
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (!tableDesc.enhancement_credits) {
        await queryInterface.addColumn('gallery_visitors', 'enhancement_credits', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        }, { transaction });
      }

      if (!tableDesc.is_vip) {
        await queryInterface.addColumn('gallery_visitors', 'is_vip', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        }, { transaction });
      }

      if (!tableDesc.free_enhancements_used) {
        await queryInterface.addColumn('gallery_visitors', 'free_enhancements_used', {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: '{}',
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Absent-table guard + per-column checks: undo on a database where the
    // table or any column never existed must skip, not throw (G9 hostile
    // review, 2026-09-25).
    if (!(await queryInterface.tableExists('gallery_visitors'))) {
      console.log('  [20260308-add-enhancement-credits] gallery_visitors absent — nothing to roll back');
      return;
    }

    const tableDesc = await queryInterface.describeTable('gallery_visitors');
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (tableDesc.free_enhancements_used) {
        await queryInterface.removeColumn('gallery_visitors', 'free_enhancements_used', { transaction });
      }
      if (tableDesc.is_vip) {
        await queryInterface.removeColumn('gallery_visitors', 'is_vip', { transaction });
      }
      if (tableDesc.enhancement_credits) {
        await queryInterface.removeColumn('gallery_visitors', 'enhancement_credits', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
