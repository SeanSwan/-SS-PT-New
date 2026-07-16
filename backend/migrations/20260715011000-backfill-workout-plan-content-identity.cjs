/**
 * ============================================================================
 * FILE: 20260715011000-backfill-workout-plan-content-identity.cjs
 * PURPOSE: Repair legacy WorkoutPlan revision/hash data without schema tightening.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Bridges the CommonJS migration runner to the bounded ESM
 * identity backfill and returns its parity receipt.
 * HOW IT FITS IN THE APP: Runs after nullable columns exist and before a later,
 * separately deployed non-null contract migration.
 * KEY DECISIONS: Down is intentionally a no-op because deleting valid identity
 * data is destructive; app rollback continues to tolerate the nullable columns.
 * NASM PROTOCOL CONTEXT: Gives historical prescriptions deterministic identity.
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const { backfillWorkoutPlanContentIdentity } = await import(
      '../services/workoutPlanIdentityBackfillService.mjs'
    );
    return backfillWorkoutPlanContentIdentity({
      sequelize: queryInterface.sequelize,
      batchSize: 100,
    });
  },

  async down() {
    // Data-only repair is forward-compatible and must not be erased on rollback.
  },
};
