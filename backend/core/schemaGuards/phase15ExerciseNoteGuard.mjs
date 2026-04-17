/**
 * ============================================================================
 * FILE: phase15ExerciseNoteGuard.mjs
 * PURPOSE: Boot-time schema guard for Phase 15.0 `exerciseNote` column
 * OWNER: Claude Opus 4.6 | CREATED: 2026-04-15 (Phase 15.1)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Verifies at backend boot that `workout_logs."exerciseNote"` (the Phase
 * 15.0 dedicated exercise-level coaching note column) actually exists in
 * the live database. If the column is missing, the guard throws a fail-
 * fast error with an actionable message BEFORE the server starts
 * accepting requests. The alternative is a partial runtime where the
 * Sequelize WorkoutLog model expects the column, the admin write path
 * tries to persist it, and Recovery Signal SQL hard-references
 * `wl."exerciseNote"` — failures would surface as per-route 500s
 * instead of as a clear "migrate first" signal.
 *
 * WHY PRE-LISTEN (Phase 15.2):
 * This guard runs inside `criticalDatabasePreflight()` in startup.mjs,
 * BEFORE `startServer(app)` is called — meaning the HTTP server does
 * NOT begin accepting requests until the column is verified. The Phase
 * 15 migration at `backend/migrations/20260415000001-add-exercise-note-
 * to-workout-logs.cjs` runs earlier in the same preflight via
 * `runStartupMigrations()`. Running the guard immediately after gives a
 * clean "migration applied OR fail fast" contract: the guard passes
 * when the migration did its job, or throws with an operator-actionable
 * message when the migration was skipped, errored silently, or the
 * deploy shipped code ahead of a manually-triggered migration.
 *
 * Phase 15.1 originally placed the guard inside `initializeDatabases()`
 * which ran in a background setTimeout AFTER the server was already
 * listening — failures were swallowed. Phase 15.2 moved the guard to
 * the pre-listen critical path so failure is truly fatal before any
 * request is served.
 *
 * BEHAVIOR:
 *   - `workout_logs` missing → log + resolve (fresh install, the
 *     create-workout-logs migration will run separately). We do NOT
 *     throw here because an empty-DB bootstrap is legitimate.
 *   - `workout_logs` exists AND `exerciseNote` column exists → pass.
 *   - `workout_logs` exists AND `exerciseNote` column missing → throw
 *     with a message specific enough to paste into a Render shell:
 *     the migration filename, the expected column name, and the exact
 *     Sequelize CLI command needed to apply it.
 *   - Introspection itself errors → log + rethrow so ops notice.
 *
 * NO SILENT DEGRADATION. The purpose of this guard is specifically to
 * make the "schema vs code drift" failure mode loud and recoverable.
 */

import logger from '../../utils/logger.mjs';

const PHASE_15_MIGRATION_FILENAME =
  '20260415000001-add-exercise-note-to-workout-logs.cjs';

/**
 * @param {import('sequelize').Sequelize} sequelize - active Sequelize instance
 * @returns {Promise<{ status: 'ok' | 'table-missing', column?: 'present' | 'missing' }>}
 * @throws {Error} when workout_logs exists but exerciseNote column is missing
 */
export async function assertPhase15ExerciseNoteColumn(sequelize) {
  if (!sequelize || typeof sequelize.getQueryInterface !== 'function') {
    throw new Error(
      '[Phase15Guard] A valid Sequelize instance is required to verify workout_logs.exerciseNote',
    );
  }

  const queryInterface = sequelize.getQueryInterface();

  // Step 1: does the workout_logs table exist yet? If not, this is a
  // fresh-install bootstrap and the create-workout-logs migration will
  // take care of things. Do not throw.
  let tables;
  try {
    tables = await queryInterface.showAllTables();
  } catch (err) {
    logger.error(
      `[Phase15Guard] Could not introspect schema — unable to verify workout_logs.exerciseNote: ${err?.message || 'unknown'}`,
    );
    throw err;
  }

  const tableNames = (tables || []).map((entry) => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry.tableName === 'string') return entry.tableName;
    return '';
  });

  if (!tableNames.includes('workout_logs')) {
    logger.warn(
      '[Phase15Guard] workout_logs table not present yet — skipping exerciseNote verification (fresh install expected)',
    );
    return { status: 'table-missing' };
  }

  // Step 2: does the exerciseNote column exist?
  let columns;
  try {
    columns = await queryInterface.describeTable('workout_logs');
  } catch (err) {
    logger.error(
      `[Phase15Guard] describeTable('workout_logs') failed: ${err?.message || 'unknown'}`,
    );
    throw err;
  }

  if (columns && columns.exerciseNote) {
    logger.info(
      '[Phase15Guard] workout_logs.exerciseNote present — Phase 15 schema verified',
    );
    return { status: 'ok', column: 'present' };
  }

  // Step 3: column missing → fail fast with actionable error.
  const message = [
    '',
    '=================================================================',
    '❌ Phase 15 schema guard FAILED',
    '=================================================================',
    'The backend code expects workout_logs."exerciseNote" (Phase 15.0,',
    '2026-04-15) but this column does not exist on the connected DB.',
    '',
    'WHY THIS MATTERS:',
    '  - WorkoutLog.mjs declares the exerciseNote attribute',
    '  - workoutLogService.buildLogRows stamps it on every row',
    '  - adminWorkoutLoggerController.editWorkout persists it',
    '  - chartDataController.getRecoverySignalChart SELECTs it',
    '  Starting the server without this column will surface as per-',
    '  route 500s on the admin workout and client progress surfaces.',
    '',
    'FIX (run in the Render shell or wherever the backend connects):',
    `  1. Confirm the migration file is deployed: backend/migrations/${PHASE_15_MIGRATION_FILENAME}`,
    '  2. Apply it:  npx sequelize-cli db:migrate',
    '  3. Restart the backend.',
    '',
    'The guard will pass automatically once the column is present.',
    '=================================================================',
    '',
  ].join('\n');

  logger.error(message);
  const err = new Error(
    `Phase 15 schema guard failed: workout_logs.exerciseNote column missing. Run migration ${PHASE_15_MIGRATION_FILENAME} (npx sequelize-cli db:migrate) before starting the backend.`,
  );
  err.code = 'PHASE_15_SCHEMA_GUARD_FAILED';
  throw err;
}
