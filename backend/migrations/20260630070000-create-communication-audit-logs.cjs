'use strict';

const TABLE_NAME = 'communication_audit_logs';

async function tableExists(queryInterface) {
  try {
    await queryInterface.describeTable(TABLE_NAME);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface))) {
      await queryInterface.createTable(TABLE_NAME, {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        eventId: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        actorId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onDelete: 'SET NULL',
        },
        recipientId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onDelete: 'SET NULL',
        },
        notificationId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'notifications', key: 'id' },
          onDelete: 'SET NULL',
        },
        action: {
          type: Sequelize.STRING(80),
          allowNull: false,
        },
        entityType: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        entityId: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      });
    }

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_communication_audit_logs_action"
      ON "communication_audit_logs" ("action", "createdAt");
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_communication_audit_logs_actor"
      ON "communication_audit_logs" ("actorId", "createdAt");
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_communication_audit_logs_recipient"
      ON "communication_audit_logs" ("recipientId", "createdAt");
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_communication_audit_logs_notification"
      ON "communication_audit_logs" ("notificationId");
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_communication_audit_logs_event"
      ON "communication_audit_logs" ("eventId");
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(TABLE_NAME, 'idx_communication_audit_logs_event').catch(() => {});
    await queryInterface.removeIndex(TABLE_NAME, 'idx_communication_audit_logs_notification').catch(() => {});
    await queryInterface.removeIndex(TABLE_NAME, 'idx_communication_audit_logs_recipient').catch(() => {});
    await queryInterface.removeIndex(TABLE_NAME, 'idx_communication_audit_logs_actor').catch(() => {});
    await queryInterface.removeIndex(TABLE_NAME, 'idx_communication_audit_logs_action').catch(() => {});
    await queryInterface.dropTable(TABLE_NAME).catch(() => {});
  },
};