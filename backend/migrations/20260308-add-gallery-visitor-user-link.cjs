'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
    await queryInterface.removeIndex('gallery_visitors', 'idx_gallery_visitors_user_id').catch(() => {});
    await queryInterface.removeColumn('gallery_visitors', 'user_id').catch(() => {});
  },
};
