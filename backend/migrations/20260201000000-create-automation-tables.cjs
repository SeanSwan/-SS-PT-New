/**
 * FILE: 20260201000000-create-automation-tables.cjs
 * SYSTEM: Automation & SMS Delivery
 *
 * PURPOSE:
 * Create automation_sequences and automation_logs to drive scheduled SMS/email flows
 * and provide an auditable log of outbound automation.
 *
 * ARCHITECTURE:
 * ```mermaid
 * graph TD
 *   A[Automation Routes] --> B[Automation Service]
 *   B --> C[(automation_sequences)]
 *   B --> D[(automation_logs)]
 *   B --> E[(Users)]
 *   B --> F[SMS Service]
 * ```
 *
 * DATABASE ERD:
 * ```
 * +---------------------+     +----------------------+     +------------------+
 * | automation_sequences| 1:N | automation_logs     | N:1 | Users            |
 * | id (PK)             |----<| sequenceId (FK)     |---->| id (PK)          |
 * | name (UNIQUE)       |     | userId (FK)         |     | email            |
 * | triggerEvent        |     | channel             |     | phone            |
 * | steps (JSONB)       |     | status              |     | notificationPrefs|
 * +---------------------+     +----------------------+     +------------------+
 * ```
 *
 * DATA FLOW:
 * 1. Admin defines automation sequence
 * 2. Service schedules log entries by dayOffset
 * 3. Worker sends SMS and updates log status
 *
 * ERROR STATES:
 * - Table exists: migration skips via IF NOT EXISTS
 * - FK missing: creation fails and logs error
 *
 * WHY create automation_logs?
 * - Provides audit trail for outbound SMS/email
 * - Enables admin visibility and retry workflows
 *
 * WHY store steps as JSONB?
 * - Flexible sequence definitions without schema churn
 * - Allows multi-step campaigns per trigger
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('automation_sequences', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      triggerEvent: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      steps: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('automation_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      sequenceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'automation_sequences',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      stepIndex: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      channel: {
        type: Sequelize.ENUM('sms', 'email', 'push'),
        allowNull: false,
        defaultValue: 'sms'
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      scheduledFor: {
        type: Sequelize.DATE,
        allowNull: false
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      templateName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      recipient: {
        type: Sequelize.STRING,
        allowNull: true
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      payloadJson: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('automation_logs', ['sequenceId'], {
      name: 'automation_logs_sequence_id_idx'
    });
    await queryInterface.addIndex('automation_logs', ['userId'], {
      name: 'automation_logs_user_id_idx'
    });
    await queryInterface.addIndex('automation_logs', ['status'], {
      name: 'automation_logs_status_idx'
    });
    await queryInterface.addIndex('automation_logs', ['scheduledFor'], {
      name: 'automation_logs_scheduled_for_idx'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('automation_logs');
    await queryInterface.dropTable('automation_sequences');
  }
};
