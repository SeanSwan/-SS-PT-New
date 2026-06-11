'use strict';

/**
 * Create ai_command_audit_logs — append-only audit trail for the Swan Coach
 * command lane (Slice F1, 2026-06-10).
 *
 * Every command execution (success, failure, denial, confirmation, kill-switch
 * block) lands here. The table is append-only: the model layer throws on
 * update/destroy, and rows carry a creation timestamp only.
 *
 * FK references "Users" (PascalCase) — production has a stale lowercase
 * `users` duplicate that must NOT be targeted (CLAUDE.md gotcha).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    let exists = true;
    try {
      await queryInterface.describeTable('ai_command_audit_logs');
    } catch (err) {
      exists = false;
    }
    if (exists) return;

    await queryInterface.createTable('ai_command_audit_logs', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      userRole: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      commandType: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      targetClientId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      destructive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      requiresConfirmation: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      confirmationState: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'none',
      },
      operationId: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      outcome: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      errorCode: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      paramsHash: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      paramsRedacted: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      durationMs: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('ai_command_audit_logs', ['userId', 'createdAt']);
    await queryInterface.addIndex('ai_command_audit_logs', ['commandType']);
    await queryInterface.addIndex('ai_command_audit_logs', ['outcome']);
    await queryInterface.addIndex('ai_command_audit_logs', ['targetClientId']);
  },

  down: async (queryInterface) => {
    let exists = true;
    try {
      await queryInterface.describeTable('ai_command_audit_logs');
    } catch (err) {
      exists = false;
    }
    if (exists) {
      await queryInterface.dropTable('ai_command_audit_logs');
    }
  },
};
