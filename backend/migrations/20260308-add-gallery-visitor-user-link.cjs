'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // H-02 class guard (hostile review of the review, 2026-09-18).
    // `gallery_visitors` is created by 20260308-create-gallery-tables.cjs,
    // which sorts after this file — describeTable() below throws on a
    // from-empty database.
    if (!(await queryInterface.tableExists('gallery_visitors'))) {
      console.log('  [20260308-add-gallery-visitor-user-link] gallery_visitors absent — skipping (H-02 class guard)');
      return;
    }

    // Check if column already exists before adding
    const tableDesc = await queryInterface.describeTable('gallery_visitors');
    if (!tableDesc.user_id) {
      await queryInterface.addColumn('gallery_visitors', 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: '"Users"', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await queryInterface.addIndex('gallery_visitors', ['user_id'], {
        name: 'idx_gallery_visitors_user_id',
      });
    }
  },

  async down(queryInterface) {
    if (!(await queryInterface.tableExists('gallery_visitors'))) return;
    const columns = await queryInterface.describeTable('gallery_visitors');
    const indexes = await queryInterface.showIndex('gallery_visitors');
    if (indexes.some(index => index.name === 'idx_gallery_visitors_user_id')) {
      await queryInterface.removeIndex('gallery_visitors', 'idx_gallery_visitors_user_id');
    }
    if (columns.user_id) await queryInterface.removeColumn('gallery_visitors', 'user_id');
  },
};
