'use strict';

/**
 * Migration: Create video_collection_items table
 * ===============================================
 *
 * M:N join table linking video_collections to video_catalog
 * with explicit sort ordering.
 *
 * Columns:
 *   id             UUID PK (gen_random_uuid)
 *   collectionId   UUID FK → video_collections CASCADE
 *   videoId        UUID FK → video_catalog CASCADE
 *   sortOrder      INTEGER DEFAULT 0
 *   addedAt        TIMESTAMP DEFAULT NOW()
 *
 * Constraints:
 *   UNIQUE(collectionId, videoId)
 *
 * No soft-delete — rows are hard-deleted when removed from a collection.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Idempotent guard
      const [tables] = await queryInterface.sequelize.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'video_collection_items'`,
        { transaction }
      );
      if (tables.length > 0) {
        await transaction.commit();
        console.log('video_collection_items table already exists — skipping.');
        return;
      }

      await queryInterface.createTable('video_collection_items', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false,
        },
        collectionId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'video_collections', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        videoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'video_catalog', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        addedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      // Unique constraint: a video can appear in a collection only once
      await queryInterface.addIndex('video_collection_items', ['collectionId', 'videoId'], {
        unique: true,
        name: 'idx_vci_collection_video_unique',
        transaction,
      });

      // Sort-order lookup index
      await queryInterface.addIndex('video_collection_items', ['collectionId', 'sortOrder'], {
        name: 'idx_vci_collection_sort',
        transaction,
      });

      await transaction.commit();
      console.log('video_collection_items table created successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('video_collection_items');
  },
};
