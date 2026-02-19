'use strict';

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Idempotent check
      const tables = await queryInterface.showAllTables();
      if (tables.includes('video_outbound_clicks')) {
        console.log('Table video_outbound_clicks already exists, skipping.');
        await transaction.rollback();
        return;
      }

      const usersTable = await resolveUsersTable(queryInterface);

      await queryInterface.createTable('video_outbound_clicks', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false,
        },
        video_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'video_catalog', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: usersTable, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        click_type: {
          type: Sequelize.ENUM('watch_on_youtube', 'subscribe', 'playlist', 'channel'),
          allowNull: false,
        },
        clicked_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        session_id: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // INDEX: (video_id, click_type, clicked_at DESC) for CTR reports
      await queryInterface.addIndex('video_outbound_clicks', [
        'video_id',
        'click_type',
        { attribute: 'clicked_at', order: 'DESC' },
      ], {
        name: 'idx_voc_video_type_clicked',
        transaction,
      });

      // INDEX: (clicked_at) for time-series aggregation
      await queryInterface.addIndex('video_outbound_clicks', ['clicked_at'], {
        name: 'idx_voc_clicked_at',
        transaction,
      });

      await transaction.commit();
      console.log('Created table video_outbound_clicks with indexes.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('video_outbound_clicks', 'idx_voc_video_type_clicked').catch(() => {});
    await queryInterface.removeIndex('video_outbound_clicks', 'idx_voc_clicked_at').catch(() => {});
    await queryInterface.dropTable('video_outbound_clicks');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_video_outbound_clicks_click_type";');
  },
};
