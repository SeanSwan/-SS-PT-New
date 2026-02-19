'use strict';

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Idempotent check
      const tables = await queryInterface.showAllTables();
      if (tables.includes('user_watch_history')) {
        console.log('Table user_watch_history already exists, skipping.');
        await transaction.rollback();
        return;
      }

      const usersTable = await resolveUsersTable(queryInterface);

      await queryInterface.createTable('user_watch_history', {
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
          allowNull: false,
          references: { model: 'video_catalog', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        progress_seconds: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        completion_pct: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        completed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        last_watched_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

      // UNIQUE(user_id, video_id) for upsert on re-watch
      await queryInterface.addIndex('user_watch_history', ['user_id', 'video_id'], {
        unique: true,
        name: 'idx_uwh_user_video_unique',
        transaction,
      });

      // INDEX: (user_id, last_watched_at DESC) for "continue watching"
      await queryInterface.addIndex('user_watch_history', [
        'user_id',
        { attribute: 'last_watched_at', order: 'DESC' },
      ], {
        name: 'idx_uwh_user_last_watched',
        transaction,
      });

      // INDEX: (video_id, completed) for completion analytics
      await queryInterface.addIndex('user_watch_history', ['video_id', 'completed'], {
        name: 'idx_uwh_video_completed',
        transaction,
      });

      await transaction.commit();
      console.log('Created table user_watch_history with indexes.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('user_watch_history', 'idx_uwh_user_video_unique').catch(() => {});
    await queryInterface.removeIndex('user_watch_history', 'idx_uwh_user_last_watched').catch(() => {});
    await queryInterface.removeIndex('user_watch_history', 'idx_uwh_video_completed').catch(() => {});
    await queryInterface.dropTable('user_watch_history');
  },
};
