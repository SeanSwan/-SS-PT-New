/**
 * MIGRATION: Native Social Publishing
 * ===================================
 * Creates SwanStudios-owned account, job, and attempt tables so Marketing
 * publishing no longer depends on a paid third-party scheduler.
 */

const ACCOUNT_TABLE = 'social_publishing_accounts';
const JOB_TABLE = 'social_publishing_jobs';
const ATTEMPT_TABLE = 'social_publishing_attempts';

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(ACCOUNT_TABLE, {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false,
    },
    provider: { type: Sequelize.STRING(32), allowNull: false },
    providerAccountId: { type: Sequelize.STRING(160), allowNull: true },
    handle: { type: Sequelize.STRING(160), allowNull: true },
    displayName: { type: Sequelize.STRING(160), allowNull: false },
    profileUrl: { type: Sequelize.STRING(500), allowNull: true },
    status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'connected' },
    capabilities: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
    credentialCipher: { type: Sequelize.BLOB, allowNull: false },
    credentialIv: { type: Sequelize.BLOB, allowNull: false },
    credentialTag: { type: Sequelize.BLOB, allowNull: false },
    credentialKeyId: { type: Sequelize.STRING(32), allowNull: false },
    tokenExpiresAt: { type: Sequelize.DATE, allowNull: true },
    lastHealthCheckAt: { type: Sequelize.DATE, allowNull: true },
    lastError: { type: Sequelize.TEXT, allowNull: true },
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
    createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    deletedAt: { type: Sequelize.DATE, allowNull: true },
  });

  await queryInterface.addIndex(ACCOUNT_TABLE, ['provider']);
  await queryInterface.addIndex(ACCOUNT_TABLE, ['status']);
  await queryInterface.addIndex(ACCOUNT_TABLE, ['provider', 'providerAccountId']);

  await queryInterface.createTable(JOB_TABLE, {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false,
    },
    content: { type: Sequelize.TEXT, allowNull: false },
    status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'scheduled' },
    scheduledAt: { type: Sequelize.DATE, allowNull: false },
    platformAccountIds: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
    media: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
    complianceSnapshot: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
    platformResults: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
    source: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'dashboard' },
    createdBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    publishedAt: { type: Sequelize.DATE, allowNull: true },
    failedAt: { type: Sequelize.DATE, allowNull: true },
    failureReason: { type: Sequelize.TEXT, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    deletedAt: { type: Sequelize.DATE, allowNull: true },
  });

  await queryInterface.addIndex(JOB_TABLE, ['status', 'scheduledAt']);
  await queryInterface.addIndex(JOB_TABLE, ['createdBy']);

  await queryInterface.createTable(ATTEMPT_TABLE, {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false,
    },
    jobId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: JOB_TABLE, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    accountId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: ACCOUNT_TABLE, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    provider: { type: Sequelize.STRING(32), allowNull: false },
    status: { type: Sequelize.STRING(32), allowNull: false },
    providerPostId: { type: Sequelize.STRING(300), allowNull: true },
    response: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
    error: { type: Sequelize.TEXT, allowNull: true },
    attemptedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  });

  await queryInterface.addIndex(ATTEMPT_TABLE, ['jobId']);
  await queryInterface.addIndex(ATTEMPT_TABLE, ['accountId']);
  await queryInterface.addIndex(ATTEMPT_TABLE, ['provider', 'status']);
}

export async function down(queryInterface) {
  await queryInterface.dropTable(ATTEMPT_TABLE);
  await queryInterface.dropTable(JOB_TABLE);
  await queryInterface.dropTable(ACCOUNT_TABLE);
}
