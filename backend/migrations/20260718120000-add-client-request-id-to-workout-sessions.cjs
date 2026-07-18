'use strict';

/**
 * Post-Save Handoff Slice 2 — per-user idempotency key on workout_sessions.
 * Adds a nullable clientRequestId + a COMPOSITE PARTIAL UNIQUE index (userId, clientRequestId) so an
 * offline retry of the same save can't create a duplicate WorkoutSession — WITHOUT making the key
 * global (a global unique key on a client-supplied value is a cross-user IDOR / read-oracle; the
 * per-user composite closes that structurally). Legacy rows (NULL clientRequestId) are untouched.
 *
 * Column casing: this model is NOT `underscored` and declares no `field:` maps, so its columns are
 * camelCase (userId, clientRequestId) — matching the attributes. Do NOT snake_case them.
 *
 * Locking (Kimi F5): the column add is metadata-only (fast, in a short tx); the unique index is built
 * OUTSIDE any transaction, CONCURRENTLY on Postgres, so it never write-locks this shared-by-4-loggers
 * table. SQLite/CI builds it in-line (no CONCURRENTLY support; test DBs are small).
 *
 * @type {import('sequelize-cli').Migration}
 */
const TABLE = 'workout_sessions';
const COLUMN = 'clientRequestId';
const INDEX = 'workout_sessions_user_client_request_uidx';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Add the column in a short transaction (metadata-only).
    const t = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable(TABLE);
      if (!table[COLUMN]) {
        await queryInterface.addColumn(TABLE, COLUMN, {
          type: Sequelize.STRING(64),
          allowNull: true,
          defaultValue: null,
        }, { transaction: t });
      }
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }

    // 2) Build the composite partial unique index OUTSIDE a transaction (CONCURRENTLY on PG).
    const isPg = queryInterface.sequelize.getDialect() === 'postgres';
    await queryInterface.addIndex(TABLE, ['userId', COLUMN], {
      name: INDEX,
      unique: true,
      where: { [COLUMN]: { [Sequelize.Op.ne]: null } }, // → "IS NOT NULL"; PG + SQLite >= 3.8
      ...(isPg ? { concurrently: true } : {}),
    });
    console.log(`✅ ${TABLE}.${COLUMN} + composite partial unique index ${INDEX} added.`);
  },

  async down(queryInterface) {
    // Index FIRST, then column (SQLite recreates the table on removeColumn and would choke otherwise).
    await queryInterface.removeIndex(TABLE, INDEX).catch(() => {});
    await queryInterface.removeColumn(TABLE, COLUMN).catch(() => {});
  },
};
