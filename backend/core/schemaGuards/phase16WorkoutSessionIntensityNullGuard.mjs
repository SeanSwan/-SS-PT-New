/**
 * ============================================================================
 * FILE: phase16WorkoutSessionIntensityNullGuard.mjs
 * PURPOSE: Boot-time schema guard for Phase 16 `workout_sessions.intensity`
 *          nullability. Asserts the column is nullable before serving traffic.
 * OWNER: Claude Opus 4.7 | CREATED: 2026-04-16 (Phase 16)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Verifies at backend boot that `workout_sessions.intensity` accepts null.
 * If the column is still `NOT NULL` after Phase 16 code ships, writer
 * fixes that omit intensity (WorkoutLogger save path, scheduled-session
 * auto-completion, AI daily-form writer) would fail with Sequelize
 * notNull-violation errors instead of persisting null as intended.
 *
 * WHY PRE-LISTEN:
 * Runs inside `criticalDatabasePreflight()` in startup.mjs, BEFORE
 * `startServer(app)` is called. Mirrors the Phase 15 guard pattern. If
 * the Phase 16 migration `20260416000001-allow-null-workout-session-
 * intensity.cjs` did not run (skipped, errored, or code shipped ahead
 * of migration), this guard makes that failure loud rather than letting
 * it surface as per-route 500s on workout save paths.
 *
 * BEHAVIOR:
 *   - `workout_sessions` missing → log + resolve (fresh install path).
 *   - `workout_sessions.intensity` is nullable → pass.
 *   - `workout_sessions.intensity` still NOT NULL → throw with an
 *     operator-actionable message pointing at the Phase 16 migration.
 *   - Introspection errors → log + rethrow so ops notice.
 */

import logger from '../../utils/logger.mjs';

const PHASE_16_MIGRATION_FILENAME =
  '20260416000001-allow-null-workout-session-intensity.cjs';

/**
 * @param {import('sequelize').Sequelize} sequelize - active Sequelize instance
 * @returns {Promise<{ status: 'ok' | 'table-missing' }>}
 * @throws {Error} when workout_sessions exists but intensity is still NOT NULL
 */
export async function assertPhase16WorkoutSessionIntensityNullable(sequelize) {
  if (!sequelize || typeof sequelize.query !== 'function') {
    throw new Error(
      '[Phase16Guard] A valid Sequelize instance is required to verify workout_sessions.intensity nullability',
    );
  }

  const queryInterface = sequelize.getQueryInterface();

  // Step 1: does the workout_sessions table exist? Fresh-install path.
  let tables;
  try {
    tables = await queryInterface.showAllTables();
  } catch (err) {
    logger.error(
      `[Phase16Guard] Could not introspect schema — unable to verify workout_sessions.intensity: ${err?.message || 'unknown'}`,
    );
    throw err;
  }

  const tableNames = (tables || []).map((entry) => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry.tableName === 'string') return entry.tableName;
    return '';
  });

  if (!tableNames.includes('workout_sessions')) {
    logger.warn(
      '[Phase16Guard] workout_sessions table not present yet — skipping intensity-nullability verification (fresh install expected)',
    );
    return { status: 'table-missing' };
  }

  // Step 2: is intensity nullable?
  const [rows] = await sequelize.query(
    `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'workout_sessions' AND column_name = 'intensity';`,
  );
  const isNullable = rows?.[0]?.is_nullable;

  if (isNullable === 'YES') {
    logger.info(
      '[Phase16Guard] workout_sessions.intensity is nullable — Phase 16 schema verified',
    );
    return { status: 'ok' };
  }

  // Step 3: column still NOT NULL → fail fast with actionable error.
  const message = [
    '',
    '=================================================================',
    '❌ Phase 16 schema guard FAILED',
    '=================================================================',
    'The backend code expects workout_sessions.intensity to accept null',
    '(Phase 16, 2026-04-16) but this column is still NOT NULL on the',
    'connected DB.',
    '',
    'WHY THIS MATTERS:',
    '  - WorkoutLogger save path omits intensity when untouched',
    '  - sessionController auto-completion persists null intensity',
    '  - aiDataWriteService omits intensity when not specified',
    '  - dailyWorkoutFormRoutes honors null from the payload',
    '  With the column still NOT NULL, every one of these paths will',
    '  fail with a Sequelize notNull-violation error at write time.',
    '',
    'FIX (run in the Render shell or wherever the backend connects):',
    `  1. Confirm the migration file is deployed: backend/migrations/${PHASE_16_MIGRATION_FILENAME}`,
    '  2. Apply it:  npx sequelize-cli db:migrate',
    '  3. Restart the backend.',
    '',
    'The guard will pass automatically once the column is nullable.',
    '=================================================================',
    '',
  ].join('\n');

  logger.error(message);
  const err = new Error(
    `Phase 16 schema guard failed: workout_sessions.intensity is still NOT NULL. Run migration ${PHASE_16_MIGRATION_FILENAME} (npx sequelize-cli db:migrate) before starting the backend.`,
  );
  err.code = 'PHASE_16_SCHEMA_GUARD_FAILED';
  throw err;
}
