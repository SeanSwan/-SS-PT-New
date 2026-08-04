/**
 * Safe Migration Runner
 * (No shebang: always invoked as `node scripts/safe-migrate.mjs`, and the
 * unit suite imports this module — Vite cannot transform a shebang import.)
 * =====================
 * Runs sequelize-cli migrations one at a time. If a migration fails with an
 * "already exists" error (column, relation, index, constraint, etc.), it marks
 * the migration as completed in SequelizeMeta and continues to the next one.
 *
 * This solves the mismatch between Sequelize sync({ alter: true }) — which
 * applies schema changes at boot — and the migration system, which expects
 * to be the sole schema manager.
 *
 * QUARANTINE LEDGER (SWA-115, 2026-08-03): a GENUINE schema failure is no
 * longer silently absorbed. It is still marked done (unmarking would wedge
 * sequelize-cli's `--to` pipeline behind it), but it is also recorded in the
 * migration_quarantine table, re-armed (meta row deleted) and retried on every
 * subsequent run until it succeeds or hits the attempt cap (default 5, env
 * SAFE_MIGRATE_MAX_QUARANTINE_ATTEMPTS). Capped entries are PARKED but shouted
 * on every run until resolved. DATA-CRITICAL failures keep their own stricter
 * lane: never marked done, halt the remainder.
 *
 * Usage:
 *   node scripts/safe-migrate.mjs            # production (uses DATABASE_URL)
 *   node scripts/safe-migrate.mjs development # explicit env
 *   node scripts/safe-migrate.mjs production --retry-quarantined  # re-arm PARKED entries too
 */

import { spawn } from 'child_process';
import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(backendDir, 'migrations');
// Flags (e.g. --retry-quarantined) must not be mistaken for the env positional.
const env = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'production';

export {
  isAlreadyAppliedError,
  isStructuralAlreadyExistsError,
  isDataCriticalMigration,
} from './safe-migrate-lanes.mjs';
import {
  isAlreadyAppliedError,
  isStructuralAlreadyExistsError,
  isDataCriticalMigration,
} from './safe-migrate-lanes.mjs';

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

/** Mark a migration as completed in SequelizeMeta */
async function markAsCompleted(seq, name) {
  await seq.query(
    `INSERT INTO "SequelizeMeta" (name) VALUES (:name) ON CONFLICT DO NOTHING`,
    { replacements: { name } }
  );
}

// ---------------------------------------------------------------------------
// Quarantine ledger (SWA-115 / Kimi H1 redesign, 2026-08-03)
// A genuinely-failed schema migration is marked done in SequelizeMeta (so the
// sequelize-cli `--to` pipeline is never wedged behind it) but ALSO recorded
// here. At the start of every run, ledger entries under the attempt cap get
// their SequelizeMeta row deleted ("re-armed") and are retried. Entries at the
// cap stop retrying but are reported loudly on every run until a human
// resolves them (fix + `--retry-quarantined`, or manual reconciliation).
// ---------------------------------------------------------------------------
const MAX_QUARANTINE_ATTEMPTS =
  parseInt(process.env.SAFE_MIGRATE_MAX_QUARANTINE_ATTEMPTS, 10) || 5;
const RETRY_QUARANTINED = process.argv.includes('--retry-quarantined');

async function ensureQuarantineTable(seq) {
  await seq.query(`
    CREATE TABLE IF NOT EXISTS migration_quarantine (
      name TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 1,
      first_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_error TEXT
    )
  `);
}

async function getQuarantineLedger(seq) {
  const [rows] = await seq.query(
    `SELECT name, attempts, last_error FROM migration_quarantine ORDER BY name`
  );
  return rows;
}

/** Re-arm eligible quarantined migrations: delete their SequelizeMeta row so
 *  they become pending again this run. Returns the re-armed names. */
async function rearmQuarantined(seq, ledger) {
  const eligible = ledger.filter(
    r => RETRY_QUARANTINED || r.attempts < MAX_QUARANTINE_ATTEMPTS
  );
  for (const row of eligible) {
    await seq.query(`DELETE FROM "SequelizeMeta" WHERE name = :name`, {
      replacements: { name: row.name },
    });
  }
  return eligible.map(r => r.name);
}

async function recordQuarantine(seq, name, errorText) {
  await seq.query(
    `INSERT INTO migration_quarantine (name, attempts, first_failed_at, last_attempt_at, last_error)
     VALUES (:name, 1, NOW(), NOW(), :err)
     ON CONFLICT (name) DO UPDATE
       SET attempts = migration_quarantine.attempts + 1,
           last_attempt_at = NOW(),
           last_error = :err`,
    { replacements: { name, err: String(errorText).slice(0, 4000) } }
  );
}

async function clearQuarantine(seq, names) {
  if (!names.length) return;
  await seq.query(`DELETE FROM migration_quarantine WHERE name = ANY(ARRAY[:names])`, {
    replacements: { names },
  });
}

/** Get list of already-executed migration names */
async function getExecutedMigrations(seq) {
  try {
    const [rows] = await seq.query(`SELECT name FROM "SequelizeMeta" ORDER BY name`);
    return new Set(rows.map(r => r.name));
  } catch {
    // Table might not exist yet
    return new Set();
  }
}

/** Get all migration filenames sorted */
function getAllMigrationFiles() {
  const all = fs.readdirSync(migrationsDir);
  // ⚠ KNOWN GAP (drift audit 2026-08-03): .mjs migrations are INVISIBLE to this runner.
  // sequelize-cli (which runMigration shells out to) cannot load ESM .mjs files, so they
  // are deliberately excluded rather than fed to a runner that would fail them and let the
  // mark-done lane poison SequelizeMeta. Consequence already observed in production: the
  // marketing-calendar and native-social-publishing .mjs migrations never applied (their
  // tables are now backfilled via utils/tableCreationOrder.mjs PHASE 13). Any NEW migration
  // must be .cjs. The warning below makes the invisible backlog loud on every deploy.
  const invisible = all.filter(f => f.endsWith('.mjs'));
  if (invisible.length > 0) {
    console.warn(
      `⚠ safe-migrate: ${invisible.length} .mjs migration(s) exist that this runner CANNOT execute ` +
      `(sequelize-cli has no ESM support). They will never apply in production. ` +
      `Convert to .cjs or cover via startup mechanisms: ${invisible.join(', ')}`
    );
  }
  return all
    .filter(f => f.endsWith('.cjs') || f.endsWith('.js'))
    .sort();
}

/**
 * Run every pending migration through the four-lane policy:
 *  - exit 0                          -> applied (clears any quarantine record)
 *  - already-exists class failure    -> mark done, continue (legacy skip lane;
 *    DATA-CRITICAL files only skip on STRUCTURAL already-exists errors — FK
 *    violations / duplicate keys are plausible genuine backfill failures)
 *  - genuine failure, schema lane    -> mark done AND QUARANTINE (SWA-115 /
 *    Kimi H1 redesign 2026-08-03). Marking done is FUNCTIONAL, not cosmetic:
 *    sequelize-cli `--to X` re-runs everything still pending before X, so an
 *    unmarked failure would wedge every later migration behind it forever.
 *    The quarantine ledger is the antidote to the old silent poison: at the
 *    START of each run, quarantined names under the attempt cap get their
 *    SequelizeMeta row deleted (re-armed) and are retried; every run reports
 *    the standing ledger loudly. Nothing genuinely failed is silent anymore.
 *  - genuine failure, DATA-CRITICAL  -> never mark done, HALT remaining
 *    migrations (they may depend on this data), report for retry next deploy
 */
export async function processPendingMigrations({ pending, runMigration, markCompleted, quarantine = async () => {}, logger = console }) {
  const summary = {
    applied: 0, skipped: 0, failed: 0,
    quarantined: [], resolvedNames: [],
    dataCriticalFailures: [], halted: false, haltedRemaining: [],
  };

  for (const [index, migration] of pending.entries()) {
    // Log BEFORE running so a hanging migration is identifiable in deploy logs.
    logger.log(`  ${migration} ... running`);
    const result = await runMigration(migration);
    const dataCritical = isDataCriticalMigration(migration);

    if (result.code === 0) {
      logger.log(`  ${migration} ... migrated`);
      summary.applied++;
      summary.resolvedNames.push(migration);
      continue;
    }

    const skipEligible = dataCritical
      ? isStructuralAlreadyExistsError(result.combined)
      : isAlreadyAppliedError(result.combined);
    if (skipEligible) {
      await markCompleted(migration);
      logger.log(`  ${migration} ... already applied (marked as done)`);
      summary.skipped++;
      summary.resolvedNames.push(migration);
      continue;
    }

    const errorLines = result.combined.split('\n').filter(l => l.includes('ERROR')).join('\n    ')
      || result.combined.slice(-200);
    summary.failed++;

    if (dataCritical) {
      logger.log(`  ${migration} ... FAILED (DATA-CRITICAL)`);
      logger.error(`    Error: ${errorLines}`);
      logger.error('    DATA-CRITICAL migration NOT marked as done — it stays pending and');
      logger.error('    will retry on the next deploy. Remaining migrations are HALTED');
      logger.error('    because they may depend on this data.');
      summary.dataCriticalFailures.push(migration);
      summary.halted = true;
      summary.haltedRemaining = pending.slice(index + 1);
      if (summary.haltedRemaining.length > 0) {
        logger.error(`    Halted without attempting: ${summary.haltedRemaining.join(', ')}`);
      }
      break;
    }

    logger.log(`  ${migration} ... FAILED (QUARANTINED)`);
    logger.error(`    Error: ${errorLines}`);
    // Schema lane (SWA-115 redesign): mark done so sequelize-cli's `--to`
    // pipeline is not wedged behind this failure, AND record it in the
    // quarantine ledger so it is re-armed and retried next run instead of
    // being silently forgotten (the old behavior poisoned SequelizeMeta —
    // achievement_crystallizations was lost this way for weeks).
    await markCompleted(migration);
    await quarantine(migration, errorLines);
    summary.quarantined.push(migration);
    logger.log('    (marked done to keep the pipeline moving; QUARANTINED for retry next deploy)');
  }

  return summary;
}

async function main() {
  console.log('Safe Migration Runner');
  console.log('=====================');
  console.log(`Environment: ${env}`);
  console.log(`Migrations dir: ${migrationsDir}\n`);

  let seq;
  try {
    if (env === 'production' && process.env.DATABASE_URL) {
      seq = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
        logging: false,
      });
    } else {
      // For local dev, import database.mjs
      const dbModule = await import(path.join(backendDir, 'database.mjs'));
      seq = dbModule.default;
    }

    await seq.authenticate();
    console.log('Database connected\n');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  await ensureQuarantineTable(seq);
  const ledger = await getQuarantineLedger(seq);
  const rearmed = await rearmQuarantined(seq, ledger);
  const parked = ledger.filter(r => !rearmed.includes(r.name));
  if (rearmed.length > 0) {
    console.log(`Quarantine: re-armed ${rearmed.length} previously-failed migration(s) for retry:`);
    for (const n of rearmed) console.log(`  - ${n}`);
    console.log('');
  }
  if (parked.length > 0) {
    console.error(`⚠ Quarantine: ${parked.length} migration(s) hit the ${MAX_QUARANTINE_ATTEMPTS}-attempt cap and are PARKED`);
    console.error('  (still marked done so the pipeline moves; NOT retried). Resolve manually,');
    console.error('  then re-run with --retry-quarantined:');
    for (const r of parked) console.error(`  - ${r.name} (attempts: ${r.attempts})`);
    console.error('');
  }

  const allFiles = getAllMigrationFiles();
  const executed = await getExecutedMigrations(seq);
  const pending = allFiles.filter(f => !executed.has(f));

  console.log(`Total migrations: ${allFiles.length}`);
  console.log(`Already executed: ${executed.size}`);
  console.log(`Pending: ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('No pending migrations. All up to date!');
    await seq.close();
    return;
  }

  const summary = await processPendingMigrations({
    pending,
    runMigration: runSingleMigration,
    markCompleted: (name) => markAsCompleted(seq, name),
    quarantine: (name, err) => recordQuarantine(seq, name, err),
    logger: console,
  });

  // A migration that applied or proved already-applied is resolved — drop its ledger row.
  await clearQuarantine(seq, summary.resolvedNames);

  console.log('\n=====================');
  console.log(`Applied:      ${summary.applied}`);
  console.log(`Skipped:      ${summary.skipped} (already existed)`);
  console.log(`Failed:       ${summary.failed}`);
  console.log(`Quarantined:  ${summary.quarantined.length} (will retry next deploy, cap ${MAX_QUARANTINE_ATTEMPTS})`);
  console.log('=====================\n');

  const finalLedger = await getQuarantineLedger(seq);
  if (finalLedger.length > 0) {
    console.error('⚠ QUARANTINE LEDGER (genuinely-failed migrations — none of these are silent):');
    for (const r of finalLedger) {
      console.error(`  - ${r.name} (attempts: ${r.attempts}/${MAX_QUARANTINE_ATTEMPTS})`);
    }
    console.error('');
  }

  await seq.close();

  if (summary.dataCriticalFailures.length > 0) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!! DATA-CRITICAL MIGRATION FAILURE — NOT marked done, will retry  !!');
    console.error('!! on every deploy until it succeeds or is fixed:                 !!');
    for (const name of summary.dataCriticalFailures) {
      console.error(`!!   ${name}`);
    }
    console.error('!! Later pending migrations were HALTED this run.                 !!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    process.exit(1);
  }

  if (summary.failed > 0) {
    console.log('WARNING: Some schema migrations had genuine failures. They are QUARANTINED');
    console.log('(marked done to keep the pipeline moving, but re-armed and retried on the');
    console.log(`next deploy, up to ${MAX_QUARANTINE_ATTEMPTS} attempts). See the ledger above.`);
  }
}

// Import guard: tests import the helpers above without running the CLI.
// realpathSync both sides — through a directory junction/symlink,
// import.meta.url is realpath'd while argv[1] keeps the link path; without
// normalization the guard is silently FALSE and all migrations no-op.
const resolveRealHref = (p) => {
  try {
    return pathToFileURL(fs.realpathSync(path.resolve(p))).href;
  } catch {
    return pathToFileURL(path.resolve(p)).href;
  }
};
const isMainModule = process.argv[1]
  && resolveRealHref(fileURLToPath(import.meta.url)) === resolveRealHref(process.argv[1]);

if (isMainModule) {
  main().catch(err => {
    console.error('Safe migration runner failed:', err);
    process.exit(1);
  });
} else if (process.argv[1] && /safe-migrate\.mjs$/i.test(process.argv[1])) {
  // Someone invoked this file as a CLI but the guard didn't match — never
  // fail silently (a no-op here means "migrations stopped running").
  console.error('[safe-migrate] import-guard mismatch: CLI invocation did not match module URL — refusing to no-op silently.');
  process.exit(1);
}
