'use strict';

/**
 * Adds universal nutrition provenance and reconciliation fields without
 * rewriting legacy daily_macro_logs rows. Existing rows remain nullable and
 * can be rendered honestly as "logged before provenance".
 */

const SOURCE_TABLE = 'nutrition_source_records';
const MACRO_TABLE = 'daily_macro_logs';
const USER_TABLE = 'Users';
const MACRO_COLUMN_NAMES = [
  'sourceRecordId',
  'loggedByUserId',
  'contractVersion',
  'draftId',
  'workoutProximity',
  'servingBasis',
  'servingQuantity',
  'servingUnit',
  'caloriesReported',
  'caloriesCalculated',
  'reconciliationStatus',
  'confidenceScore',
  'reviewStatus',
  'reviewReason',
  'reviewedByUserId',
  'reviewedAt',
];

const tableName = (value) => {
  if (typeof value === 'string') return value;
  return value?.tableName || value?.table_name || '';
};

const sourceColumns = (Sequelize) => ({
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: USER_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  loggedByUserId: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: USER_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  draftId: { type: Sequelize.STRING(100), allowNull: false },
  contractVersion: { type: Sequelize.STRING(16), allowNull: false, defaultValue: '1.0' },
  source: { type: Sequelize.STRING(30), allowNull: false },
  sourceLabel: { type: Sequelize.STRING(120), allowNull: true },
  sourceConfidence: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'community' },
  confidenceScore: { type: Sequelize.FLOAT, allowNull: true },
  workoutProximity: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'none' },
  rawPayloadRef: { type: Sequelize.JSONB, allowNull: true },
  payloadDigest: { type: Sequelize.STRING(64), allowNull: true },
  status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'processing' },
  entryCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
  createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
  updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
});

const macroColumns = (Sequelize) => ({
  sourceRecordId: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: SOURCE_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  loggedByUserId: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: USER_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  contractVersion: { type: Sequelize.STRING(16), allowNull: true },
  draftId: { type: Sequelize.STRING(100), allowNull: true },
  workoutProximity: { type: Sequelize.STRING(20), allowNull: true },
  servingBasis: { type: Sequelize.STRING(20), allowNull: true },
  servingQuantity: { type: Sequelize.FLOAT, allowNull: true },
  servingUnit: { type: Sequelize.STRING(30), allowNull: true },
  caloriesReported: { type: Sequelize.FLOAT, allowNull: true },
  caloriesCalculated: { type: Sequelize.FLOAT, allowNull: true },
  reconciliationStatus: { type: Sequelize.STRING(30), allowNull: true },
  confidenceScore: { type: Sequelize.FLOAT, allowNull: true },
  reviewStatus: { type: Sequelize.STRING(30), allowNull: true },
  reviewReason: { type: Sequelize.STRING(80), allowNull: true },
  reviewedByUserId: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: USER_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  reviewedAt: { type: Sequelize.DATE, allowNull: true },
});

const ensureIndex = async (queryInterface, table, fields, name, transaction, unique = false) => {
  const indexes = await queryInterface.showIndex(table, { transaction });
  const existing = indexes.find((index) => index.name === name);
  if (existing?.unique === unique) return;
  if (existing) await queryInterface.removeIndex(table, existing.name, { transaction });
  await queryInterface.addIndex(table, fields, { name, unique, transaction });
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });
      const names = new Set(tables.map(tableName));

      if (!names.has(SOURCE_TABLE)) {
        await queryInterface.createTable('nutrition_source_records', sourceColumns(Sequelize), { transaction });
      }
      if (!names.has(MACRO_TABLE)) {
        throw new Error('daily_macro_logs must exist before nutrition provenance migration');
      }

      const existingMacroColumns = await queryInterface.describeTable(MACRO_TABLE, { transaction });
      for (const [name, definition] of Object.entries(macroColumns(Sequelize))) {
        if (!existingMacroColumns[name]) {
          await queryInterface.addColumn(MACRO_TABLE, name, definition, { transaction });
        }
      }

      await ensureIndex(
        queryInterface,
        SOURCE_TABLE,
        ['userId', 'draftId'],
        'nutrition_source_records_user_draft_unique',
        transaction,
        true,
      );
      await ensureIndex(
        queryInterface,
        SOURCE_TABLE,
        ['userId', 'createdAt'],
        'nutrition_source_records_user_created_at',
        transaction,
      );
      await ensureIndex(
        queryInterface,
        MACRO_TABLE,
        ['sourceRecordId'],
        'daily_macro_logs_source_record',
        transaction,
      );
      await ensureIndex(
        queryInterface,
        MACRO_TABLE,
        ['userId', 'reviewStatus', 'date'],
        'daily_macro_logs_review_queue',
        transaction,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });
      const names = new Set(tables.map(tableName));

      if (names.has(MACRO_TABLE)) {
        const columns = await queryInterface.describeTable(MACRO_TABLE, { transaction });
        const indexes = await queryInterface.showIndex(MACRO_TABLE, { transaction });
        for (const name of ['daily_macro_logs_review_queue', 'daily_macro_logs_source_record']) {
          if (indexes.some((index) => index.name === name)) {
            await queryInterface.removeIndex(MACRO_TABLE, name, { transaction });
          }
        }
        for (const name of MACRO_COLUMN_NAMES) {
          if (columns[name]) {
            await queryInterface.removeColumn(MACRO_TABLE, name, { transaction });
          }
        }
      }

      if (names.has(SOURCE_TABLE)) {
        await queryInterface.dropTable(SOURCE_TABLE, { transaction });
      }
    });
  },
};
