'use strict';

/**
 * Post-Save Handoff Slice 2 — per-user idempotency key on workout_sessions.
 * Adds a nullable clientRequestId + a COMPOSITE PARTIAL UNIQUE index (userId, clientRequestId) so an
 * offline retry of the same save can't create a duplicate WorkoutSession — WITHOUT making the key
 * global (a global unique on a client-supplied value is a cross-user IDOR; per-user closes that).
 * Legacy rows (NULL clientRequestId) are untouched and excluded by the partial predicate.
 *
 * Column casing: this model is NOT `underscored` and declares no `field:` maps, so its columns are
 * camelCase (userId, clientRequestId) — matching the attributes. Do NOT snake_case them.
 *
 * Build strategy (reconciles two review lenses): the partial index is EMPTY at build time — every
 * existing row has clientRequestId = NULL, excluded by `WHERE clientRequestId IS NOT NULL` — so the
 * index scan is trivial and holds no meaningful write-lock. We therefore build it NON-CONCURRENTLY
 * inside the same transaction as the column add: this is ATOMIC (the prod safe-migrate runner cannot
 * mark a half-built index "done" and silently drop the uniqueness guarantee, which CONCURRENTLY risked),
 * and the usual CONCURRENTLY justification (avoid locking a large table) does not apply to an empty index.
 *
 * @type {import('sequelize-cli').Migration}
 */
const TABLE = 'workout_sessions';
const COLUMN = 'clientRequestId';
const INDEX = 'workout_sessions_user_client_request_uidx';

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
      await queryInterface.addIndex(TABLE, ['userId', COLUMN], {
        name: INDEX,
        unique: true,
        where: { [COLUMN]: { [Sequelize.Op.ne]: null } }, // → "IS NOT NULL"; PG + SQLite >= 3.8
        transaction,
      });
      await transaction.commit();
      console.log(`✅ ${TABLE}.${COLUMN} + composite partial unique index ${INDEX} added (atomic).`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    // Index FIRST, then column (SQLite recreates the table on removeColumn and would choke otherwise).
    await queryInterface.removeIndex(TABLE, INDEX).catch(() => {});
    await queryInterface.removeColumn(TABLE, COLUMN).catch(() => {});
  },
};
