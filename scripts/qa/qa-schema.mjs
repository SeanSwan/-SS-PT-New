#!/usr/bin/env node
/**
 * SCRIPT: Build the QA schema from the Sequelize models.
 * PURPOSE: Create every table the application expects, in the disposable QA DB.
 * SAFETY: Refuses unless scripts/qa/qa-db.mjs's sentinel proves the target is
 *         disposable. This calls sequelize.sync(), which CREATES AND DROPS
 *         TABLES — pointing it anywhere real would be catastrophic.
 *
 * WHY NOT MIGRATIONS (discovered 2026-08-12):
 * The migration chain CANNOT build a schema from an empty database. There are
 * 367 migrations and not one of them creates `Users`, `orientations`, or
 * `WorkoutSessions` — the first migration in filename order immediately fails
 * with `relation "orientations" does not exist`. The history is incremental-only
 * and assumes a pre-existing schema that no migration in the repo produces.
 *
 * That is a real finding about the repo, not a QA-harness problem: no fresh
 * environment can be built from migrations, which also means migrations alone
 * cannot rebuild production. It is filed rather than fixed here — repairing a
 * 367-migration chain is its own project.
 *
 * WHAT THIS MEANS FOR THE WRITE LANE — state this limitation whenever citing it:
 * The QA schema is derived from the MODELS, so these tests prove "the code works
 * against the schema the models declare". They do NOT prove "the code works
 * against production's actual schema". CLAUDE.md rule 58 exists precisely because
 * those two drift apart. A model-derived schema is still the right target for
 * testing application code — the app reaches the database through these models —
 * but it cannot catch production drift, and nothing here should imply it does.
 *
 * USAGE:
 *   node scripts/qa/qa-schema.mjs build     # sync all models (additive)
 *   node scripts/qa/qa-schema.mjs rebuild   # DROP everything, then sync
 *   node scripts/qa/qa-schema.mjs verify    # report table count + key tables
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const guard = path.join(repoRoot, 'scripts', 'qa', 'qa-db.mjs');

/** Never touch the database until the sentinel guard has passed. */
function assertSafe() {
  const result = spawnSync(process.execPath, [guard, 'assert'], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('REFUSED: qa-db.mjs assert did not pass — not building a schema here.');
    process.exit(1);
  }
}

const mode = process.argv[2] || 'build';
if (!['build', 'rebuild', 'verify'].includes(mode)) {
  console.error('usage: node scripts/qa/qa-schema.mjs <build|rebuild|verify>');
  process.exit(1);
}

assertSafe();

// Point the application's own database layer at the QA container BEFORE any
// backend module loads, since backend/database.mjs reads env at import time.
const host = process.env.SWAN_QA_DB_HOST || '127.0.0.1';
const port = process.env.SWAN_QA_DB_PORT || '15433';
const user = process.env.SWAN_QA_DB_USER || 'swan_qa';
const name = process.env.SWAN_QA_DB_NAME || 'swan_qa';
const pass = process.env.SWAN_QA_DB_PASSWORD || 'swan_qa_local_only';

process.env.NODE_ENV = 'development';       // avoid the production SSL branch
process.env.PG_HOST = host;
process.env.PG_PORT = String(port);
process.env.PG_USER = user;
process.env.PG_DB = name;
process.env.PG_PASSWORD = pass;
process.env.DATABASE_URL = '';              // must not win over the PG_* vars

const { default: sequelize } = await import(`file://${path.join(repoRoot, 'backend', 'database.mjs')}`);

// Belt and braces: confirm the ORM actually landed on the QA container. A config
// precedence surprise here would mean syncing models over a real database.
const cfg = sequelize.config;
if (String(cfg.port) !== String(port) || !['127.0.0.1', 'localhost'].includes(cfg.host)) {
  console.error(
    `REFUSED: Sequelize resolved to ${cfg.host}:${cfg.port}, not the QA container `
    + `at ${host}:${port}. Something overrode the connection settings.`,
  );
  process.exit(1);
}

const { default: getModels } = await import(`file://${path.join(repoRoot, 'backend', 'models', 'associations.mjs')}`);
const models = await getModels();
const modelCount = Object.keys(models).length;

try {
  if (mode === 'verify') {
    const [rows] = await sequelize.query(`
      SELECT count(*)::int AS tables FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    // Table names are NOT uniformly cased in this schema: `Users` is quoted
    // PascalCase while the workout tables are snake_case. Checking for
    // "WorkoutSessions" reported a missing table that was present all along as
    // workout_sessions — a verifier that lies is worse than no verifier.
    const [core] = await sequelize.query(`
      SELECT
        to_regclass('public."Users"')              IS NOT NULL AS users,
        to_regclass('public.workout_sessions')     IS NOT NULL AS workout_sessions,
        to_regclass('public.daily_workout_forms')  IS NOT NULL AS daily_workout_forms,
        to_regclass('public.swan_qa_sentinel')     IS NOT NULL AS sentinel
    `);
    console.log(`models registered : ${modelCount}`);
    console.log(`tables in public  : ${rows[0].tables}`);
    console.log(`core tables       : ${JSON.stringify(core[0])}`);
  } else {
    // sequelize.sync() creates tables in registration order and does NOT fully
    // topologically sort them: `challenge_submissions` references `challenges`
    // and failed with "relation does not exist" even though both models are
    // registered. Rather than hand-maintain a dependency list that silently rots,
    // sync model-by-model and keep retrying the failures until a full pass makes
    // no further progress — convergence resolves the order whatever it is.
    const unique = new Map();
    for (const model of Object.values(models)) {
      if (model && typeof model.sync === 'function' && model.tableName) {
        unique.set(model.tableName, model);
      }
    }

    let pending = [...unique.values()];
    let lastErrors = new Map();
    let previousCount = Infinity;
    let passes = 0;

    while (pending.length > 0 && pending.length < previousCount) {
      previousCount = pending.length;
      passes += 1;
      const stillPending = [];
      lastErrors = new Map();
      for (const model of pending) {
        try {
          await model.sync({ force: mode === 'rebuild' });
        } catch (error) {
          lastErrors.set(model.tableName, error.message.split('\n')[0]);
          stillPending.push(model);
        }
      }
      pending = stillPending;
    }

    const [rows] = await sequelize.query(`
      SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema = 'public'
    `);
    console.log(`schema ${mode}: ${unique.size} models, ${passes} pass(es) -> ${rows[0].tables} tables`);

    if (pending.length > 0) {
      // Never report a partial schema as success: the write lane would then fail
      // later with a confusing error instead of here with an accurate one.
      console.error(`\n${pending.length} model(s) could not be created:`);
      for (const model of pending) {
        console.error(`  ${model.tableName}: ${lastErrors.get(model.tableName)}`);
      }
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(`FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
