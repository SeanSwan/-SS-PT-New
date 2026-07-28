'use strict';

const TABLE_NAME = 'notification_deliveries';

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
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        notificationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'notifications', key: 'id' },
          onDelete: 'CASCADE',
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onDelete: 'CASCADE',
        },
        channel: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'in_app',
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'pending',
        },
        attemptCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        lastAttemptAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        providerMessageId: {
          type: Sequelize.STRING(160),
          allowNull: true,
        },
        errorCode: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        errorMessage: {
          type: Sequelize.TEXT,
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
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      });
    }

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_notification_deliveries_notification"
      ON "notification_deliveries" ("notificationId");
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_notification_deliveries_user"
      ON "notification_deliveries" ("userId");
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_notification_deliveries_status"
      ON "notification_deliveries" ("status");
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_notification_deliveries_unique_channel"
      ON "notification_deliveries" ("notificationId", "userId", "channel");
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(TABLE_NAME, 'idx_notification_deliveries_unique_channel').catch(() => {});
    await queryInterface.removeIndex(TABLE_NAME, 'idx_notification_deliveries_status').catch(() => {});
    await queryInterface.removeIndex(TABLE_NAME, 'idx_notification_deliveries_user').catch(() => {});
    await queryInterface.removeIndex(TABLE_NAME, 'idx_notification_deliveries_notification').catch(() => {});
    await queryInterface.dropTable(TABLE_NAME).catch(() => {});
  },
};