// NO SHEBANG — deliberate, and load-bearing. Vite's SSR transform emits its import preamble ABOVE line 1, so a shebang stops being at byte 0 and V8 rejects the whole module ("Invalid or unexpected token"); vitest then blames whichever test file imported it, with no stack and no code frame. Every caller runs `node scripts/safe-migrate.mjs <env>` and the file mode is 100644, so a shebang bought nothing and cost this module every importer. See N-2.

/**
 * Safe Migration Runner
 * =====================
 * Runs sequelize-cli migrations one at a time, and reports the truth about what
 * happened.
 *
 * CONTRACT (changed 2026-09-20, S1 of the migrations-reconciliation package):
 *
 *   1. A migration's COMPLETION IS NEVER INFERRED FROM ITS ERROR TEXT. A failed
 *      execution is a failure: it is not recorded as applied, and the run does
 *      not continue past it.
 *   2. `SWAN_MIGRATE_ALLOW_FAILURE=1` is REFUSED before any connection is made.
 *      The escape hatch is gone, not merely discouraged — it was the mechanism
 *      that wrote migrations into production's SequelizeMeta whose tables do not
 *      exist, and once recorded there they can never re-run.
 *   3. An unreadable migration history is not an empty one. Only the confirmed
 *      ABSENCE of the metadata relation may be read as "nothing has run"; any
 *      other read error stops the run before a single child is spawned.
 *
 * WHY (Astra A1-01/A1-02/A1-04, 2026-09-20; Rule 86 filing
 * 2026-09-20-172515-ss-pt-migrations-reconciliation-safe-migrate): the previous
 * contract reclassified an "already exists" failure as applied. For a
 * single-operation migration that is benign. For a multi-operation migration it
 * records COMPLETE a migration that stopped at object 3 of 10, and objects 4-10
 * are then never created. The classification was a regex over combined
 * stdout+stderr, so a pattern list was doing schema reasoning it cannot do — and
 * five of its six patterns were measured to be unreachable behind the first.
 *
 * DELIBERATELY NOT BUILT HERE: the adoption path for existing databases. It
 * requires catalog verification (S3/S4), and a flag that marks migrations
 * applied without that verification would recreate this exact defect under a new
 * name. Until it lands, a production re-run of a legitimately-idempotent
 * migration will FAIL the run — loudly, leaving the migration PENDING so it can
 * be fixed. That is the honest state, and it is why this slice must not be
 * deployed independently of catalog reconciliation.
 *
 * Usage:
 *   node scripts/safe-migrate.mjs            # production (uses DATABASE_URL)
 *   node scripts/safe-migrate.mjs development # explicit env
 */

import { spawn } from 'child_process';
import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(backendDir, 'migrations');
const env = process.argv[2] || 'production';

/**
 * STRICT — set SWAN_MIGRATE_STRICT=1 to fail fast at the first failed migration
 * with the full child output. CI / shadow database use (shadow-gate-local.mjs).
 *
 * Its ORIGINAL purpose is gone and must not be restored: STRICT existed to
 * disable the "already exists" reclassification, by making
 * isAlreadyAppliedError() return false. That reclassification no longer exists
 * at all (see the CONTRACT note at the top), so both the default path and STRICT
 * now leave a failed migration PENDING and exit non-zero. The only remaining
 * difference is WHEN the run stops and how much output it prints — a
 * diagnostics choice, not a safety one.
 *
 * Found 2026-08-24 by hostile review (Claude G1/G15; corroborated by Ox Alpha
 * and GLM 5.3): under the OLD default behaviour `npm run migrate:production`
 * exited 0 even when migrations genuinely failed. That is fixed now by removing
 * the reclassification rather than by requiring STRICT.
 */
const STRICT = process.env.SWAN_MIGRATE_STRICT === '1';

/**
 * SWAN_MIGRATE_ALLOW_FAILURE — REFUSED. Retained as a named constant only so the
 * refusal can name the variable the operator actually set.
 *
 * This used to be an emergency escape hatch that marked a failed migration as
 * applied and exited 0. Two of its log lines stated the opposite of what the
 * code did: the warning promised "the run will exit 0" while STRICT exited 1
 * before the branch was reachable, and the final summary claimed failures "were
 * NOT marked as applied" while this branch marked them. A log that misdescribes
 * the code is how the production drift went unnoticed — so the hatch is removed
 * rather than reworded. The refusal lives in main(), BEFORE any connection.
 */
const ALLOW_FAILURE_REQUESTED = process.env.SWAN_MIGRATE_ALLOW_FAILURE === '1';

// REMOVED 2026-09-20 (S1, Astra A1-01): `ALREADY_APPLIED_PATTERNS` and
// `isAlreadyAppliedError()`. A migration's completion is no longer inferred from
// its error text — see the CONTRACT note at the top of this file.
//
// Measured before deletion, so this is not a guess. Over a corpus of six
// representative "already exists" strings, pattern 0 (`/already exists/i`)
// matched five, and patterns 1-5 each added ZERO additional matches. The list
// read as six specific patterns and was in practice one unrestricted pattern
// plus five unreachable siblings — its LENGTH implied a precision it did not
// have. That subsumption is also why "tighten the regexes" was never the fix,
// and why the classification itself had to go.
//
// The old comment here argued the benign reclassification was needed because
// production's populated tables legitimately produce "already exists" on an
// idempotent re-run, and that removing it would make every deploy red. That
// argument is sound about the SYMPTOM and wrong about the cure: the answer is a
// catalog-verified adoption path (S3/S4), not a regex that cannot distinguish
// "object 1 of 10 already existed" from "the migration completed". Until that
// path lands, a production re-run WILL fail the run. That is intended, and it is
// why S1 must not deploy independently of catalog reconciliation.

/** Get a Sequelize connection using the same config as sequelize-cli */
async function getSequelize() {
  if (env === 'production' && process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
      logging: false,
    });
  }
  // For dev/test, load config
  const configPath = path.join(backendDir, 'config', 'config.cjs');
  // eslint-disable-next-line no-eval
  const config = (await import(`file://${configPath}`)).default || require(configPath);
  const c = config[env];
  return new Sequelize(c.database, c.username, c.password, {
    host: c.host,
    port: c.port,
    dialect: c.dialect || 'postgres',
    logging: false,
  });
}

/** Run a single migration via sequelize-cli, capture output */
function runSingleMigration(migrationName) {
  return new Promise((resolve) => {
    const args = [
      'sequelize-cli', 'db:migrate',
      '--config', 'config/config.cjs',
      '--migrations-path', 'migrations',
      '--models-path', 'models',
      '--env', env,
      '--to', migrationName,
    ];

    let stdout = '';
    let stderr = '';

    const proc = spawn('npx', args, {
      cwd: backendDir,
      env: process.env,
      shell: true,
    });

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('exit', code => {
      resolve({ code, stdout, stderr, combined: stdout + stderr });
    });
  });
}

// `markAsCompleted()` REMOVED 2026-09-20 (S1). It was the single write path into
// SequelizeMeta, and every caller used it to record a migration that had FAILED.
// With the error-text reclassification gone there is no sanctioned caller left,
// so it is deleted rather than left as dead code — the adoption path (S3/S4) must
// bring its own recorder, one that writes only after catalog verification.
//
// Pinned by test: `safeMigrateExitCode.test.mjs` asserts there are ZERO
// `markAsCompleted` call sites in this file. (Deliberately NOT written here as a
// literal call, so a grep-based guard cannot match this comment by accident.)

/** The metadata relation the delegated CLI reads and writes. */
const META_TABLE = 'SequelizeMeta';

/**
 * Is this error the CONFIRMED ABSENCE of the metadata relation — as opposed to
 * some other reason the history could not be read?
 *
 * Astra A1-04; this is the highest-impact fix in S1. `getExecutedMigrations`
 * used to `catch {}` and return an empty Set for EVERY error, so a permission
 * failure, a dropped connection, or a malformed metadata table all made the
 * whole history look empty — i.e. all 312 migrations looked pending. Composed
 * with the error-text reclassification, one bad run could re-execute history AND
 * record the resulting failures as applied.
 *
 * The distinction IS the point: "the table does not exist" is a legitimate
 * first-run state; "I could not read the table" is not, and must never be
 * silently treated as "nothing has run".
 */
function isMissingMetadataRelation(err) {
  // Primary signal: PostgreSQL SQLSTATE. `undefined_table` is 42P01, and pg
  // surfaces it on the wrapped driver error. Matching the CODE first keeps this
  // from becoming another error-text classifier — the message check below exists
  // only for drivers that omit the code, and it must name THIS relation, not any
  // "does not exist" text.
  const code = err?.parent?.code ?? err?.original?.code ?? err?.code;
  if (code === '42P01') return true;
  const msg = String(err?.message ?? '');
  return new RegExp(`relation "${META_TABLE}" does not exist`, 'i').test(msg)
    || new RegExp(`no such table: ${META_TABLE}`, 'i').test(msg);
}

/**
 * Read the executed-migration history.
 *
 * Returns a DISCRIMINATED result, never a bare Set — the previous signature made
 * "empty history" and "unreadable history" the same value, which is precisely
 * the defect. Callers MUST handle `ok === false` by stopping before spawning any
 * child process.
 *
 *   { ok: true,  executed: Set<string>, uninitialized?: true }
 *   { ok: false, error: unknown }
 */
async function getExecutedMigrations(seq) {
  try {
    const [rows] = await seq.query(`SELECT name FROM "${META_TABLE}" ORDER BY name`);
    return { ok: true, executed: new Set(rows.map(r => r.name)) };
  } catch (err) {
    if (isMissingMetadataRelation(err)) {
      // Confirmed absence: a genuinely fresh database. Not an error.
      return { ok: true, executed: new Set(), uninitialized: true };
    }
    return { ok: false, error: err };
  }
}

/**
 * Discover every file in backend/migrations/ that LOOKS like a migration,
 * and classify it by whether the delegated runner can actually execute it.
 *
 * H-04 fix (hostile review of the review, 2026-09-18).
 *
 * The original implementation was
 *     fs.readdirSync(migrationsDir).filter(f => f.endsWith('.cjs') || f.endsWith('.js'))
 * which is non-recursive and extension-filtered, so 38 files that look exactly
 * like migrations never ran and were never mentioned. The repo's own
 * shadow-delta-audit.mjs:62-79 documents the mechanism.
 *
 * The ledger's recommended fix was "recurse and include .mjs". That fix is
 * WRONG and would have made things worse, so it is NOT what this does:
 *
 *   This runner delegates each migration to `sequelize-cli db:migrate --to`.
 *   sequelize-cli 6.6.2 resolves migrations with
 *       pattern: /^(?!.*\.d\.ts$).*\.(cjs|js|cts|ts)$/
 *   (node_modules/sequelize-cli/lib/core/migrator.js:52) over a NON-RECURSIVE
 *   glob of the migrations path. So sequelize-cli can never load a `.mjs`
 *   migration, and can never load anything in `migrations/social/`.
 *
 *   Widening only THIS function's filter would therefore have produced 38
 *   "pending" entries that the delegated runner then fails one by one — and
 *   with the H-03 fix now making a failure exit non-zero, every Render deploy
 *   would have gone red reporting 38 migrations it is structurally incapable
 *   of running. The invisibility is the defect; the cure is to make it visible
 *   and to stop a 39th file joining them, not to widen the filter alone.
 *
 * So: report exhaustively, execute exactly what the runner can execute, and
 * let the guard test (migrationDiscovery.test.mjs) fail the build if a new
 * unrunnable file is added.
 */
const EXECUTABLE_EXT = /\.(cjs|js)$/;

/** Files sequelize-cli's own pattern/glob cannot reach. */
function isExecutableByCli(relPath) {
  if (relPath.includes('/') || relPath.includes('\\')) return false; // non-recursive glob
  return EXECUTABLE_EXT.test(relPath);
}

/** Recursively list every candidate migration file, relative to migrationsDir. */
function discoverMigrationFiles(dir = migrationsDir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // `helpers` holds no migrations; skip it so the report stays signal.
      if (entry.name === 'helpers' || entry.name === 'node_modules') continue;
      out.push(...discoverMigrationFiles(path.join(dir, entry.name), rel));
    } else if (/\.(cjs|js|mjs|sql)$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out.sort();
}

/**
 * Returns { executable, inert } — `executable` is what the delegated
 * sequelize-cli run will actually see; `inert` is everything that merely
 * looks like a migration.
 */
function getAllMigrationFiles() {
  const all = discoverMigrationFiles();
  const executable = all.filter(isExecutableByCli);
  const inert = all.filter(f => !isExecutableByCli(f));
  return { all, executable, inert };
}

/** Print the inert set loudly. Silence is what let 38 files accumulate. */
function reportInertMigrations(inert) {
  if (inert.length === 0) return;
  console.error('');
  console.error('=========================================================');
  console.error(`  ${inert.length} INERT MIGRATION FILE(S) — NEVER RUN, NEVER WILL`);
  console.error('=========================================================');
  console.error('  These match the migration naming convention but the delegated');
  console.error('  runner (sequelize-cli 6.6.2) cannot load them: its resolver');
  console.error('  pattern is \\.(cjs|js|cts|ts)$ over a NON-RECURSIVE glob.');
  console.error('  Anything .mjs, or inside a subdirectory, is unreachable.');
  console.error('');
  for (const f of inert) console.error(`    - ${f}`);
  console.error('');
  console.error('  These tables currently exist only because sequelize.sync()');
  console.error('  builds them from models at boot — i.e. the migration system is');
  console.error('  not the schema authority for them. To converge: convert each');
  console.error('  .mjs to a top-level .cjs (or move social/* to the top level with');
  console.error('  unique 14-digit timestamps). Do it deliberately, in a reviewed');
  console.error('  batch — NOT by widening this runner\'s filter, which would only');
  console.error('  produce a deploy that fails on migrations it cannot execute.');
  console.error('=========================================================');
  console.error('');
}

async function main() {
  console.log('Safe Migration Runner');
  console.log('=====================');
  console.log(`Environment: ${env}`);
  console.log(`Migrations dir: ${migrationsDir}\n`);

  // REFUSED BEFORE CONNECTING (S1, Astra A1-02). Deliberately the first thing
  // main() does — before `new Sequelize`, before `authenticate()` — so the
  // operator gets a clear refusal instead of a half-run whose outcome depends on
  // where the connection happened to fail. Exit 2, not 1: this is a usage error,
  // not a migration failure, and a caller that retries on 1 must not retry this.
  if (ALLOW_FAILURE_REQUESTED) {
    console.error('REFUSING TO RUN: SWAN_MIGRATE_ALLOW_FAILURE=1 is set.');
    console.error('');
    console.error('  That flag used to mark failed migrations as applied and exit 0.');
    console.error('  It is REMOVED, not deprecated: recording a migration as applied when');
    console.error('  it did not complete is what wrote production entries into');
    console.error(`  "${META_TABLE}" for tables that do not exist — and once recorded,`);
    console.error('  those migrations can never re-run.');
    console.error('');
    console.error('  There is no override. To adopt an existing database, use the');
    console.error('  catalog-verified adoption path (not yet built; see slices S3/S4).');
    process.exit(2);
  }

  let seq;
  try {
    if (env === 'production' && process.env.DATABASE_URL) {
      seq = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
        logging: false,
      });
    } else {
      // For local dev, import database.mjs.
      // MUST be a file:// URL — a raw Windows path (C:\...\database.mjs) is not a valid ESM
      // specifier, so `import(path.join(...))` threw here on every Windows run. The catch below
      // then reported it as "Database connection failed", which is misleading: it failed to LOAD
      // the module, before any connection was attempted. Production was unaffected (it takes the
      // DATABASE_URL branch above), so this only ever broke local dev on Windows.
      const dbModule = await import(pathToFileURL(path.join(backendDir, 'database.mjs')).href);
      seq = dbModule.default;
    }

    await seq.authenticate();
    console.log('Database connected\n');
  } catch (err) {
    // Distinguish "could not load the module" from "could not reach the database" — reporting a
    // load failure as a connection failure sends whoever hits it debugging the wrong system.
    const isLoadFailure = err instanceof Error
      && /ERR_UNSUPPORTED_ESM_URL_SCHEME|ERR_MODULE_NOT_FOUND|Cannot find module/.test(err.message);
    console.error(
      isLoadFailure ? 'Failed to load database module:' : 'Database connection failed:',
      err.message,
    );
    process.exit(1);
  }

  const { executable, inert } = getAllMigrationFiles();

  // S1 (Astra A1-04): an UNREADABLE history is not an EMPTY one. If the metadata
  // relation exists but cannot be read — permissions, a dropped connection, a
  // malformed table — then `executed` would be empty and EVERY migration would
  // look pending. Stop here, before a single child is spawned. Failing open on a
  // read error is how a bad run re-executes history.
  const history = await getExecutedMigrations(seq);
  if (!history.ok) {
    console.error('CANNOT READ MIGRATION HISTORY — refusing to run.');
    console.error('');
    console.error(`  The query against "${META_TABLE}" failed, and the failure is NOT the`);
    console.error('  confirmed absence of that relation. Treating it as "nothing has run"');
    console.error('  would make every migration look pending and re-execute history.');
    console.error('');
    console.error(`  Error: ${history.error instanceof Error ? history.error.message : String(history.error)}`);
    await seq.close();
    process.exit(1);
  }
  const executed = history.executed;
  if (history.uninitialized) {
    console.log(`Note: "${META_TABLE}" does not exist yet — treating this as a fresh database.`);
  }

  const pending = executable.filter(f => !executed.has(f));

  // H-04: make the orphaned set impossible to miss.
  reportInertMigrations(inert);

  console.log(`Executable migrations: ${executable.length}`);
  console.log(`Inert (unrunnable): ${inert.length}`);
  console.log(`Already executed: ${executed.size}`);
  console.log(`Pending: ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('No pending migrations. All up to date!');
    await seq.close();
    return;
  }

  let applied = 0;
  let failed = 0;
  let firstFailure = null;

  for (const migration of pending) {
    process.stdout.write(`  ${migration} ... `);

    const result = await runSingleMigration(migration);

    if (result.code === 0) {
      console.log('migrated');
      applied++;
    } else {
      // A FAILED EXECUTION IS A FAILURE (S1, Astra A1-01). There is deliberately
      // no reclassification branch here: completion is never inferred from error
      // text, and NOTHING in this file writes to SequelizeMeta any more.
      console.log('FAILED');
      console.error(`    Error: ${result.combined.split('\n').filter(l => l.includes('ERROR')).join('\n    ') || result.combined.slice(-200)}`);
      failed++;
      if (firstFailure === null) firstFailure = migration;
      if (STRICT) {
        console.error('');
        console.error('SWAN_MIGRATE_STRICT=1 — stopping at the first failed migration.');
        console.error(`Failing migration: ${migration}`);
        console.error('--- migration output (last 2000 chars) ---');
        console.error(result.combined.slice(-2000));
        await seq.close();
        process.exit(1);
      }
      // H-03 fix (hostile review seat 3, fixing pass).
      //
      // This used to mark the FAILED migration as applied and let the run exit
      // 0. That is how 9 migrations came to be recorded as applied in
      // production while the tables they create (price_change_logs,
      // CoachSignals) do not exist — they can never re-run.
      //
      // render-start.mjs already treats a migration failure as NON-fatal (it
      // starts the server anyway), so failing here does not block a deploy. It
      // only turns a silently green deploy into an honest one. The migration is
      // left PENDING so it can actually be fixed and re-run.
      //
      // S1 (Astra A1-02): the ALLOW_FAILURE branch that used to live here is
      // GONE. `SWAN_MIGRATE_ALLOW_FAILURE=1` is now refused outright at the top
      // of main(), so this is the ONLY outcome — no path in this file records a
      // failed migration as applied.
      console.log('    (left PENDING — not marked as applied; this run will fail)');

      // M-01 fix (hostile review of the review, 2026-09-18).
      //
      // runSingleMigration() invokes `sequelize-cli db:migrate --to <name>`,
      // and `--to` is NOT a single-migration selector: it applies every
      // pending migration UP TO the target, starting from the first unapplied
      // one. So once migration #1 fails, every later `--to` invocation fails
      // with migration #1's error, and the loop happily reports that identical
      // error N times against N innocent migrations. That is exactly what the
      // §0 production run shows: nine different migrations all reporting
      // `relation "orientations" does not exist`.
      //
      // Continuing is therefore not just noisy, it is actively misleading. Stop
      // at the first genuine failure and name the real culprit once.
      console.error('');
      console.error('  STOPPING: the runner delegates to `sequelize-cli db:migrate --to <name>`,');
      console.error('  and `--to` re-runs the whole pending chain from the first unapplied');
      console.error(`  migration. Every remaining invocation would report ${firstFailure}'s`);
      console.error('  error against an innocent migration, so the rest are NOT evaluated.');
      console.error('  Fix the migration named above, then re-run.');
      console.error('');
      break;
    }
  }

  console.log('\n=====================');
  console.log(`Applied:  ${applied}`);
  console.log(`Failed:   ${failed}`);
  // "Skipped (already existed)" is deliberately ABSENT. There is no longer a path
  // that reports a failed migration as an acceptable outcome, so the counter
  // would always read 0 — and printing it would imply the classification still
  // exists. A line that can only ever say "Skipped: 0" is worse than no line.
  console.log('=====================\n');

  await seq.close();

  if (failed > 0) {
    // H-03: a genuine failure now FAILS THE RUN.
    //
    // render-start.mjs:95-100 treats a migration failure as non-fatal and starts
    // the server anyway, so this does not block a deploy — it stops the deploy
    // log from claiming "Migrations completed successfully" over a migration
    // that did not run. Under STRICT we already exited at the first failure.
    // (This citation is verified, not decorative: safeMigrateExitCode.test.mjs
    //  reads the range out of this comment and asserts the catch is inside it.)
    //
    // S1 (Astra A1-02): the `if (!ALLOW_FAILURE)` guard that used to wrap this
    // exit is gone, together with the flag. A failed migration ALWAYS exits 1.
    console.error(`ERROR: ${failed} migration(s) failed.`);
    console.error('They were NOT marked as applied — fix them and re-run.');
    process.exit(1);
  }
}

// ---- invocation guard (2026-09-20) -----------------------------------------
// This file used to call main() at module scope with NO guard and NO exports,
// which made it UNIMPORTABLE: any `import()` ran the production migration
// runner against whatever DATABASE_URL resolved to. That is the structural
// reason every guard written against this file must assert on its SOURCE TEXT
// (see safeMigrateExitCode.test.mjs) — a limitation of this file's shape, not
// an author's preference.
//
// Astra RT-4/F5 (2026-09-20) asked for the runner's real control flow to be
// executed against intercepted boundaries. That requires the file to be
// importable, which requires this guard.
//
// The check is EXACT (`pathToFileURL`, not a suffix match) so a differently
// cased or symlinked invocation path cannot silently disable migrations. The
// direction of the risk matters: a false negative here would stop migrations
// running in production, which is the very drift class H-07 is about.
const invokedDirectly = Boolean(process.argv[1])
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch(err => {
    console.error('Safe migration runner failed:', err);
    process.exit(1);
  });
}

// Exported so a guard can exercise the real discovery and control flow instead
// of pattern-matching this file's text. Importing is now side-effect free:
// `database.mjs` builds a lazy Sequelize instance and only authenticates inside
// its exported `testConnection()`, which nothing calls at import time.
//
// `isMissingMetadataRelation` is exported for the same reason the others are: it
// is the ONE place that decides whether an unreadable history may be read as an
// empty one, and Astra A1-04's fix requires permission-denied and
// connection-loss to be testable as INDEPENDENT cases. A predicate that can only
// be reached through a live database cannot be tested that way.
export {
  main,
  discoverMigrationFiles,
  isExecutableByCli,
  getAllMigrationFiles,
  isMissingMetadataRelation,
  getExecutedMigrations,
};
