'use strict';

/**
 * Slice 3a — un-watermarked print-master pipeline.
 *
 * Adds `original_storage_key` to `gallery_photos`: the private R2 key of the
 * un-watermarked ORIGINAL kept for paid-print fulfillment. Nullable + additive
 * (new-galleries-only: existing rows stay NULL, no back-fill). Runs at Render
 * build time before the new server boots, so the raw INSERT in
 * adminGalleryRoutes never references a not-yet-migrated column.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('gallery_photos', 'original_storage_key', {
        type: Sequelize.STRING(500),
        allowNull: true,
      }, { transaction });

      await transaction.commit();
      console.log('✅ Added original_storage_key column to gallery_photos');
    } catch (error) {
      await transaction.rollback();
      // Idempotent: column may already exist on a re-run.
      if (error.message?.includes('already exists')) {
        console.log('⚠️ original_storage_key already exists, skipping');
        return;
      }
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('gallery_photos', 'original_storage_key', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
