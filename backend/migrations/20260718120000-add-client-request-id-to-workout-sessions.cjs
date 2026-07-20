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
 * Build strategy (reconciles two review lenses): the partial index has ZERO ENTRIES at build time —
 * every existing row has clientRequestId = NULL, excluded by `WHERE clientRequestId IS NOT NULL`.
 * Lock honesty (post-ship review correction): a non-CONCURRENT CREATE INDEX still takes a SHARE lock
 * and full-table-scans workout_sessions to evaluate the predicate, briefly blocking writes (new saves)
 * for the scan duration — sub-second at current scale, NOT free at large scale. We build NON-CONCURRENTLY
 * inside the same transaction as the column add because atomicity wins here: the prod safe-migrate runner
 * cannot mark a half-built CONCURRENTLY index "done" and silently drop the uniqueness guarantee. If this
 * table is ever large when a similar migration is written, prefer CONCURRENTLY outside a tx + a re-check.
 * (This migration already ran in prod 2026-07-19; edits below are comment/idempotency-only — sequelize
 * tracks migrations by filename, so comment edits are inert.)
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
      // Idempotency guard (post-ship hardening): a bare re-run after a committed success — only possible
      // if SequelizeMeta drifts out of sync with the DB — must not throw "index already exists" and fail
      // the deploy. Symmetric with the describeTable guard on the column above.
      const existingIndexes = await queryInterface.showIndex(TABLE, { transaction }).catch(() => []);
      if (!existingIndexes.some((ix) => ix.name === INDEX)) {
        await queryInterface.addIndex(TABLE, ['userId', COLUMN], {
          name: INDEX,
          unique: true,
          where: { [COLUMN]: { [Sequelize.Op.ne]: null } }, // → "IS NOT NULL"; PG + SQLite >= 3.8
          transaction,
        });
      }
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
