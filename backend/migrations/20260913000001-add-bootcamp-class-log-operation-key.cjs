'use strict';

/**
 * ============================================================================
 * H29 / R-H04 — durable taught-log operation identity (contract §5 line 218).
 *
 * "Add nullable ClassLog.operationKey STRING(128), payloadHash STRING(64),
 *  executionSummary JSONB and a unique index on trainerId+operationKey. Old rows
 *  remain null and readable. New write endpoints require an operation key; do not
 *  backfill imaginary run identity into historical logs."
 *
 * WHY THE UNIQUE INDEX IS THE POINT
 *   A retried taught log must collapse onto ONE row instead of appending a second
 *   class log — a distinct class identity defeats attendance deduplication even when
 *   each attendance transaction is itself correct. Postgres treats NULLs as DISTINCT
 *   in a unique index, so the historical rows (all null keys) coexist untouched, which
 *   is exactly the "old rows remain null and readable" requirement.
 *
 * FIXTURE-ONLY, DISCLOSED.
 *   Authored under the packet's constraint that migrations may be applied to the OWNED
 *   FIXTURE ONLY (`rolodex-postgres-s06-20260913`, port 55089, database
 *   `rolodex_s06_test`). It has NOT been run against production or any dev database.
 * ============================================================================
 */

const TABLE = 'bootcamp_class_log';

const COLUMNS = {
  operationKey: (Sequelize) => ({ type: Sequelize.STRING(128), allowNull: true }),
  payloadHash: (Sequelize) => ({ type: Sequelize.STRING(64), allowNull: true }),
  executionSummary: (Sequelize) => ({ type: Sequelize.JSONB, allowNull: true }),
};

const UNIQUE_INDEX = 'uniq_bootcamp_log_trainer_operation_key';

const hasTable = async (queryInterface, name) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((entry) => (typeof entry === 'string' ? entry : entry?.tableName) === name);
};

const indexNames = async (queryInterface) => {
  // A missing table or an unsupported response must not crash `down`; the guard below
  // simply skips the drop.
  const indexes = await queryInterface.showIndex(TABLE).catch(() => []);
  return Array.isArray(indexes) ? indexes.map((entry) => entry?.name) : [];
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, TABLE))) return;
    const existing = await queryInterface.describeTable(TABLE);
    for (const [name, definition] of Object.entries(COLUMNS)) {
      if (!existing[name]) await queryInterface.addColumn(TABLE, name, definition(Sequelize));
    }
    if (!(await indexNames(queryInterface)).includes(UNIQUE_INDEX)) {
      await queryInterface.addIndex(TABLE, ['trainerId', 'operationKey'], {
        name: UNIQUE_INDEX,
        unique: true,
      });
    }
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface, TABLE))) return;
    if ((await indexNames(queryInterface)).includes(UNIQUE_INDEX)) {
      await queryInterface.removeIndex(TABLE, UNIQUE_INDEX);
    }
    const existing = await queryInterface.describeTable(TABLE);
    for (const name of Object.keys(COLUMNS).reverse()) {
      if (existing[name]) await queryInterface.removeColumn(TABLE, name);
    }
  },
};
