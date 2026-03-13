'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Add mediumKey column
      await queryInterface.addColumn('gallery_photos', 'medium_key', {
        type: Sequelize.STRING(500),
        allowNull: true,
      }, { transaction });

      // Add mediumUrl column
      await queryInterface.addColumn('gallery_photos', 'medium_url', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      // Add thumbKey column (separate from existing thumbnail_key for clarity)
      await queryInterface.addColumn('gallery_photos', 'thumb_key', {
        type: Sequelize.STRING(500),
        allowNull: true,
      }, { transaction });

      await transaction.commit();
      console.log('✅ Added medium_key, medium_url, thumb_key columns to gallery_photos');
    } catch (error) {
      await transaction.rollback();
      // Columns may already exist
      if (error.message?.includes('already exists')) {
        console.log('⚠️ Columns already exist, skipping');
        return;
      }
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('gallery_photos', 'medium_key', { transaction });
      await queryInterface.removeColumn('gallery_photos', 'medium_url', { transaction });
      await queryInterface.removeColumn('gallery_photos', 'thumb_key', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
