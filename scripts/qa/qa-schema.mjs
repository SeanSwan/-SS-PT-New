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
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const { default: sequelize } = await import(pathToFileURL(path.join(repoRoot, 'backend', 'database.mjs')).href);

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

const { default: getModels } = await import(pathToFileURL(path.join(repoRoot, 'backend', 'models', 'associations.mjs')).href);
const models = await getModels();

// The registry is not the whole truth. Several model families (SocialGroup,
// Hashtag/Faction/Party, NutritionSourceRecord) are db.define'd during import
// but never placed in the registry — runtime code reaches them by direct file
// import instead. They still land in sequelize.models, so sweep that too (the
// same discovery the drift auditor uses). Without this, QA sync skipped their
// tables and SocialPosts/SocialComments/daily_macro_logs failed on missing
// relations that production actually has.
// NOTE deliberately NOT "fixed" by registering them in associations.mjs: the
// direct-import path already defines their associations, and re-registering
// risks duplicate-alias errors at boot. Registry unification is a baseline-
// slice concern, filed on SWA-157.
// Some models are imported ONLY by their service (NutritionSourceRecord) — no
// transitive path from the registry defines them. A hardcoded list of such files
// would be the same enumeration disease this session keeps finding, so import
// every model file under models/ instead. QA-only tooling: per-file try/catch,
// failures reported not fatal (some files are type/helper modules, not models).
// Snapshot BEFORE the glob: everything the app's own import graph defines is
// runtime-reachable and holds the exit code. (Service-only imports like
// NutritionSourceRecord land in the glob tier — acceptable: only the tier label
// differs, the table still gets created, and anything runtime-reachable that
// DEPENDS on it, like daily_macro_logs, is still fatal on failure.)
const preGlobDefined = new Set(Object.values(sequelize.models));
const { readdirSync, statSync } = await import('node:fs');
const modelsDir = path.join(repoRoot, 'backend', 'models');
const importFailures = [];
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const full = path.join(dir, f);
  if (statSync(full).isDirectory()) return walk(full);
  return /\.mjs$/.test(f) ? [full] : [];
});
for (const file of walk(modelsDir)) {
  try {
    await import(pathToFileURL(file).href);
  } catch (error) {
    importFailures.push(`${path.relative(modelsDir, file)}: ${String(error.message).split('\n')[0].slice(0, 90)}`);
  }
}
if (importFailures.length) {
  console.log(`note: ${importFailures.length} model-dir file(s) failed to import (helpers or broken):`);
  for (const f of importFailures.slice(0, 8)) console.log(`  ${f}`);
}

const registered = new Set(Object.values(models));
for (const m of Object.values(sequelize.models)) {
  if (!registered.has(m)) models['unregistered::' + m.name] = m;
}
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

    // BUG-2 (Kimi 2026-08-13): "196 tables" proves PRESENCE, not shape.
    // model.sync() on an existing table with wrong columns succeeds silently —
    // the indexes-that-never-existed class, one level up. So verify compares
    // every import-graph model's declared columns against the live table and
    // fails on gaps. Upgrade 3 from the same review: the sentinel check now
    // reads the ROW, reusing qa-db's positive-identity primitive — an empty
    // table anyone created is no longer proof of anything.
    const [{ marker } = {}] = (await sequelize.query(
      `SELECT marker FROM swan_qa_sentinel LIMIT 1`,
    ).then(([r]) => r).catch(() => []));
    if (marker !== 'SWAN-QA-DISPOSABLE-DATABASE') {
      console.error(`SENTINEL CONTENT WRONG: ${JSON.stringify(marker)} — not a bootstrapped QA database`);
      process.exitCode = 1;
    }

    const [allCols] = await sequelize.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
    );
    const colsByTable = new Map();
    for (const r of allCols) {
      if (!colsByTable.has(r.table_name)) colsByTable.set(r.table_name, new Set());
      colsByTable.get(r.table_name).add(r.column_name);
    }
    let columnGaps = 0;
    for (const model of Object.values(models)) {
      if (!model?.getTableName || !model.rawAttributes) continue;
      const table = String(model.getTableName()).replace(/"/g, '');
      const live = colsByTable.get(table);
      if (!live) continue; // table-level absence is already reported elsewhere
      const missing = Object.entries(model.rawAttributes)
        .map(([attr, def]) => def.field || attr)
        .filter((col) => !live.has(col));
      if (missing.length) {
        columnGaps += missing.length;
        console.error(`  COLUMN GAP ${table}: ${missing.join(', ')}`);
      }
    }
    console.log(`column-level check: ${columnGaps === 0 ? 'CLEAN' : columnGaps + ' missing column(s)'} across ${colsByTable.size} tables`);
    if (columnGaps > 0) process.exitCode = 1;
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

    // Upgrade 2 (Kimi 2026-08-13): a machine-readable manifest, so the next tool
    // in the chain (the write-lane runner) asserts schema completeness from JSON
    // instead of parsing prose — or worse, not checking at all.
    const { writeFileSync } = await import('node:fs');
    const manifestPath = path.join(repoRoot, 'scripts', 'qa', '.qa-schema-manifest.json');
    writeFileSync(manifestPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      mode,
      models: unique.size,
      passes,
      tables: rows[0].tables,
      results: [...unique.values()].map((m) => ({
        table: m.tableName,
        tier: preGlobDefined.has(m) ? 'import-graph' : 'glob-only',
        status: pending.includes(m) ? 'FAILED' : 'created',
        error: pending.includes(m) ? lastErrors.get(m.tableName) : undefined,
      })),
    }, null, 2));
    console.log(`manifest: ${manifestPath}`);

    if (pending.length > 0) {
      // Two tiers. Runtime-reachable models (the registry plus everything the
      // app's own import graph defines) hold the exit code: a partial schema
      // there must fail loudly, or the write lane fails later with a confusing
      // error. Glob-only discoveries include dormant families (LiveStream,
      // SocialProducts, Analytics) full of rule-58 FK-type defects that have
      // never loaded at runtime — reported, filed, but a graveyard of dead
      // files does not get to hold the live QA lane hostage.
      const fatal = pending.filter((m) => preGlobDefined.has(m));
      const dormant = pending.filter((m) => !preGlobDefined.has(m));
      if (fatal.length) {
        console.error(`\n${fatal.length} model(s) reachable via the associations import graph could not be created (FATAL):`);
        for (const model of fatal) console.error(`  ${model.tableName}: ${lastErrors.get(model.tableName)}`);
        process.exitCode = 1;
      }
      if (dormant.length) {
        console.log(`\nnote: ${dormant.length} dormant (glob-only) model(s) failed — filed, not fatal:`);
        for (const model of dormant) console.log(`  ${model.tableName}: ${lastErrors.get(model.tableName)}`);
      }
    }
  }
} catch (error) {
  console.error(`FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
