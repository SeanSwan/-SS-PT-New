/**
 * Migration: create marketing_calendar_items.
 *
 * Purpose:
 * Stores real Marketing command-center calendar items so the admin calendar
 * no longer depends on frontend demo data. The personal-training calendar
 * remains separate; overlap awareness is computed read-only from sessions.
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('marketing_calendar_items', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: Sequelize.STRING(180),
      allowNull: false,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    channel: {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: 'social',
    },
    platform: {
      type: Sequelize.STRING(32),
      allowNull: true,
    },
    campaignName: {
      type: Sequelize.STRING(120),
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: 'draft',
    },
    scheduledAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    durationMinutes: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    timezone: {
      type: Sequelize.STRING(64),
      allowNull: false,
      defaultValue: 'America/Los_Angeles',
    },
    postizPostId: {
      type: Sequelize.STRING(128),
      allowNull: true,
    },
    platformAccountIds: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    platformVariants: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    assets: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    complianceSnapshot: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    advisoryContext: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    updatedBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    publishedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    failedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    failureReason: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  await queryInterface.addIndex('marketing_calendar_items', ['scheduledAt']);
  await queryInterface.addIndex('marketing_calendar_items', ['status']);
  await queryInterface.addIndex('marketing_calendar_items', ['channel']);
  await queryInterface.addIndex('marketing_calendar_items', ['platform']);
}

export async function down(queryInterface) {
  await queryInterface.dropTable('marketing_calendar_items');
}
