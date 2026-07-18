'use strict';

/**
 * Post-Save Handoff Slice 2 — idempotency key on workout_sessions.
 * Adds a nullable clientRequestId + a PARTIAL UNIQUE index (only where NOT NULL) so an offline
 * retry of the same save can't create a duplicate WorkoutSession, while legacy rows (NULL) are
 * untouched. ADDITIVE + REVERSIBLE. Table is SHARED by 4 loggers — the column is nullable and
 * unindexed for existing rows, so this is safe.
 *
 * Cross-dialect: partial unique index via `where` works on Postgres and SQLite >= 3.8. Both also
 * treat multiple NULLs as distinct under a plain unique index, so the partial clause is intent
 * documentation + a hard guarantee on non-null values.
 * NOTE: a non-concurrent index build write-locks workout_sessions during the scan — run off-peak.
 *
 * @type {import('sequelize-cli').Migration}
 */
const TABLE = 'workout_sessions';
const COLUMN = 'clientRequestId';
const INDEX = 'workout_sessions_client_request_id_uidx';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable(TABLE);
      if (!table[COLUMN]) {
        await queryInterface.addColumn(TABLE, COLUMN, {
          type: Sequelize.STRING(64),
          allowNull: true,
          defaultValue: null,
        }, { transaction });
      }
      await queryInterface.addIndex(TABLE, [COLUMN], {
        name: INDEX,
        unique: true,
        where: { [COLUMN]: { [Sequelize.Op.ne]: null } }, // → "IS NOT NULL"; PG + SQLite >= 3.8
        transaction,
      });
      await transaction.commit();
      console.log(`✅ ${TABLE}.${COLUMN} + partial unique index ${INDEX} added.`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Index FIRST, then column (SQLite recreates the table on removeColumn and would choke otherwise).
      await queryInterface.removeIndex(TABLE, INDEX, { transaction }).catch(() => {});
      await queryInterface.removeColumn(TABLE, COLUMN, { transaction }).catch(() => {});
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
