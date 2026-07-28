'use strict';

const TABLE_NAME = 'notifications';
const FIELD_NAMES = [
  'category',
  'priority',
  'status',
  'metadata',
  'actions',
  'groupKey',
  'idempotencyKey',
  'requiresAction',
  'actionStatus',
  'expiresAt',
  'deliveredAt',
  'openedAt',
  'clickedAt',
  'archivedAt',
];
const FIELD_DEFINITIONS = (Sequelize) => ({
  category: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'system' },
  priority: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'normal' },
  status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'unread' },
  metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
  actions: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
  groupKey: { type: Sequelize.STRING(120), allowNull: true },
  idempotencyKey: { type: Sequelize.STRING(160), allowNull: true },
  requiresAction: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  actionStatus: { type: Sequelize.STRING(30), allowNull: true },
  expiresAt: { type: Sequelize.DATE, allowNull: true },
  deliveredAt: { type: Sequelize.DATE, allowNull: true },
  openedAt: { type: Sequelize.DATE, allowNull: true },
  clickedAt: { type: Sequelize.DATE, allowNull: true },
  archivedAt: { type: Sequelize.DATE, allowNull: true },
});

async function describeNotificationsTable(queryInterface) {
  try {
    return await queryInterface.describeTable(TABLE_NAME);
  } catch (error) {
    return null;
  }
}

async function addColumnIfMissing(queryInterface, Sequelize, tableInfo, field) {
  if (tableInfo[field]) return;
  await queryInterface.addColumn(TABLE_NAME, field, FIELD_DEFINITIONS(Sequelize)[field]);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await describeNotificationsTable(queryInterface);
    if (!tableInfo) return;

    for (const field of FIELD_NAMES) {
      await addColumnIfMissing(queryInterface, Sequelize, tableInfo, field);
    }

    await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS "idx_notifications_category" ON "notifications" ("category");');
    await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS "idx_notifications_priority" ON "notifications" ("priority");');
    await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications" ("status");');
    await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS "idx_notifications_requires_action" ON "notifications" ("requiresAction");');
    await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS "idx_notifications_group_key" ON "notifications" ("groupKey");');
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS "idx_notifications_user_idempotency_key" ON "notifications" ("userId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;');
  },

  async down(queryInterface) {
    const tableInfo = await describeNotificationsTable(queryInterface);
    if (!tableInfo) return;

    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "idx_notifications_user_idempotency_key";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "idx_notifications_group_key";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "idx_notifications_requires_action";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "idx_notifications_status";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "idx_notifications_priority";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "idx_notifications_category";');

    for (const field of [...FIELD_NAMES].reverse()) {
      if (tableInfo[field]) {
        await queryInterface.removeColumn(TABLE_NAME, field);
      }
    }
  },
};
