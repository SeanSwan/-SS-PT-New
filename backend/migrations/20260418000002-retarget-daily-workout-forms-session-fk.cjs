'use strict';

/**
 * Phase 16.2 round 10 (2026-04-18): retarget
 * `daily_workout_forms.session_id` FK from legacy `WorkoutSessions` (empty,
 * PascalCase) to active `workout_sessions` (snake_case).
 *
 * Background:
 *   - `WorkoutSessions` (PascalCase): legacy table, 0 rows.
 *   - `workout_sessions` (snake_case): active table, WorkoutSession model
 *     writes here, 14 rows at migration write time.
 *   - Live FK `daily_workout_forms_session_id_fkey` targets the empty
 *     legacy table. Every client self-log save attempt now hits this
 *     because the route creates a session via the model (lands in
 *     `workout_sessions`), then `DailyWorkoutForm.create` inserts
 *     `session_id` → FK check looks it up in `WorkoutSessions` (empty)
 *     → `insert or update on table "daily_workout_forms" violates foreign
 *     key constraint "daily_workout_forms_session_id_fkey"`.
 *
 *   The original 20250714000002-create-daily-workout-forms.cjs migration
 *   DECLARED `references: { model: 'workout_sessions' }` — the live FK
 *   target must have drifted to `WorkoutSessions` via a later sync or
 *   manual op. This migration restores the originally-intended target.
 *
 * Bounded scope:
 *   - Retarget only this one FK. Preserves current update/delete rules
 *     (NO ACTION update / SET NULL delete) to match live behavior, not
 *     the original migration's CASCADE update — principle of minimum
 *     intervention on a surface that has been live for months.
 *
 * Sibling drift (flagged, NOT fixed this slice):
 *   `workout_exercises.workoutSessionId_fkey` also targets the empty
 *   `WorkoutSessions`. Not on the Phase 16 save path. Needs its own
 *   slice once the active table for workout_exercises is confirmed.
 *
 * Idempotency:
 *   - up(): drops the old constraint IF EXISTS, recreates targeting
 *     `workout_sessions`. Safe to re-run.
 *   - down(): inverse. Restores the legacy target. Safe-rollback
 *     precheck refuses if any `daily_workout_forms.session_id` points
 *     at a `workout_sessions` row that has no matching id in
 *     `WorkoutSessions` — rolling back would break those FKs.
 */
const CONSTRAINT_NAME = 'daily_workout_forms_session_id_fkey';

module.exports = {
  async up(queryInterface /* , Sequelize */) {
    const existingTables = await queryInterface.showAllTables();
    const tableNames = existingTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.tableName === 'string') return entry.tableName;
      return '';
    });

    if (!tableNames.includes('daily_workout_forms')) {
      console.log('[Migration] daily_workout_forms missing — nothing to alter');
      return;
    }
    if (!tableNames.includes('workout_sessions')) {
      throw new Error(
        '[Migration] workout_sessions table missing — cannot retarget FK to a nonexistent table'
      );
    }

    // Inspect current FK target. If already pointing at workout_sessions,
    // skip — keeps this safe across environments and re-runs.
    const [currentTargetRows] = await queryInterface.sequelize.query(
      `SELECT ccu.table_name AS target_table
         FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_name = '${CONSTRAINT_NAME}'
          AND tc.table_name = 'daily_workout_forms';`
    );
    const currentTarget = currentTargetRows?.[0]?.target_table;
    if (currentTarget === 'workout_sessions') {
      console.log('[Migration] daily_workout_forms.session_id FK already targets workout_sessions, skipping');
      return;
    }

    console.log(`[Migration] Retargeting FK: currently points at "${currentTarget || '<none>'}"`);

    await queryInterface.sequelize.query(
      `ALTER TABLE daily_workout_forms DROP CONSTRAINT IF EXISTS "${CONSTRAINT_NAME}";`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE daily_workout_forms
         ADD CONSTRAINT "${CONSTRAINT_NAME}"
         FOREIGN KEY (session_id)
         REFERENCES workout_sessions(id)
         ON UPDATE NO ACTION
         ON DELETE SET NULL;`
    );
    console.log('[Migration] daily_workout_forms.session_id FK now targets workout_sessions(id)');
  },

  async down(queryInterface /* , Sequelize */) {
    // Safe-rollback precheck. After this migration ships, new rows will
    // reference workout_sessions.id values that may not exist in the
    // legacy WorkoutSessions table. Rolling back would leave orphan FKs
    // or fail the constraint validation depending on Postgres version.
    const [orphanRows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS n
         FROM daily_workout_forms dwf
        WHERE dwf.session_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "WorkoutSessions" ws WHERE ws.id = dwf.session_id
          );`
    );
    const orphanN = Number(orphanRows?.[0]?.n ?? 0);
    if (orphanN > 0) {
      throw new Error(
        `[Phase 16.2 round 10 rollback refused] ${orphanN} daily_workout_forms ` +
        `row(s) have session_id values that exist in workout_sessions but NOT ` +
        `in WorkoutSessions. Re-pointing the FK at WorkoutSessions would break ` +
        `those rows. Archive or null-out their session_id explicitly before ` +
        `re-running this down().`
      );
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE daily_workout_forms DROP CONSTRAINT IF EXISTS "${CONSTRAINT_NAME}";`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE daily_workout_forms
         ADD CONSTRAINT "${CONSTRAINT_NAME}"
         FOREIGN KEY (session_id)
         REFERENCES "WorkoutSessions"(id)
         ON UPDATE NO ACTION
         ON DELETE SET NULL;`
    );
    console.log('[Migration] daily_workout_forms.session_id FK restored to WorkoutSessions(id)');
  },
};
