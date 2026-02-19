'use strict';

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Idempotent check
      const tables = await queryInterface.showAllTables();
      if (tables.includes('video_access_grants')) {
        console.log('Table video_access_grants already exists, skipping.');
        await transaction.rollback();
        return;
      }

      const usersTable = await resolveUsersTable(queryInterface);

      await queryInterface.createTable('video_access_grants', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: usersTable, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        video_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'video_catalog', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        collection_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'video_collections', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        grant_type: {
          type: Sequelize.ENUM('role_based', 'individual', 'purchase'),
          allowNull: false,
          defaultValue: 'individual',
        },
        grant_status: {
          type: Sequelize.ENUM('active', 'expired', 'revoked'),
          allowNull: false,
          defaultValue: 'active',
        },
        granted_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: usersTable, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        revoked_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // XOR CHECK: exactly one of video_id or collection_id must be non-NULL
      await queryInterface.sequelize.query(`
        ALTER TABLE video_access_grants
        ADD CONSTRAINT chk_vag_xor_target
        CHECK (
          (video_id IS NOT NULL AND collection_id IS NULL)
          OR
          (video_id IS NULL AND collection_id IS NOT NULL)
        );
      `, { transaction });

      // Partial unique index: one active grant per user+video
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX idx_vag_active_user_video
        ON video_access_grants (user_id, video_id)
        WHERE video_id IS NOT NULL AND grant_status = 'active';
      `, { transaction });

      // Partial unique index: one active grant per user+collection
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX idx_vag_active_user_collection
        ON video_access_grants (user_id, collection_id)
        WHERE collection_id IS NOT NULL AND grant_status = 'active';
      `, { transaction });

      // INDEX: expires_at for expiry cleanup (active grants with expiry only)
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_vag_expires_at_active
        ON video_access_grants (expires_at)
        WHERE expires_at IS NOT NULL AND grant_status = 'active';
      `, { transaction });

      // INDEX: grant_status for filtering active grants in entitlement checks
      await queryInterface.addIndex('video_access_grants', ['grant_status'], {
        name: 'idx_vag_grant_status',
        transaction,
      });

      await transaction.commit();
      console.log('Created table video_access_grants with CHECK constraint and partial indexes.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    // Drop partial indexes created via raw SQL
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_vag_active_user_video;').catch(() => {});
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_vag_active_user_collection;').catch(() => {});
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_vag_expires_at_active;').catch(() => {});
    await queryInterface.removeIndex('video_access_grants', 'idx_vag_grant_status').catch(() => {});
    await queryInterface.dropTable('video_access_grants');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_video_access_grants_grant_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_video_access_grants_grant_status";');
  },
};
