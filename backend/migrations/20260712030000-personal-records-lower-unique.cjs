'use strict';

/**
 * personal_records: case-insensitive uniqueness at the DB layer.
 * ============================================================================
 * The PR engine (workoutPrDetectionService) matches exercises case-
 * insensitively, but the original unique index was on RAW exerciseName —
 * so two CONCURRENT first-ever saves of "Bench Press" / "bench press" could
 * both pass the lower() pre-read and both insert, leaving permanent duplicate
 * baseline rows that other readers (analytics routes, challenge results)
 * don't dedupe. (Hostile-review finding, 2026-07-12 loop.)
 *
 * This migration, in ONE transaction:
 *   1. Case-collapses existing duplicates: per (userId, lower(exerciseName),
 *      metric) keeps the row with the HIGHEST value (tie -> lowest id, the
 *      earliest baseline) and deletes the rest. No FK references
 *      personal_records, so deletes cannot cascade anywhere.
 *   2. Swaps the raw-name unique index for one on
 *      (userId, lower(exerciseName), metric).
 *
 * The service's create .catch() already treats a unique violation as a benign
 * race, so the new index needs no application change to be honored.
 * Idempotent: re-running skips work it has already done.
 */

const OLD_INDEX = 'personal_records_user_exercise_metric_unique';
const NEW_INDEX = 'personal_records_user_lower_exercise_metric_unique';

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      // 1. Case-collapse duplicates, keeping max(value) then min(id).
      await sequelize.query(
        `DELETE FROM personal_records pr
         USING personal_records keeper
         WHERE keeper."userId" = pr."userId"
           AND lower(keeper."exerciseName") = lower(pr."exerciseName")
           AND keeper.metric = pr.metric
           AND keeper.id <> pr.id
           AND (keeper.value > pr.value
                OR (keeper.value = pr.value AND keeper.id < pr.id))`,
        { transaction },
      );

      // 2. Swap the index.
      await sequelize.query(`DROP INDEX IF EXISTS "${OLD_INDEX}"`, { transaction });
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "${NEW_INDEX}"
           ON personal_records ("userId", lower("exerciseName"), metric)`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`DROP INDEX IF EXISTS "${NEW_INDEX}"`, { transaction });
      // Best-effort restore of the raw-name index; the case-collapse of step 1
      // is not reversible (deleted duplicate rows are gone by design).
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "${OLD_INDEX}"
           ON personal_records ("userId", "exerciseName", metric)`,
        { transaction },
      );
    });
  },
};
