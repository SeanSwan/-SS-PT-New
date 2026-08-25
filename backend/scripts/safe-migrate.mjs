#!/usr/bin/env node

/**
 * Safe Migration Runner
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

/**
 * STRICT MODE — set SWAN_MIGRATE_STRICT=1. CI / shadow database only.
 *
 * Production behaviour is UNCHANGED when this is unset. This runner is
 * deliberately RECOVERY-oriented: it reclassifies "already exists" failures as
 * applied and marks genuine failures done, so one bad migration cannot wedge
 * every future deploy. That is the right trade for a live deploy and exactly
 * the wrong one for a gate.
 *
 * Found 2026-08-24 by hostile review (Claude G1/G15; corroborated by Ox Alpha
 * and GLM 5.3): under the default behaviour `npm run migrate:production` exits
 * 0 even when migrations genuinely fail — this file contains exactly two
 * process.exit(1) calls and neither is reachable from failed > 0. Both steps
 * the shadow workflow labels "THE ACTUAL GATE" were therefore structurally
 * incapable of failing on a broken migration.
 *
 * Worse, ALREADY_APPLIED_PATTERNS swallows `duplicate key value` and
 * `violates foreign key constraint` — precisely the errors a migration raises
 * when it meets POPULATED tables, which is the entire reason the shadow
 * database is seeded. On a database created empty seconds earlier nothing can
 * legitimately "already exist", so there every match hides a real defect.
 */
const STRICT = process.env.SWAN_MIGRATE_STRICT === '1';

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

function isAlreadyAppliedError(stderr) {
  // See STRICT above: on a freshly created shadow database nothing can already
  // exist, so every one of these patterns would be concealing a real failure.
  if (STRICT) return false;
  return ALREADY_APPLIED_PATTERNS.some(p => p.test(stderr));
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

  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const migration of pending) {
    process.stdout.write(`  ${migration} ... `);

    const result = await runSingleMigration(migration);

    if (result.code === 0) {
      console.log('migrated');
      applied++;
    } else if (isAlreadyAppliedError(result.combined)) {
      // Migration failed because changes already exist — mark as done
      await markAsCompleted(seq, migration);
      console.log('already applied (marked as done)');
      skipped++;
    } else {
      // Genuine failure — log it but continue
      console.log('FAILED');
      console.error(`    Error: ${result.combined.split('\n').filter(l => l.includes('ERROR')).join('\n    ') || result.combined.slice(-200)}`);
      failed++;
      if (STRICT) {
        console.error('');
        console.error('SWAN_MIGRATE_STRICT=1 — refusing to mark a failed migration as applied.');
        console.error(`Failing migration: ${migration}`);
        console.error('--- migration output (last 2000 chars) ---');
        console.error(result.combined.slice(-2000));
        await seq.close();
        process.exit(1);
      }
      // Mark as done anyway to prevent blocking future deploys
      // The server uses sync({ alter: true }) which handles the schema
      await markAsCompleted(seq, migration);
      console.log('    (marked as done to prevent blocking — sync will handle schema)');
    }
  }

  console.log('\n=====================');
  console.log(`Applied:  ${applied}`);
  console.log(`Skipped:  ${skipped} (already existed)`);
  console.log(`Failed:   ${failed} (marked done, sync handles schema)`);
  console.log('=====================\n');

  await seq.close();

  if (failed > 0) {
    // Unreachable under STRICT (E3 exits at the first failure) — kept so that any
    // future path incrementing `failed` without exiting still cannot go green.
    // A guard that depends on a single call site is not a guard.
    if (STRICT) { console.error('SWAN_MIGRATE_STRICT=1 — failing the run.'); process.exit(1); }
    console.log('WARNING: Some migrations had genuine failures.');
    console.log('The server sync({ alter: true }) should handle these, but review the errors above.');
  }
}

main().catch(err => {
  console.error('Safe migration runner failed:', err);
  process.exit(1);
});
