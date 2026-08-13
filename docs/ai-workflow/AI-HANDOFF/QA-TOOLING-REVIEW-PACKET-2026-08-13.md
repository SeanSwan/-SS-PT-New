# Hostile review + upgrade pass — the schema-drift response tooling

**Reviewer:** Kimi K3. **Author:** Fable 5 session. **Date:** 2026-08-13.
**Owner directive (verbatim intent):** hostile review of all of it, PLUS "enhancements, upgrades
anywhere that it feels that it should be done. Upgraded logic, etcetera." Loop fixes until dry.

## 0. What I need from you

1. **VERDICT** per file: STRONG / SHIP-WITH-CHANGES / SEND-BACK.
2. **Correctness bugs first**, most severe first — name the function and construct.
3. **UPGRADES, explicitly wanted:** where is the LOGIC weaker than it should be? Better
   algorithms, missing checks that would catch real failure classes, sharper failure modes,
   structural simplifications. Not style nits — logic.
4. **What would you build NEXT on top of these** that we have not thought of? One or two
   highest-value additions.
5. Anything that will behave differently in CI/Linux than on this Windows box.

Context you should weaponize: this repo's history of silent-failure facades (boot "repair"
driven by hardcoded lists; a QA report that read nothing; index definitions that failed
silently at creation). These tools exist to END that class. Attack them AS members of it:
where do THESE tools still report confidence they have not earned?

## 1. The tools (full source)

### 1a. Production state, for grounding
- Waiver outage fixed live (5 additive columns), verified HTTP 200 + audit column-missing 5→0.
- `packages` table now boot-created via one-line creation-order fix, verified in prod.
- 101-index CONCURRENTLY remediation script generated + duplicate-checked, awaiting owner GO.
- QA container: sentinel-gated disposable Postgres 17; schema built from models (231 discovered
  via registry + sequelize.models sweep + models-dir glob), 196 tables, 1 honest fatal
  (PainEntryCorrectiveExercises, fix direction evidenced: prod Exercises.id = uuid).

### FILE: scripts/qa/qa-db.mjs
```js
#!/usr/bin/env node
/**
 * SCRIPT: QA database guard — proves a target database is safe to write to.
 * PURPOSE: Bootstrap, verify, and tear down the isolated QA Postgres.
 * SAFETY: This is the gate that stands between the write-lane tests and Sean's
 *         production data. It fails CLOSED on every uncertainty.
 *
 * WHY THIS EXISTS (2026-08-12):
 * CLAUDE.md:50 records that local dev uses the PRODUCTION database via
 * DATABASE_URL. So the obvious way to run write tests "locally" writes workout
 * records against live client data. Before any write lane can exist, something
 * has to prove the target is not production — and prove it in a way that cannot
 * quietly stop working.
 *
 * HOW THE PROOF WORKS — positive identity, not a blocklist:
 * `bootstrap` writes a sentinel table into the QA database. Every later command
 * refuses unless that sentinel is present and well-formed. Production will never
 * contain it, because nothing but this script creates it.
 *
 * A blocklist ("reject render.com, reject amazonaws.com") was rejected as the
 * primary check: it fails OPEN on any host it has not been taught, which is the
 * exact shape of a rule that works until the day it matters. The blocklist is
 * kept only as a redundant early rejection, never as the proof.
 *
 * USAGE:
 *   node scripts/qa/qa-db.mjs bootstrap   # create sentinel (run once after `up`)
 *   node scripts/qa/qa-db.mjs assert      # exit 0 only if safe to write
 *   node scripts/qa/qa-db.mjs status      # human-readable, never throws on unsafe
 *   node scripts/qa/qa-db.mjs migrate     # assert, THEN run Sequelize migrations
 *   node scripts/qa/qa-db.mjs reset       # drop all data, keep the sentinel
 *
 * The connection string comes from SWAN_QA_DATABASE_URL. It is deliberately NOT
 * DATABASE_URL: reusing that name is how a QA run ends up pointed at production.
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `pg` is a backend dependency, and ESM resolves bare specifiers from THIS
// file's directory — which walks up to the repo root, where nothing is
// installed. Resolve it explicitly against backend/ instead, so the guard works
// regardless of the caller's cwd. A guard that fails to start is a guard that
// gets skipped, and this one stands between the tests and production data.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const requireFromBackend = createRequire(path.join(repoRoot, 'backend', 'package.json'));

let pg;
try {
  pg = requireFromBackend('pg');
} catch {
  console.error(
    'Cannot load the "pg" driver from backend/node_modules.\n'
    + 'Run `npm install` in backend/ first. Refusing to continue: without a driver\n'
    + 'this script cannot verify the target database is safe to write to.',
  );
  process.exit(1);
}

// Every part is overridable, so nothing here is load-bearing for a real target.
// The assembled default trips the scanner's postgres-url pattern; that is
// registered in .secretignore scoped to THIS file and THAT pattern only, rather
// than obfuscated to slip past — a scanner people learn to dodge is worse than
// no scanner.
const QA_HOST = process.env.SWAN_QA_DB_HOST || '127.0.0.1';
const QA_PORT = process.env.SWAN_QA_DB_PORT || '15433';
const QA_USER = process.env.SWAN_QA_DB_USER || 'swan_qa';
const QA_NAME = process.env.SWAN_QA_DB_NAME || 'swan_qa';
// Must match POSTGRES_PASSWORD in docker-compose.qa.yml. Local container only:
// bound to loopback, holds nothing real, destroyed by `down -v`.
const QA_PASS = process.env.SWAN_QA_DB_PASSWORD || '<REDACTED-LOCAL-ONLY>';
const DEFAULT_URL = [assembled from the five QA_* parts above — URL shape redacted in this doc copy so the repo secret scanner does not learn to be ignored];
// Deliberately NOT named `URL`. A module-scope `const URL = "postgres://…"`
// shadows the global URL constructor, so `new URL(...)` below tries to construct
// a string and throws — which surfaced as "not a parseable connection string"
// for a perfectly valid one.
const TARGET_URL = process.env.SWAN_QA_DATABASE_URL || DEFAULT_URL;

const SENTINEL_TABLE = 'swan_qa_sentinel';
const SENTINEL_MARKER = 'SWAN-QA-DISPOSABLE-DATABASE';

/** Hosts that are unambiguously not local. Redundant early exit, never the proof. */
const OBVIOUSLY_REMOTE = /render\.com|amazonaws\.com|neon\.tech|supabase\.co|azure|gcp|rds\./i;

/** Real users would mean this is not the empty QA database it claims to be. */
const MAX_PLAUSIBLE_QA_USERS = 50;

function fail(message) {
  console.error(`REFUSED: ${message}`);
  process.exit(1);
}

function parsed() {
  try {
    return new URL(TARGET_URL.replace(/^postgres(ql)?:\/\//, 'http://'));
  } catch {
    fail('SWAN_QA_DATABASE_URL is not a parseable connection string');
    return null;
  }
}

async function connect() {
  const client = new pg.Client({ connectionString: TARGET_URL });
  try {
    await client.connect();
  } catch (error) {
    fail(`cannot reach the QA database at ${redact(TARGET_URL)} — is the container up? (${error.message})`);
  }
  return client;
}

/** Never print credentials, even for a throwaway local password. */
function redact(url) {
  return url.replace(/\/\/[^@]*@/, '//<redacted>@');
}

/**
 * Cheap checks that need no connection. These can only REJECT; passing them
 * proves nothing, which is why the sentinel check always runs afterwards.
 */
function preflight() {
  const url = parsed();
  const host = url.hostname;

  if (OBVIOUSLY_REMOTE.test(TARGET_URL)) fail(`target host looks remote (${host}) — QA writes are local-only`);
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    fail(`target host is ${host}; QA writes are restricted to loopback`);
  }
  if (url.port === '5432') {
    fail('port 5432 is the developer Postgres; the QA database runs on 15433 so the two cannot be confused');
  }
}

/** The actual proof: this database self-identifies as disposable. */
async function assertSentinel(client) {
  const { rows } = await client.query(
    `SELECT marker, created_at FROM ${SENTINEL_TABLE} LIMIT 2`,
  ).catch(() => ({ rows: null }));

  if (!rows) {
    fail(
      `no ${SENTINEL_TABLE} table — this database has not been bootstrapped as a QA database.\n`
      + '         If you believe it should be, run: node scripts/qa/qa-db.mjs bootstrap\n'
      + '         If you did NOT expect this, STOP: you may be pointed at real data.',
    );
  }
  if (rows.length !== 1 || rows[0].marker !== SENTINEL_MARKER) {
    fail(`${SENTINEL_TABLE} exists but is malformed — refusing to treat this as a QA database`);
  }
}

/** A populated user table means this is not the disposable database it claims to be. */
async function assertNotPopulated(client) {
  const { rows } = await client.query(`
    SELECT COALESCE((SELECT COUNT(*)::int FROM "Users"), 0) AS count
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Users')
  `).catch(() => ({ rows: [] }));

  const count = rows[0]?.count ?? 0;
  if (count > MAX_PLAUSIBLE_QA_USERS) {
    fail(
      `"Users" holds ${count} rows — far more than a seeded QA database should. `
      + 'Refusing, because this looks like real data.',
    );
  }
  return count;
}

const commands = {
  async bootstrap() {
    preflight();
    const client = await connect();
    try {
      // Guard the guard: never stamp a sentinel onto a database that already
      // holds real-looking data, or the marker itself becomes the lie.
      const count = await assertNotPopulated(client);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${SENTINEL_TABLE} (
          marker text PRIMARY KEY,
          created_at timestamptz NOT NULL DEFAULT now(),
          note text
        )
      `);
      await client.query(
        `INSERT INTO ${SENTINEL_TABLE} (marker, note) VALUES ($1, $2)
         ON CONFLICT (marker) DO NOTHING`,
        [SENTINEL_MARKER, 'Created by scripts/qa/qa-db.mjs. Presence of this row is what allows QA writes.'],
      );
      console.log(`bootstrapped: ${redact(TARGET_URL)}`);
      console.log(`sentinel: ${SENTINEL_MARKER} (pre-existing "Users" rows: ${count})`);
    } finally {
      await client.end();
    }
  },

  async assert() {
    preflight();
    const client = await connect();
    try {
      await assertSentinel(client);
      await assertNotPopulated(client);
      console.log(`SAFE TO WRITE: ${redact(TARGET_URL)}`);
    } finally {
      await client.end();
    }
  },

  async status() {
    const url = parsed();
    console.log(`target   : ${redact(TARGET_URL)}`);
    console.log(`host/port: ${url.hostname}:${url.port}`);
    const client = new pg.Client({ connectionString: TARGET_URL });
    try {
      await client.connect();
    } catch (error) {
      console.log(`reachable: no (${error.message})`);
      return;
    }
    try {
      const { rows } = await client.query(
        `SELECT marker FROM ${SENTINEL_TABLE} LIMIT 1`,
      ).catch(() => ({ rows: [] }));
      console.log(`reachable: yes`);
      console.log(`sentinel : ${rows[0]?.marker ?? 'ABSENT — writes will be refused'}`);
      const { rows: v } = await client.query('SELECT version()');
      console.log(`server   : ${v[0].version.split(',')[0]}`);
    } finally {
      await client.end();
    }
  },

  /**
   * Run the application's migrations against the QA database — but only after
   * the sentinel proves it is disposable. Migrations are the single most
   * destructive thing pointed at a database, so this deliberately does not exist
   * as a bare npm script: there is no invocation that skips the assertion.
   */
  async migrate() {
    preflight();
    const client = await connect();
    try {
      await assertSentinel(client);
      await assertNotPopulated(client);
    } finally {
      await client.end();
    }

    const backend = path.join(repoRoot, 'backend');
    // Invoke the CLI's JS entrypoint with the current Node binary rather than
    // going through npx. On Windows, spawning `npx.cmd` without a shell throws
    // EINVAL (Node's CVE-2024-27980 fix), and enabling a shell would add an
    // injection surface to a script that guards production data.
    const cli = path.join(backend, 'node_modules', 'sequelize-cli', 'lib', 'sequelize');
    const result = spawnSync(
      process.execPath,
      [
        cli, 'db:migrate',
        '--config', path.join('config', 'config.qa.cjs'),
        '--migrations-path', 'migrations',
        '--models-path', 'models',
        '--env', 'qa',
      ],
      {
        cwd: backend,
        stdio: 'inherit',
        // Strip anything that could redirect the CLI at a real database. The QA
        // config ignores dotenv, but the CLI process would still inherit these.
        env: { ...process.env, DATABASE_URL: '', PG_HOST: '', PG_PORT: '', PG_DB: '', NODE_ENV: 'qa' },
      },
    );

    if (result.error) fail(`could not start sequelize-cli: ${result.error.message}`);
    if (result.status !== 0) {
      fail(`migrations failed (exit ${result.status}) — the QA schema is incomplete`);
    }
    console.log('migrations applied to the QA database');
  },

  /** Wipe data between runs without destroying the container or the sentinel. */
  async reset() {
    preflight();
    const client = await connect();
    try {
      await assertSentinel(client);          // never reset something unproven
      await client.query(`
        DO $$
        DECLARE r record;
        BEGIN
          FOR r IN
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename <> '${SENTINEL_TABLE}'
          LOOP
            EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
          END LOOP;
        END $$;
      `);
      console.log(`reset: all public tables dropped except ${SENTINEL_TABLE}`);
    } finally {
      await client.end();
    }
  },
};

const command = process.argv[2];
const run = commands[command];
if (!run) {
  console.error(`usage: node scripts/qa/qa-db.mjs <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}

try {
  await run();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}```

### FILE: scripts/qa/qa-schema.mjs
```js
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
const pass = process.env.SWAN_QA_DB_PASSWORD || '<REDACTED-LOCAL-ONLY>';

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
    await import(`file://${file}`);
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
        console.error(`\n${fatal.length} RUNTIME-REACHABLE model(s) could not be created (FATAL):`);
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
```

### FILE: backend/scripts/generate-index-remediation.mjs
```js
#!/usr/bin/env node
/**
 * SCRIPT: generate-index-remediation.mjs — build (never run) the missing-index fix.
 * PURPOSE: Emit a reviewed, hand-executed SQL script that adds every index the
 *          models declare but the live database lacks.
 * SAFETY:  READ-ONLY against the database. Writes one .sql file for HUMAN review
 *          and deliberate off-peak execution. It never executes DDL itself.
 *
 * WHY THIS SHAPE (2026-08-12, SWA-157):
 * The drift audit found 112 declared-but-absent indexes in production — including
 * all 9 on daily_workout_forms, the trainer-logs-workout table. They are absent
 * because several models declare index `fields` by ATTRIBUTE name while the
 * columns are snake_case, so CREATE INDEX failed silently at creation time.
 *
 * Design decisions, each load-bearing:
 * - Every field is mapped attribute → column via rawAttributes[..].field, then
 *   VALIDATED against the live table's actual columns. An index whose columns
 *   cannot all be resolved is SKIPPED WITH A REASON, never guessed (fail-closed
 *   per index — a wrong guess here is a broken statement against production).
 * - `CREATE INDEX CONCURRENTLY IF NOT EXISTS` — CONCURRENTLY takes no
 *   write-blocking lock, which is the difference between remediation and an
 *   outage. It cannot run inside a transaction, so the output is plain
 *   statements with NO BEGIN/COMMIT, and the header documents the INVALID-index
 *   retry procedure for interrupted builds.
 * - Includes the waiver idempotency partial unique index
 *   (WHERE "idempotencyKey" IS NOT NULL): publicWaiverController:656 catches
 *   SequelizeUniqueConstraintError, but no such constraint exists anywhere —
 *   that recovery branch is dead code until this ships.
 *
 * USAGE:
 *   Rehearse (QA container):  PG_HOST=127.0.0.1 PG_PORT=15433 ... node scripts/generate-index-remediation.mjs --out c:/tmp/qa-indexes.sql
 *   Production (read-only):   node --env-file=<main-tree .env> scripts/generate-index-remediation.mjs --out c:/tmp/prod-indexes.sql
 */

import fs from 'node:fs';

if (!process.env.DATABASE_URL && !process.env.PG_HOST) {
  console.error('FATAL: set DATABASE_URL (production, via --env-file) or PG_HOST (QA container).');
  process.exit(2);
}

const outIdx = process.argv.indexOf('--out');
const outPath = outIdx > -1 ? process.argv[outIdx + 1] : 'index-remediation.sql';

const { default: sequelize } = await import('file:///C:/tmp/ss-qa-harness-slice0/backend/database.mjs');
const { default: getModels } = await import('file:///C:/tmp/ss-qa-harness-slice0/backend/models/associations.mjs');

const models = await getModels();

const [liveIndexRows] = await sequelize.query(
  `SELECT tablename AS table_name, indexname AS index_name FROM pg_indexes WHERE schemaname = 'public'`,
);
const liveIndexes = new Map();
for (const row of liveIndexRows) {
  if (!liveIndexes.has(row.table_name)) liveIndexes.set(row.table_name, new Set());
  liveIndexes.get(row.table_name).add(row.index_name);
}

const [liveColumnRows] = await sequelize.query(
  `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
);
const liveColumns = new Map();
for (const row of liveColumnRows) {
  if (!liveColumns.has(row.table_name)) liveColumns.set(row.table_name, new Set());
  liveColumns.get(row.table_name).add(row.column_name);
}

const statements = [];
const skipped = [];

for (const [name, model] of Object.entries(models)) {
  if (!model?.getTableName || !model.rawAttributes || !Array.isArray(model.options?.indexes)) continue;
  const table = String(model.getTableName()).replace(/"/g, '');
  const tableColumns = liveColumns.get(table);
  if (!tableColumns) continue; // table absent from this DB — separate finding, not an index problem

  // attribute name -> column name; also accept already-column-named fields.
  const toColumn = new Map();
  for (const [attr, def] of Object.entries(model.rawAttributes)) {
    const column = def.field || attr;
    toColumn.set(attr, column);
    toColumn.set(column, column);
  }

  for (const idx of model.options.indexes) {
    if (!idx?.name || !Array.isArray(idx.fields) || idx.fields.length === 0) continue;
    if (liveIndexes.get(table)?.has(idx.name)) continue; // already present

    const resolved = [];
    let unresolvable = null;
    for (const field of idx.fields) {
      const fieldName = typeof field === 'string' ? field : field?.name;
      const column = toColumn.get(fieldName);
      if (!column || !tableColumns.has(column)) {
        unresolvable = `field "${fieldName}" -> column "${column ?? '?'}" not in live ${table}`;
        break;
      }
      resolved.push(column);
    }
    if (unresolvable) {
      skipped.push({ model: name, table, index: idx.name, reason: unresolvable });
      continue;
    }

    const unique = idx.unique ? 'UNIQUE ' : '';
    const using = idx.using ? ` USING ${idx.using}` : '';
    const cols = resolved.map((c) => `"${c}"`).join(', ');
    statements.push(
      `CREATE ${unique}INDEX CONCURRENTLY IF NOT EXISTS "${idx.name}" ON "${table}"${using} (${cols});`,
    );
  }
}

// The waiver idempotency promise (model comment: "unique when present so a
// double-tap replays") — enforced nowhere today; the app's recovery catch for it
// is dead code. Partial unique matches "when present".
if (liveColumns.get('waiver_records')?.has('idempotencyKey')
  && !liveIndexes.get('waiver_records')?.has('waiver_records_idempotency_key_unique')) {
  statements.push(
    `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "waiver_records_idempotency_key_unique" `
    + `ON "waiver_records" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;`,
  );
}

const header = `-- Index remediation, generated ${new Date().toISOString()}
-- READ FIRST — this file is reviewed and executed BY A HUMAN, off-peak, never by boot:
--   * CONCURRENTLY cannot run inside a transaction: run statements as-is, no BEGIN/COMMIT.
--   * Each statement briefly uses two table scans but takes NO write-blocking lock.
--   * If a build is interrupted it leaves an INVALID index: find with
--       SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--     then DROP INDEX <name>; and re-run its statement.
--   * IF NOT EXISTS makes re-runs safe.
-- ${statements.length} statement(s); ${skipped.length} declared index(es) skipped as unresolvable (listed at end).

${statements.join('\n')}

-- SKIPPED (unresolvable against the live schema — fix the model declaration first):
${skipped.map((s) => `--   ${s.table} :: ${s.index} — ${s.reason}`).join('\n') || '--   (none)'}
`;

fs.writeFileSync(outPath, header, 'utf8');
console.log(`wrote ${outPath}: ${statements.length} statement(s), ${skipped.length} skipped`);
for (const s of skipped.slice(0, 10)) console.log(`  SKIP ${s.table} :: ${s.index} — ${s.reason}`);
if (skipped.length > 10) console.log(`  ... +${skipped.length - 10} more (see file)`);

await sequelize.close();
```

### FILE: scripts/linear-cli.mjs
```js
#!/usr/bin/env node
/**
 * SCRIPT: Linear CLI — MCP-independent fallback for board access.
 * PURPOSE: List, search, create and comment on SWA issues without the MCP server.
 * SAFETY: Reads LINEAR_API_KEY from the environment only. Never prints it, never
 *         writes it to disk, never accepts it as an argument (argv is visible in
 *         process listings and shell history).
 *
 * WHY THIS EXISTS (2026-08-12):
 * The Linear MCP server was configured against the hosted OAuth endpoint with no
 * auth header, which forces an interactive browser handshake. That handshake can
 * never complete in a non-interactive session, so agent after agent reported
 * "Linear needs OAuth, I can't capture this" and the board silently fell behind.
 * The MCP config is fixed (API-key header), but MCP servers only connect at
 * launch — so a session that starts before a config change still has no tools.
 * This script has no such dependency: if the key is in the environment, the board
 * is reachable, always.
 *
 * SETUP: create a personal API key at
 *   linear.app -> Settings -> Security & access -> Personal API keys
 * and store it as an environment variable named LINEAR_API_KEY.
 *
 * USAGE:
 *   node scripts/linear-cli.mjs whoami
 *   node scripts/linear-cli.mjs list [--limit=50]
 *   node scripts/linear-cli.mjs search "playwright crawl"
 *   node scripts/linear-cli.mjs create --title="..." --body-file=path/to/body.md
 *   node scripts/linear-cli.mjs comment --issue=SWA-157 --body-file=path/to/note.md
 *
 * Body text is passed by FILE, not by argument, so multi-line markdown survives
 * intact and never lands in shell history.
 */

import { readFileSync } from 'node:fs';

const KEY = process.env.LINEAR_API_KEY;
const TEAM = process.env.LINEAR_TEAM_KEY || 'SWA';
const ENDPOINT = 'https://api.linear.app/graphql';

if (!KEY) {
  console.error(
    'LINEAR_API_KEY is not set.\n'
    + 'Create a key at linear.app -> Settings -> Security & access -> Personal API keys,\n'
    + 'then store it in the environment. Never pass it as a command-line argument.',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const command = args[0];
const opt = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

async function gql(query, variables) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    // Surface the body: a bare status code sends the reader hunting for nothing.
    throw new Error(`HTTP ${response.status} — ${(await response.text()).slice(0, 400)}`);
  }
  const json = await response.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

async function teamId() {
  const data = await gql('query($k:String!){ teams(filter:{key:{eq:$k}}){ nodes { id } } }', { k: TEAM });
  const node = data.teams.nodes[0];
  if (!node) throw new Error(`no team with key "${TEAM}" — set LINEAR_TEAM_KEY`);
  return node.id;
}

function bodyFromFile() {
  const file = opt('body-file');
  if (!file) throw new Error('--body-file=<path> is required (bodies are passed by file, not argv)');
  return readFileSync(file, 'utf8');
}

const ISSUE_FIELDS = 'identifier title url state { name } updatedAt';

const commands = {
  async whoami() {
    const data = await gql('{ viewer { name } teams { nodes { key name } } }');
    console.log(`viewer: ${data.viewer.name}`);
    console.log(`teams : ${data.teams.nodes.map((t) => `${t.key} (${t.name})`).join(', ')}`);
  },

  async list() {
    const limit = Number(opt('limit') || '30');
    // NaN serialises to null and the API rejects it with a GraphQL type error
    // that says nothing about the actual mistake, which was a typo'd flag.
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`--limit must be a positive integer (got "${opt('limit')}")`);
    }
    const data = await gql(
      `query($k:String!,$n:Int!){ issues(filter:{team:{key:{eq:$k}}}, first:$n, orderBy:updatedAt){ nodes { ${ISSUE_FIELDS} } } }`,
      { k: TEAM, n: limit },
    );
    for (const issue of data.issues.nodes) {
      console.log(`${issue.identifier}  [${issue.state.name}]  ${issue.title}`);
    }
    console.log(`— ${data.issues.nodes.length} issue(s)`);
  },

  /** Dedup helper: always run this before create. */
  async search() {
    const termInput = args.slice(1).filter((a) => !a.startsWith('--')).join(' ').toLowerCase();
    if (!termInput) throw new Error('usage: search "<words>"');
    const terms = termInput.split(/\s+/);
    const data = await gql(
      `query($k:String!){ issues(filter:{team:{key:{eq:$k}}}, first:250, orderBy:updatedAt){ nodes { ${ISSUE_FIELDS} } } }`,
      { k: TEAM },
    );
    const hits = data.issues.nodes.filter((issue) => {
      const haystack = issue.title.toLowerCase();
      return terms.some((term) => haystack.includes(term));
    });
    if (!hits.length) {
      console.log('(no matches — safe to create)');
      return;
    }
    for (const issue of hits) console.log(`${issue.identifier}  [${issue.state.name}]  ${issue.title}`);
    console.log(`— ${hits.length} possible duplicate(s); review before creating`);
  },

  async create() {
    const title = opt('title');
    if (!title) throw new Error('--title="..." is required');
    // Read the body BEFORE any network call: argument-evaluation order would
    // otherwise resolve teamId() first, so a typo'd path surfaces as a confusing
    // API error after a wasted round trip instead of "file not found".
    const description = bodyFromFile();
    const data = await gql(
      'mutation($input: IssueCreateInput!){ issueCreate(input:$input){ success issue { identifier url } } }',
      { input: { teamId: await teamId(), title, description } },
    );
    console.log(`CREATED: ${data.issueCreate.issue.identifier}`);
    console.log(`URL: ${data.issueCreate.issue.url}`);
  },

  async comment() {
    const identifier = opt('issue');
    if (!identifier) throw new Error('--issue=SWA-123 is required');
    const body = bodyFromFile();  // validate the file before spending a round trip
    // Linear types `number` as Float, not String — passing the raw identifier
    // suffix fails GraphQL validation before it ever reaches the board.
    const number = Number(identifier.split('-')[1]);
    if (!Number.isFinite(number)) throw new Error(`malformed issue id "${identifier}" — expected e.g. SWA-157`);
    const found = await gql(
      'query($k:String!,$n:Float!){ issues(filter:{team:{key:{eq:$k}},number:{eq:$n}}){ nodes { id identifier } } }',
      { k: TEAM, n: number },
    );
    const issue = found.issues.nodes.find((node) => node.identifier === identifier);
    if (!issue) throw new Error(`issue ${identifier} not found in team ${TEAM}`);
    await gql(
      'mutation($input: CommentCreateInput!){ commentCreate(input:$input){ success } }',
      { input: { issueId: issue.id, body } },
    );
    console.log(`COMMENTED on ${identifier}`);
  },
};

const run = commands[command];
if (!run) {
  console.error(`unknown command "${command || '(none)'}" — try: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}```

### FILE: backend/utils/tableCreationOrder.mjs (creation loop + fix excerpt)
```js
  'lead_activities',             // LeadActivity — depends on leads, Users
  'page_views',                  // PageView — standalone, anonymous page view persistence

  // PHASE 13: Drift-audit backfill (2026-08-03) — live-wired models whose tables
  // were never created in production because they were absent from this list AND
  // had no .cjs migration visible to safe-migrate.mjs (which cannot load .mjs files).
  // Every entry below was verified missing against the live DB via
  // scripts/audit-schema-drift.mjs before being added. Depends only on Users,
  // which is created in PHASE 1.
  'progress_data',               // ProgressData — /api/gamification progress endpoints
  'user_follows',                // UserFollow — social follow/leaderboard/feed endpoints
  'session_packages',            // SessionPackage — gallery VIP Stripe fulfillment
  // 2026-08-12 drift audit (SWA-157): `packages` was registered in getModels() but absent from
  // this list, and createTablesInOrder iterates ONLY this list — so the table was never created
  // in production and four admin routes (finance/revenue/charge-card/package) query a table that
  // does not exist. Second instance of the same failure shape as MISSING_COLUMNS: a "self-healing"
  // boot that heals only what someone remembered to enumerate. FK verified: createdBy INTEGER ->
  // quoted "Users"(id); DDL proven by the QA-container rebuild creating this table cleanly.
  // NOTE: PainEntryCorrectiveExercises (the other missing table) is deliberately NOT added — its
  // FK-type defect (exerciseId vs Exercises.id UUID) would error on every boot until fixed.
  'packages',                    // Package — admin finance/revenue/charge-card/package routes
  'video_sessions',              // VideoSession — /api/video-sessions (VideoChat/ROM)
  'olympic_events',              // OlympicEvent — /api/olympics (Virtual Olympics)
  'marketing_calendar_items',    // MarketingCalendarItem — admin marketing calendar
  'social_publishing_accounts',  // SocialPublishingAccount
  'social_publishing_jobs',      // SocialPublishingJob — publish queue
  'social_publishing_attempts'   // SocialPublishingAttempt — per-attempt audit trail
  // DDL dry-run 2026-08-03: none of the three social_publishing tables declare hard FK
  // constraints to each other (cross-refs are plain integer columns); the only REFERENCES
  // targets across all nine PHASE 13 tables are "Users". Order above is logical, not load-bearing.
];

/**
 * Create tables in proper dependency order
 */
export const createTablesInOrder = async (models) => {
  logger.info('🔧 Creating tables in dependency order...');
  
  const results = {
    created: [],
    skipped: [],
    errors: [],
    totalTables: TABLE_CREATION_ORDER.length
  };
  
  for (const tableName of TABLE_CREATION_ORDER) {
    try {
      // ENHANCED: Find model by table name with robust matching
      const model = Object.values(models).find(m => {
        if (!m || !m.getTableName) return false;
        const modelTableName = m.getTableName();
        
        // Remove quotes from table names for comparison
        const cleanModelTableName = modelTableName.replace(/["']/g, '');
        const cleanTableName = tableName.replace(/["']/g, '');
        
        // Multiple matching strategies
        return (
          // Exact match
          modelTableName === tableName ||
          cleanModelTableName === cleanTableName ||
          // Case-insensitive match
          cleanModelTableName.toLowerCase() === cleanTableName.toLowerCase() ||
          // Model name match
          m.name === tableName ||
          m.name === cleanTableName ||
          // Snake_case to PascalCase conversion match
          cleanModelTableName === tableName.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) ||
          // PascalCase to snake_case conversion match
          cleanModelTableName === tableName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
        );
      });
      
      if (!model) {
        logger.warn(`⚠️  Model not found for table: ${tableName}`);
        logger.warn(`Available models: ${Object.values(models).filter(m => m && m.getTableName).map(m => m.getTableName()).join(', ')}`);
        results.skipped.push(tableName);
        continue;
      }
      
      // Check if table already exists
```

### FILE: backend/scripts/audit-schema-drift.mjs (this session's additions: guard + index class)
```js
// DATABASE_URL is the production path (database.mjs treats a set DATABASE_URL as
// "connect to the production DB", with SSL required). PG_HOST is the local path,
// used to run this auditor against the disposable QA container.
//
// Added 2026-08-12: previously DATABASE_URL was mandatory, which meant this tool
// could ONLY ever be pointed at production and could never be exercised safely
// before being aimed there. An audit tool nobody can rehearse is one more thing
// that is trusted without evidence.
if (!process.env.DATABASE_URL && !process.env.PG_HOST) {
  console.error(
    'FATAL: set DATABASE_URL (production, via --env-file) or PG_HOST (local QA container).',
  );
  process.exit(2);
}

const { default: sequelize } = await import('../database.mjs');
const { default: getModels } = await import('../models/associations.mjs');
318-  for (const idx of declared) {
319-    if (!idx?.name) continue;             // unnamed indexes get generated names; skip
320-    if (live.has(idx.name)) continue;
321-    findings.push({
322:      class: 'index-missing-in-db', severity: 'HIGH', model: name, table: tn,
323-      index: idx.name, fields: idx.fields || [],
324-      note: 'Model declares this index but the live DB does not have it. A common cause is '
325-        + '`fields` naming model ATTRIBUTES where the DB column differs (e.g. clientId vs client_id), '
326-        + 'which makes CREATE INDEX fail silently at table-creation time.',
327-    });
328-  }
329-}
330-
331-// FK constraints referencing the dead lowercase `users` table
332-for (const fk of dbFks) {
333-  if (fk.foreign_table === 'users') {
334-    findings.push({ class: 'fk-to-dead-users', severity: 'CRITICAL',
335-      table: fk.table_name, column: fk.column_name, constraint: fk.constraint_name,
336-      note: 'Live FK constraint targets lowercase `users` (dead table) instead of "Users"' });
337-  }
338-}
339-
340-// tables in DB not covered by any model (informational)
```
