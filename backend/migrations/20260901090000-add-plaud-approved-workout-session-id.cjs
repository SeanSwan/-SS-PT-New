'use strict';

/**
 * Blueprint Slice 1 (F1 fix) — PLAUD-AUTO-INGEST-REBUILD-BLUEPRINT-2026-09-01.md §5.6
 * ===================================================================================
 * The approval path creates workout_sessions rows (logWorkoutForClient) but the
 * original schema linked approvals via approved_workout_form_id UUID REFERENCES
 * daily_workout_forms(id) — a table the approval path never writes. The controller
 * fell back to writing the WorkoutSession UUID into that column: guaranteed FK
 * violation (probe 2026-09-01: FK live in prod; 0 rows ever written).
 *
 * Fix: add approved_workout_session_id UUID REFERENCES workout_sessions(id).
 * The old column stays in place, unused, for one release (Rule 34 — its drop is a
 * separate follow-up migration after Slice 6 ships clean).
 *
 * Additive + reversible. FK targets verified against backend/schema-snapshot.json
 * (workout_sessions.id = UUID). No "Users" involvement — no case-folding trap.
 */

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE plaud_merge_requests
         ADD COLUMN IF NOT EXISTS approved_workout_session_id UUID NULL
         REFERENCES workout_sessions (id)`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_plaud_merge_requests_approved_ws
         ON plaud_merge_requests (approved_workout_session_id)
         WHERE approved_workout_session_id IS NOT NULL`,
        { transaction },
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_plaud_merge_requests_approved_ws`,
        { transaction },
      );
      // Drops only the column this migration added; it holds no data any other
      // path depends on (linkage is re-derivable from workout_sessions rows).
      await queryInterface.sequelize.query(
        `ALTER TABLE plaud_merge_requests
         DROP COLUMN IF EXISTS approved_workout_session_id`,
        { transaction },
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
