'use strict';

/**
 * Create admin_account_audit_logs.
 * Append-only owner/admin forensics for account blocking, deactivation,
 * reactivation, force logout, and impersonation start.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    let exists = true;
    try {
      await queryInterface.describeTable('admin_account_audit_logs');
    } catch (err) {
      exists = false;
    }
    if (exists) return;

    await queryInterface.createTable('admin_account_audit_logs', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      actorUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      targetUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      action: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      reason: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      previousState: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      nextState: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('admin_account_audit_logs', ['actorUserId', 'createdAt']);
    await queryInterface.addIndex('admin_account_audit_logs', ['targetUserId', 'createdAt']);
    await queryInterface.addIndex('admin_account_audit_logs', ['action']);
  },

  down: async (queryInterface) => {
    let exists = true;
    try {
      await queryInterface.describeTable('admin_account_audit_logs');
    } catch (err) {
      exists = false;
    }
    if (exists) await queryInterface.dropTable('admin_account_audit_logs');
  },
};
