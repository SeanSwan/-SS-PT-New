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

// "Already exists" patterns that indicate the migration was already applied
const ALREADY_APPLIED_PATTERNS = [
  /already exists/i,
  /duplicate key value/i,
  /relation .+ already exists/i,
  /column .+ of relation .+ already exists/i,
  /index .+ already exists/i,
  /constraint .+ already exists/i,
  /type .+ already exists/i,
  /violates foreign key constraint/i, // FK refs existing data = table was already set up
];

export function isAlreadyAppliedError(stderr) {
  return ALREADY_APPLIED_PATTERNS.some(p => p.test(stderr));
}

// DATA-CRITICAL LANE (2026-07-16 hostile-review fix). Data migrations
// (backfills, repairs) must be fail-closed: a genuine failure may NEVER be
// recorded as applied — the invalid rows would persist silently forever,
// because sync({ alter: true }) never runs in production and SequelizeMeta
// says "done". Name a migration with "backfill" or "data-critical" to opt in.
const DATA_CRITICAL_PATTERN = /backfill|data-critical/i;

export function isDataCriticalMigration(name) {
  return DATA_CRITICAL_PATTERN.test(String(name || ''));
}

/**
 * Run every pending migration through the three-lane policy:
 *  - exit 0                          -> applied
 *  - already-exists class failure    -> mark done, continue (legacy skip lane)
 *  - genuine failure, schema lane    -> mark done, continue (legacy behavior,
 *    deliberately unchanged: blocking boot on schema drift caused the
 *    crash-loop incidents this runner exists to prevent)
 *  - genuine failure, DATA-CRITICAL  -> never mark done, HALT remaining
 *    migrations (they may depend on this data), report for retry next deploy
 */
export async function processPendingMigrations({ pending, runMigration, markCompleted, logger = console }) {
  const summary = {
    applied: 0, skipped: 0, failed: 0,
    dataCriticalFailures: [], halted: false, haltedRemaining: [],
  };

  for (const [index, migration] of pending.entries()) {
    const result = await runMigration(migration);

    if (result.code === 0) {
      logger.log(`  ${migration} ... migrated`);
      summary.applied++;
      continue;
    }

    if (isAlreadyAppliedError(result.combined)) {
      await markCompleted(migration);
      logger.log(`  ${migration} ... already applied (marked as done)`);
      summary.skipped++;
      continue;
    }

    const errorLines = result.combined.split('\n').filter(l => l.includes('ERROR')).join('\n    ')
      || result.combined.slice(-200);
    summary.failed++;

    if (isDataCriticalMigration(migration)) {
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

    logger.log(`  ${migration} ... FAILED`);
    logger.error(`    Error: ${errorLines}`);
    // Legacy schema lane: mark as done to prevent blocking future deploys.
    // (Historical rationale cited sync({ alter: true }); that sync is gated
    // off in production — kept ONLY for schema files to avoid re-run loops.)
    await markCompleted(migration);
    logger.log('    (schema lane: marked as done to prevent blocking)');
  }

  return summary;
}

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
  return fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.cjs') || f.endsWith('.js'))
    .sort();
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
    logger: console,
  });

  console.log('\n=====================');
  console.log(`Applied:  ${summary.applied}`);
  console.log(`Skipped:  ${summary.skipped} (already existed)`);
  console.log(`Failed:   ${summary.failed}`);
  console.log('=====================\n');

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
    console.log('WARNING: Some schema migrations had genuine failures (marked done — legacy lane).');
    console.log('Review the errors above and reconcile the schema manually if needed.');
  }
}

// Import guard: tests import the helpers above without running the CLI.
const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  main().catch(err => {
    console.error('Safe migration runner failed:', err);
    process.exit(1);
  });
}
