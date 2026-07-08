/**
 * inspect-launch-migrations.mjs — read-only deploy probe (launch charter 2026-07)
 * ================================================================================
 * Verifies the launch-batch migrations actually landed in the target DB:
 *   - personal_records (4a) · recovery_completions (4B.3) ·
 *     history_backfill_runs (H) tables exist with expected key columns
 *   - CES coverage backfill rows present (ces-* exercise keys, 4B.1)
 * Prints structural facts only (names/counts) — never row data (Rule 8/59).
 *
 * Run from backend/: node scripts/inspect-launch-migrations.mjs
 * (DATABASE_URL is loaded by the app config exactly like the server does.)
 */
import sequelize from '../database.mjs';

const q = async (sql, replacements = {}) =>
  (await sequelize.query(sql, { replacements }))[0];

const checkTable = async (table, mustHaveColumns) => {
  const cols = await q(
    `SELECT column_name FROM information_schema.columns WHERE table_name = :table`,
    { table },
  );
  const names = new Set(cols.map((c) => c.column_name));
  const missing = mustHaveColumns.filter((c) => !names.has(c));
  const ok = cols.length > 0 && missing.length === 0;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${table}: ${cols.length} columns` +
    (missing.length ? ` — MISSING: ${missing.join(', ')}` : ''),
  );
  return ok;
};

try {
  let allOk = true;
  allOk = (await checkTable('personal_records', ['userId', 'exerciseName', 'metric', 'value', 'achievedAt'])) && allOk;
  allOk = (await checkTable('recovery_completions', ['userId', 'exerciseKey', 'completedDate'])) && allOk;
  allOk = (await checkTable('history_backfill_runs', ['userId', 'trainerId', 'attestation', 'created', 'undoneAt'])) && allOk;

  // House gotcha: the canonical exercise table is PascalCase "Exercises".
  const [ces] = await q(
    `SELECT COUNT(*)::int AS count FROM "Exercises" WHERE exercise_key LIKE 'ces-%'`,
  );
  const cesOk = (ces?.count ?? 0) >= 40; // 32 pre-existing + 8 from the 4B.1 backfill
  console.log(`${cesOk ? 'OK  ' : 'FAIL'} CES coverage rows (ces-*): ${ces?.count ?? 0} (expect >= 40)`);
  allOk = cesOk && allOk;

  console.log(allOk ? 'LAUNCH MIGRATIONS: ALL VERIFIED' : 'LAUNCH MIGRATIONS: GAPS FOUND');
  process.exit(allOk ? 0 : 1);
} catch (error) {
  console.error('PROBE ERROR:', error.message);
  process.exit(2);
}
