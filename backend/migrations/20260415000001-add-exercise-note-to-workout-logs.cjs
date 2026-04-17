'use strict';

/**
 * Phase 15.0 (2026-04-15): add workout_logs.exerciseNote TEXT column.
 *
 * The Phase 13.2 exercise-notes architecture encoded exercise-level
 * coaching observations into set 1's notes string using a `Coach: `
 * marker. That contract had two real correctness bugs:
 *
 *   1. Deleting set 1 in the admin workout history edit flow silently
 *      lost the exercise-level note (it was anchored to a single row).
 *   2. A legitimate trainer-authored set note starting with `Coach: `
 *      could be misclassified as an exercise-level note on read.
 *
 * Phase 15.0 replaces the fragile encoding with a dedicated nullable
 * column. The column is populated on EVERY row of an exercise group
 * by the write path, so deleting any single row preserves the note on
 * the remaining rows. Legacy Phase 13.2 rows keep their `Coach: `
 * marker in `notes` and are lazy-normalized on read; saving an edit
 * migrates them off the old contract.
 *
 * Column convention: existing workout_logs columns use quoted camelCase
 * (`"sessionId"`, `"exerciseName"`, `"setNumber"`). The new column
 * follows suit — `"exerciseNote"`, NOT `exercise_note`, to keep the
 * table's naming consistent. Sequelize models that don't use
 * `underscored: true` expect camelCase physical column names.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();
    const tableNames = existingTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.tableName === 'string') return entry.tableName;
      return '';
    });

    if (!tableNames.includes('workout_logs')) {
      console.log('[Migration] workout_logs missing — nothing to alter');
      return;
    }

    // Defensive: skip if already present (re-running migrations safely).
    const describe = await queryInterface.describeTable('workout_logs');
    if (describe.exerciseNote) {
      console.log('[Migration] workout_logs.exerciseNote already exists, skipping');
      return;
    }

    await queryInterface.addColumn('workout_logs', 'exerciseNote', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    console.log('[Migration] Added workout_logs.exerciseNote (nullable TEXT)');
  },

  async down(queryInterface) {
    const existingTables = await queryInterface.showAllTables();
    const tableNames = existingTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.tableName === 'string') return entry.tableName;
      return '';
    });

    if (!tableNames.includes('workout_logs')) return;

    const describe = await queryInterface.describeTable('workout_logs');
    if (!describe.exerciseNote) return;

    await queryInterface.removeColumn('workout_logs', 'exerciseNote');
    console.log('[Migration] Dropped workout_logs.exerciseNote');
  },
};
