'use strict';

const TABLE_NAME = 'PointTransactions';
const COLUMN_NAME = 'idempotencyKey';
const INDEX_NAME = 'point_transactions_user_source_idempotency_key';

async function pointTransactionsTableExists(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = '${TABLE_NAME}'
    LIMIT 1;
  `);

  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_PointTransactions_source') THEN
          ALTER TYPE "enum_PointTransactions_source" ADD VALUE IF NOT EXISTS 'social_engagement';
          ALTER TYPE "enum_PointTransactions_source" ADD VALUE IF NOT EXISTS 'goal_milestone';
          ALTER TYPE "enum_PointTransactions_source" ADD VALUE IF NOT EXISTS 'goal_completed';
        END IF;
      END
      $$;
    `);

    if (!(await pointTransactionsTableExists(queryInterface))) {
      return;
    }

    const table = await queryInterface.describeTable(TABLE_NAME);
    if (!table[COLUMN_NAME]) {
      await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME, {
        type: Sequelize.STRING(128),
        allowNull: true
      });
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "${INDEX_NAME}"
      ON "${TABLE_NAME}" ("userId", "source", "${COLUMN_NAME}")
      WHERE "${COLUMN_NAME}" IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${INDEX_NAME}";`);

    if (!(await pointTransactionsTableExists(queryInterface))) {
      return;
    }

    const table = await queryInterface.describeTable(TABLE_NAME);
    if (table[COLUMN_NAME]) {
      await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME);
    }
  }
};