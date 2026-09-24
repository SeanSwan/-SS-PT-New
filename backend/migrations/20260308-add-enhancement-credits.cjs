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

    await queryInterface.addColumn('gallery_visitors', 'enhancement_credits', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('gallery_visitors', 'is_vip', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('gallery_visitors', 'free_enhancements_used', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: '{}',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('gallery_visitors', 'free_enhancements_used');
    await queryInterface.removeColumn('gallery_visitors', 'is_vip');
    await queryInterface.removeColumn('gallery_visitors', 'enhancement_credits');
  },
};
