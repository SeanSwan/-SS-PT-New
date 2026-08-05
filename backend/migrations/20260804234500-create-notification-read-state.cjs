'use strict';

/**
 * SWA-138 S4 — per-admin alert read-state (HY3 A4, panel-accepted).
 *
 * Read/archive state is PER-ADMIN (side table), while resolution stays GLOBAL
 * on each source row (PostReport.status, AdminNotification.actionTaken…).
 * Fixes the two-admin collision class: A acking an alert must not hide it
 * from B; A resolving must hide it for everyone.
 *
 * FK references "Users" (PascalCase) — the canonical user table; the lowercase
 * `users` twin must never be referenced (CLAUDE.md gotcha).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const exists = await queryInterface
      .describeTable('notification_read_state')
      .then(() => true)
      .catch(() => false);
    if (exists) return;

    await queryInterface.createTable('notification_read_state', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      refType: { type: Sequelize.STRING(40), allowNull: false },
      refId: { type: Sequelize.STRING(160), allowNull: false },
      readAt: { type: Sequelize.DATE, allowNull: true },
      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('notification_read_state', {
      fields: ['adminId', 'refType', 'refId'],
      unique: true,
      name: 'notification_read_state_admin_ref_uq',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_read_state').catch(() => {});
  },
};
