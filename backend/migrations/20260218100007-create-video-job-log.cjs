'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Idempotent check
      const tables = await queryInterface.showAllTables();
      if (tables.includes('video_job_log')) {
        console.log('Table video_job_log already exists, skipping.');
        await transaction.rollback();
        return;
      }

      await queryInterface.createTable('video_job_log', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false,
        },
        job_type: {
          type: Sequelize.ENUM('youtube_import', 'youtube_sync', 'analytics_rollup', 'backfill', 'checksum_verify', 'draft_cleanup'),
          allowNull: false,
        },
        job_id: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'BullMQ job ID',
        },
        status: {
          type: Sequelize.ENUM('queued', 'processing', 'completed', 'failed'),
          allowNull: false,
          defaultValue: 'queued',
        },
        payload: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        result: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        attempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // INDEX: (job_type, status) for filtering jobs by type and state
      await queryInterface.addIndex('video_job_log', ['job_type', 'status'], {
        name: 'idx_vjl_type_status',
        transaction,
      });

      // INDEX: (created_at DESC) for chronological listing
      await queryInterface.addIndex('video_job_log', [
        { attribute: 'created_at', order: 'DESC' },
      ], {
        name: 'idx_vjl_created_at_desc',
        transaction,
      });

      await transaction.commit();
      console.log('Created table video_job_log with indexes.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('video_job_log', 'idx_vjl_type_status').catch(() => {});
    await queryInterface.removeIndex('video_job_log', 'idx_vjl_created_at_desc').catch(() => {});
    await queryInterface.dropTable('video_job_log');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_video_job_log_job_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_video_job_log_status";');
  },
};
