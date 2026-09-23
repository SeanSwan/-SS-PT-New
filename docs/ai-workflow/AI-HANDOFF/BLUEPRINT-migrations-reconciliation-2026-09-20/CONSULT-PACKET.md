# CONSULT PACKET — SS-PT migrations: schema authority, the runner, and the reconciliation

**Package:** `BLUEPRINT-migrations-reconciliation-2026-09-20`
**Repo:** `SeanSwan/-SS-PT-New`, branch `creator-brains-engine-r2-20260915`, Windows / Git Bash
**Assembled:** 2026-09-20
**Governing mode:** **Mega Blueprint** (printed once, here)

---

## 0. PREAMBLE — read before anything else

### 0.1 Who this is and what it is for

This is the operator's own private repository. The subject is **the correctness of the database
migration system and the reconciliation of a 30-round hostile-review ledger** that audited it.
Nothing here is offensive security work, and there is no third-party target.

Two files in this packet are *security-adjacent* in the sense that they discuss **containment of a
production database** — specifically, a guard that refuses a remote/production database URL unless
an explicit operator flag is set. Those passages are the operator's own defensive controls. There is
no exploit payload, no credential, and no target other than the operator's own database.

### 0.2 Do NOT explore the repository — and here is why

**Do not read files. Do not list directories. Do not run shell commands. Do not search.**

Everything you need is in this packet. The sandbox you are in is **read-only by design**, and its
bundled search binary is denied by the sandbox policy — so a search attempt will fail with
"Access is denied". That is an environmental fact, not a bug for you to work around, and not
something to report as a blocker. If a fact is genuinely absent from this packet, mark it
`UNVERIFIED` and say what you would need. That is a correct answer, not a failure.

**You cannot grep this repo. Every excerpt you need has been pasted in below, verbatim.**

### 0.3 You are not asked to save anything

Do not attempt to write files, commit, or file anything to a network location. The caller splits
your reply mechanically and files the result. Ignore your inability to persist artifacts.

### 0.4 The output contract is mechanically parsed — do not vary it

Your reply is decomposed by a script that requires, at fence depth 0:

```
## PART A — HOSTILE REVIEW
## PART B — FORGED PACKAGE
## PART C — DECISION-DENSITY SELF-TEST
```

and inside PART B, exactly these level-3 headings, in this order:

`00-README.md` · `01-architecture.md` · `02-wireframes.md` · `03-contracts.md` ·
`04-build-order.md` · `05-slices.md` · `06-bans.md` · `07-checkpoints.md` · `09-tests.md`

Never place one of those headings inside a code fence — a fenced heading is ignored by the parser
and costs a missing document. Do not restate this mandate back to the operator; spend every token
on findings and decisions.

### 0.5 What "hostile review A1" means here

PART A must attack **the existing documents supplied in this packet** — the successor work order
(§3), the guard test's debt register (§6.3), the runner (§2), and the schema claims in §4/§5. They
are review targets, not background reading. Every finding carries `file:line` or `doc#section`
evidence plus a concrete fix. **A finding without a fix is not a finding.**

---

## 1. WHAT IS BEING BUILT

A **schema-authority decision and a migration-chain remediation** for a Sequelize/PostgreSQL backend
whose migration system has drifted from its models.

The concrete deliverable the operator needs planned:

1. **One decided schema authority.** Today three artifacts disagree about the primary key type of the
   user table *and* about whether the table is even named the same thing (§4).
2. **A convergent migration chain.** 312 executable migrations plus 38 that can never run (§2.4),
   with a family of five overlapping "emergency repair" migrations, three of which sort to the very
   end of the chain by accident of naming (§5).
3. **A production-drift observation that is honest about what is unknown.** Whether production's
   `users.id` is `uuid` or `integer` is **not determinable from the repository** — it depends on
   whether specific migrations ever ran. The plan must say so and must specify the read that settles
   it, rather than assuming either answer (§8, item D1).
4. **Test coverage that proves the above**, in a repo whose full suite has **never been recorded
   green** (§3.2) — so "the suite passes" is not an available acceptance test.

**This is a correctness-and-reconciliation task, not a feature build.** The package you forge should
read as a *remediation and decision* package. Where a Forge artifact class has no surface (there are
no screens, no UI, no palette tokens, no HTTP endpoints in this work), answer it
`N/A — <reason naming what is absent>`. That is a legitimate answer. What is not legitimate is
inventing a screen or an endpoint so the list looks satisfied.

---

## 2. THE RUNNER, VERBATIM — `backend/scripts/safe-migrate.mjs`

This is the centerpiece. It is the only thing that applies migrations in production. Read it as the
current source of truth for the control flow your package must plan against.

**Path:** `backend/scripts/safe-migrate.mjs` · **458 lines** · SHA-256 of the working-tree copy is
recorded in the receipt. It is **uncommitted** at the time of writing (modified vs HEAD).

```javascript
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

/**
 * H-03: emergency escape hatch restoring the OLD behaviour (mark a failed
 * migration as applied and exit 0). Default OFF.
 *
 * It exists only so a broken deploy can be forced through in an emergency.
 * Leaving it on is what produced the production drift in the first place —
 * migrations recorded as applied whose tables do not exist.
 */
const ALLOW_FAILURE = process.env.SWAN_MIGRATE_ALLOW_FAILURE === '1';
if (ALLOW_FAILURE) {
  console.warn('⚠️  SWAN_MIGRATE_ALLOW_FAILURE=1 — failed migrations will be marked as applied and the run will exit 0.');
}

// "Already exists" patterns that indicate the migration was already applied.
//
// H-03 tightening (hostile review of the review, 2026-09-18).
//
// This list used to also swallow:
//     /duplicate key value/i
//     /violates foreign key constraint/i
// The file's own header (above) names them as "precisely the errors a migration
// raises when it meets POPULATED tables" — i.e. the two patterns that most
// often conceal a REAL failure, reclassified as success and then written into
// SequelizeMeta where they can never re-run. That is the exact mechanism that
// produced the §0 production drift.
//
// The remaining patterns are structural idempotency: the object the migration
// wanted to create is already there, so the migration's intent is satisfied.
// Those are safe to reclassify. Data-conflict errors are not.
//
// NOTE (do not "fix" this the other way): the ledger's H-03 remedy was to set
// SWAN_MIGRATE_STRICT=1 in render-start.mjs. That would be a REGRESSION for the
// deploy path. STRICT makes isAlreadyAppliedError() return false
// unconditionally, so every legitimately-idempotent re-run on production's
// populated tables would become a permanent, every-deploy failure. Production
// needs the benign "already exists" reclassification; it does not need the
// data-conflict one. Removing the two patterns below is the surgical fix.
const ALREADY_APPLIED_PATTERNS = [
  /already exists/i,
  /relation .+ already exists/i,
  /column .+ of relation .+ already exists/i,
  /index .+ already exists/i,
  /constraint .+ already exists/i,
  /type .+ already exists/i,
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
  const executed = await getExecutedMigrations(seq);
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
  let skipped = 0;
  let failed = 0;
  let firstFailure = null;

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
      // Genuine failure
      console.log('FAILED');
      console.error(`    Error: ${result.combined.split('\n').filter(l => l.includes('ERROR')).join('\n    ') || result.combined.slice(-200)}`);
      failed++;
      if (firstFailure === null) firstFailure = migration;
      if (STRICT) {
        console.error('');
        console.error('SWAN_MIGRATE_STRICT=1 — refusing to mark a failed migration as applied.');
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
      if (ALLOW_FAILURE) {
        await markAsCompleted(seq, migration);
        console.log('    (marked as done — SWAN_MIGRATE_ALLOW_FAILURE=1 is set)');
      } else {
        console.log('    (left PENDING — not marked as applied; this run will fail)');
      }

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
  console.log(`Skipped:  ${skipped} (already existed)`);
  console.log(`Failed:   ${failed}${ALLOW_FAILURE ? ' (marked done — SWAN_MIGRATE_ALLOW_FAILURE=1)' : ''}`);
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
    console.error(`ERROR: ${failed} migration(s) failed.`);
    console.error('They were NOT marked as applied — fix them and re-run.');
    if (!ALLOW_FAILURE) process.exit(1);
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
export { main, discoverMigrationFiles, isExecutableByCli, getAllMigrationFiles };
```

### 2.1 Properties of this file a planner must respect

- **`getSequelize()` (lines 108–127) is dead code.** `main()` builds its own `Sequelize` at
  `:280-295` and never calls `getSequelize()`. Also, `getSequelize()` uses `require()` inside an ESM
  module (`:119`), which would throw if reached. It is exported nowhere.
- **The invocation guard (`:443-451`) is what makes the file testable**, and it is new
  (2026-09-20). Before it, importing the file ran production migrations.
- **`--to <name>` is not a per-migration selector** (`:382-400`). This is the single most important
  semantic in the file: it is why the loop must stop at the first genuine failure.
- **`reportInertMigrations` is `console.error`** (`:250-269`), so the 38-file warning goes to
  stderr, not stdout.
- **Discovery sorts lexicographically** (`:232`, `out.sort()`). This is load-bearing — see §5.

---

## 3. THE RECONCILIATION STATE — `FIX-WORK-ORDER-SUCCESSOR-2026-09-20.md`

This document supersedes §5 of a 30-round hostile-review ledger. It is the current instruction list
and it is itself a review target for PART A.

```markdown
# FIX WORK ORDER — SUCCESSOR

**Supersedes §5 ("FIX-AGENT WORK ORDER") of
`docs/ai-workflow/reviews/ULTRA-HOSTILE-REVIEW-30-ROUND-2026-09-18.md`.**

**Published:** 2026-09-20 · **Authority:** Rule 86 (preserve historical review text, publish a
successor, make the current entry point resolve to it). §5 is preserved unedited in the ledger; it is
**no longer the instruction list to execute.**

**Why this exists.** Astra's hostile review (§23, finding F2) checked every item in §5 against the
sections that later corrected it. Thirteen items are contradicted, deferred, or re-scoped, and
nothing reconciled §5. A work order that still instructs a wrong fix is worse than no work order,
because it is the document a fix agent follows and it carries the authority of the summary section.
§12.3 states the rule this file exists to honour: *a wrong migration is worse than none.*

## 0. Read this before executing anything below

Three items in §5 will actively cause harm if followed. They are listed first.

| §5 said | Do this instead |
|---|---|
| **H-01** — "Guard or create `orientations`; make the chain bootstrappable from empty" (`L:652`) | **Do not apply a guard.** One already exists at `backend/migrations/20240115000000-update-orientation-model.cjs:25` and does not address the schema-generation mismatch (§12.3): `20250212060728-create-user-table.cjs:337` creates lowercase `users.id` as **UUID**, while `models/User.mjs:25-27` declares auto-increment **INTEGER**. The chain would build a *different database generation*. The squashed-baseline decision stays open and is Sean's. |
| **H-03** — "Set `SWAN_MIGRATE_STRICT=1` in `render-start.mjs`" (`L:649`) | **Do not set it.** `backend/scripts/render-start.mjs:44-54` documents that doing so **is a regression**: STRICT disables the already-exists reclassification entirely, and production's populated tables legitimately produce those on idempotent re-runs. The default path already fails the run non-zero and leaves the migration PENDING. |
| **H-07 / M-02** — "`sync({ alter: true })` at boot competes with migrations" (`L:655`) | **Name the real path.** `startup.mjs:201-202` gates `sync({ alter: true })` on `!isProduction && AUTO_SYNC === 'true'` — **it never runs in production**. Production runs `startup.mjs:207-214` → `syncDatabaseSafely()` → `productionDatabaseSync.mjs:41-53 createMissingTables()` → `createTablesInOrder(models)`, plus `sync({ alter: { drop: false } })` at `:265-283`. The defect is *dual schema authority*, not a destructive alter. |

## 1. The reconciliation — every §5 item against its later correction

| Item | §5 instruction | Later correction / current evidence | Status |
|---|---|---|---|
| H-01 | Guard/create `orientations` (`L:652`) | §12.3: squashed baseline required; guard already exists at `:25`; UUID↔INTEGER mismatch | **OPEN — owner decision** |
| H-02 | "Covered by H-01's guard" (`L:182`) | Falsified by `migrationGuardTableNames.test.mjs` — the H-02 class has **eight** members; fixing H-01 alone moves the wall | **REFUTED, superseded by the guard** |
| H-03 | Enable production STRICT (`L:649`) | Rejected by `render-start.mjs:44-54`; default path already fails the run | **FIXED — do not "fix" further** |
| H-04 | Recurse and include `.mjs` (`L:653`) | Fixed in the runner: `safe-migrate.mjs:219-243 discoverMigrationFiles()` recurses and models the CLI's non-recursiveness via `isExecutableByCli` (`:211-217`), reporting the inert set loudly | **FIXED** |
| H-06 | Require `SWAN_ALLOW_REMOTE_DB=1` (`L:648`) | Implemented flag is `SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL=1` with hosted-provider detection (`L:1335-1339`) | **FIXED under a different name — document the real flag** |
| H-07 | Strict replay + applied-migration/table assertion (`L:654`) | Repair is owner-controlled; **no** generic applied-migration→table-exists assertion was found. See §23.1 — the claim is split three ways and the current table state is `[UNKNOWN]` from the tree | **OPEN — needs a fresh observation, not a replay** |
| M-01 | Stop using `--to` as a per-migration selector (`L:656`) | Runner keeps `--to` but stops after the first genuine failure and documents the semantics (`safe-migrate.mjs:379-400`) | **FIXED (bounded) — do not replace with a single-migration API** |
| M-02 | Remove production `sync({ alter: true })` (`L:655`) | Misattributed — see §0. Real production sync is `productionDatabaseSync.mjs:270` | **RE-SCOPED** |
| M-03 / M-04 / H-05 | Consolidate `.env`; de-duplicate migration prefixes (`L:658`) | Not re-verified this pass | **UNCHANGED — verify before acting** |
| M-08 | Repair contract escaping (`L:664`) | `TrainerOnboarding.renderContract` judged escape-first and left untouched (`L:1367`) | **CLOSED as inspected / no repair required** |
| M-10 | Port guard; extend FK/table checks (`L:657`) | Guard exists (`migrationGuardTableNames.test.mjs`) but is a **source ratchet with a 23-entry exact-match debt register** — it proves source shape, not database state | **PARTIAL — separate static coverage from absent DB proof** |
| M-13 | Delete `_unused/`, `old/_backup/`, `*.tmp.py` (`L:673`) | Not re-verified this pass | **UNCHANGED — verify before acting** |
| H-08 | Remove fallback, fail fast (`L:661`) | Later fix preserves generated *development* secrets; production failure already existed (`L:1368`) | **FIXED (environment-specific) — state the scope** |
| H-09 | No fallback / no JWT reuse (`L:662`) | Narrower verified behaviour: production rejects the public salt; development keeps determinism (`L:1369`) | **PARTIALLY VERIFIED — do not auto-close the original prescription** |
| H-10 / M-14 | Sanitise render+write; delete V2/V3 (`L:663`) | Fix sanitises all three renderers and **preserves** them (`L:1367`, `:1470`) | **SPLIT: rendering fixed; write-path and cleanup separately authorised** |
| H-13 | Resolve 119 deletions (`L:670`) | §13 repudiates that inventory and reports different counts (`L:1615-1617`) | **REFUTED — use timestamped `git status` with an explicit mode** |
| O-02 | "NOT FIXED — your call" (`L:1852`) | **Stale**: the gate exists in committed `backend/utils/startupMigrations.mjs:59-60`, `:841-848` (commit `6065985dd`) | **FIXED IN CODE — deployment enablement unknown** |

Items not listed above were not individually reconciled. **A later suite total does not close them.**

## 2. What replaces the "verify with a suite total" instruction

§5's implicit acceptance test was a full-suite pass count. That test is not available: **no recorded
full-suite run in the ledger is green** (§23.1, F3 — every figure is red; best recorded 9 failed /
839 passed). Two consequences for whoever executes this order:

1. **"Nothing broke" is not a claim you may make from a suite total.** A frozen *red* baseline with
   stable case identities can support a bounded claim — that your change added no *additional*
   observed failures. Record the failing set before and after, by name.
2. **Per-change evidence, not aggregate evidence.** Every fix in this order must carry: the file and
   line changed, the command that shows the fix present, and a mutation or A/B showing the guard goes
   **red for the right reason**. A green test that has never been shown red is not evidence.

## 3. Known stale citations — do not trust these line numbers

| Citation | Reality |
|---|---|
| `safe-migrate.mjs:415` → `render-start.mjs:87-90` | 87-90 is the expanded-exercises seeder; the non-fatal migration catch is at **95-100**. **Corrected**, and the test now verifies the cited range contains the catch. |
| `migrationGuardTableNames.test.mjs:102` → `startup.mjs:202` as the production mechanism | `:202` is development-only. **Corrected** to `startup.mjs:207-214` → `productionDatabaseSync.mjs:41-53`. |
| `chartDataControllerSchemaDrift.test.mjs:15` → `chartDataController.mjs:22-33` for `safeQuery` | `safeQuery` is at **:66**. **Corrected**; the symbol name is the stable handle. |
| `migrationDiscovery.test.mjs:16` | Flagged by Astra as a comment citation that is not an executable check. **Not corrected — verify on contact.** |
| Ledger H-04 → `safe-migrate.mjs:141-146` for the discovery code | Those lines are now the `--to` spawn block; discovery moved to **:211-243**. The ledger text is preserved per Rule 86. |

**Rule for this order:** when you cite a line, read it. Three of the five above named the wrong
mechanism, and each would have led a fix agent to change the wrong thing.

## 4. Standing constraints

- **No commits, no `git add`, no push.** 1,217 dirty files on a non-main branch (Rule 46/67).
- **No production writes and no production DB connection.** H-07's production observation is
  `[UNKNOWN]` from this tree and must come from a separately authorised, timestamped read.
- **No OpenRouter spend.** Astra is reached on the subscription seat
  (`scripts/consult-astra-subscription.mjs`), which is $0 marginal.
- **Do not widen migration execution** by changing only the outer runner's filter (H-04's later
  correction). Inventory the inert set first.
- **Do not guard the 23 unguarded ALTERs blind.** That hides the schema-authority decision (M-02)
  rather than answering it.

## 5. Provenance

- Review that produced this order: `tmp/astra-consult-ledger-falsification/reply.md` (Mega Blueprint,
  PART A finding F2), adjudicated in the ledger at **§23.1**.
- This pass's independent verification of the three §0 items: ledger **§23.3**.
- Fixes already applied under this order: ledger **§23.4** (X1–X5).
```

---

## 4. EVIDENCE A — SCHEMA AUTHORITY: THREE CLAIMS ABOUT `users.id`

These are the three artifacts that disagree. All excerpts are verbatim, read 2026-09-20.

### 4.1 The model says INTEGER — `backend/models/User.mjs`

```javascript
// backend/models/User.mjs:22-28
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Basic personal details
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
```

and, at the bottom of the same `init` options object:

```javascript
// backend/models/User.mjs:552-553
    tableName: '"Users"',
    timestamps: true,
```

**`tableName: '"Users"'` is a QUOTED, capitalised identifier.** In PostgreSQL, `"Users"` and `users`
are **different tables**.

### 4.2 The migration says UUID, and lowercase — `backend/migrations/20250212060728-create-user-table.cjs`

```javascript
// backend/migrations/20250212060728-create-user-table.cjs:325-343
    try {
      console.log('Executing migration: 20250212060728-create-user-table');
      
      // Check if the users table already exists
      const tables = await queryInterface.showAllTables({ transaction });
      if (tables.includes('users')) {
        console.log('Table users already exists. Skipping creation.');
        await transaction.commit();
        return;
      }
      
      // Create users table with all fields from the model
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
```

### 4.3 The orientation guard says UUID — `backend/migrations/20240115000000-update-orientation-model.cjs`

```javascript
// backend/migrations/20240115000000-update-orientation-model.cjs:1-42
// Migration to add new fields to Orientation table
//
// H-01 fix (hostile review of the review, 2026-09-18).
//
// This is the lexicographically earliest migration in the repo
// (timestamp 20240115000000), so it is ALWAYS first in the pending chain.
// It alters a table named `orientations` that no migration in the repository
// ever creates — the table only ever existed because `sequelize.sync({alter})`
// built it from models/Orientation.mjs. On a genuinely empty database the
// chain therefore died on migration #1 with
//   ERROR: relation "orientations" does not exist
// which broke fresh onboarding, CI shadow gates and disaster recovery
// simultaneously.
//
// The guard below is `queryInterface.tableExists(...)`, deliberately NOT the
// `SELECT EXISTS`-against-information_schema pattern that has silently no-oped
// four times in this repo (it returns a wrapped row object, not a boolean, so
// `if (!result)` is always false).
//
// The file is NOT deleted: production already has it recorded in
// SequelizeMeta, and deleting it would rewrite history for no benefit.
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // No `orientations` table => nothing to alter. Skipping keeps a fresh
    // database bootstrappable instead of wedging the entire chain at #1.
    if (!(await queryInterface.tableExists('orientations'))) {
      console.log('  [20240115000000] orientations table absent — skipping (H-01 guard)');
      return;
    }

    return queryInterface.sequelize.transaction(async (transaction) => {
      // Make userId nullable
      await queryInterface.changeColumn('orientations', 'userId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      }, { transaction });
```

### 4.4 The measured consequence — verified, not relayed

Commands run against the working tree 2026-09-20:

```console
$ grep -rln 'createTable("Users"' backend/migrations/     # quoted, capital U
(nothing)

$ grep -rln "createTable('users'" backend/migrations/
backend/migrations/20250212060728-create-user-table.cjs
backend/migrations/20250528140000-fix-uuid-integer-mismatch.cjs
backend/migrations/20250601000001-comprehensive-database-cleanup.cjs
backend/migrations/DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs
backend/migrations/UUID-INTEGER-TYPE-MISMATCH-FIX.cjs
```

**No migration in this repository creates a table named `"Users"`.** Five migrations create a table
named `users`. The model reads and writes `"Users"`.

This is the M-02 dual-schema-authority defect in its most literal form: in production, `"Users"` is
created by `sequelize.sync()` from the model at boot, and `users` is created by migrations — **two
different tables, one of which the application actually uses.**

### 4.5 The house rule that mandates the quoted name

From the governing skill, `.claude/skills/fable-blueprint-forge/SKILL.md` (inlined in full in the
Appendix), line 83:

> `06-bans.md` — the "do NOT" list: house rules restated for a context-free builder (...; **FKs
> reference `"Users"`**; no `git add -A`; ...)

So the house rule requires foreign keys to reference `"Users"` — a table no migration creates. Any
package you forge must resolve this, not restate it.

---

## 5. EVIDENCE B — THE EMERGENCY-REPAIR FAMILY AND THE SORT TAIL

### 5.1 The measured chain, from the runner's own exported API

The runner now exports `getAllMigrationFiles()`, so this is the runner's real answer, not an
inference from `ls`:

```console
$ cd backend && node -e "import('./scripts/safe-migrate.mjs').then(m=>{const {executable,inert}=m.getAllMigrationFiles();
  console.log('executable:',executable.length,' inert:',inert.length);
  console.log('LAST 6:'); executable.slice(-6).forEach(f=>console.log('  ',f));})"

executable: 312  inert: 38
LAST 6:
   20260916-create-coach-signals.cjs
   20260916-create-swan-spotlights.cjs
   20260918-create-social-prompts-of-the-day.cjs
   DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs
   EMERGENCY-DATABASE-REPAIR.cjs
   UUID-INTEGER-TYPE-MISMATCH-FIX.cjs
```

Positions in the 312-entry executable list:

| pos | file | lines |
|---|---|---|
| 44 | `20250528140000-fix-uuid-integer-mismatch.cjs` | 436 |
| 49 | `20250601000001-comprehensive-database-cleanup.cjs` | (creates `users`) |
| 309 | `DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs` | 254 |
| 310 | `EMERGENCY-DATABASE-REPAIR.cjs` | 350 |
| 311 | `UUID-INTEGER-TYPE-MISMATCH-FIX.cjs` | 324 |

### 5.2 The mechanism — why three files run LAST

`discoverMigrationFiles()` returns `out.sort()` (`safe-migrate.mjs:232`). That is a **plain
lexicographic sort**. In ASCII, digits (`0x32`–`0x39`) sort **before** letters (`0x41`+). Therefore
any migration whose filename begins with a letter sorts **after every timestamped migration** —
regardless of intent.

**Three files begin with a letter, and all three run at the very end of the chain:**

- `DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs`
- `EMERGENCY-DATABASE-REPAIR.cjs`
- `UUID-INTEGER-TYPE-MISMATCH-FIX.cjs`

### 5.3 The family — five overlapping "repair" migrations

All five address the same underlying `users.id` UUID↔INTEGER conflict. Verbatim headers:

```javascript
// backend/migrations/20250528140000-fix-uuid-integer-mismatch.cjs:1-12  (436 lines, pos 44)
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 EMERGENCY FIX: Converting users.id from UUID to INTEGER...');
    
    try {
      // Step 1: Check current users table structure
      const usersTableDesc = await queryInterface.describeTable('users');
      console.log('Current users.id type:', usersTableDesc.id?.type);
      
      // Step 2: If users.id is UUID, we need to convert it to INTEGER
      if (usersTableDesc.id?.type?.includes('uuid')) {
        console.log('⚠️ Users table has UUID primary key, converting to INTEGER...');
```

```javascript
// backend/migrations/UUID-INTEGER-TYPE-MISMATCH-FIX.cjs:1-11  (324 lines, pos 311)
'use strict';

/**
 * UUID vs INTEGER TYPE MISMATCH FIX
 * =================================
 * This migration fixes the fundamental type incompatibility between
 * sessions.userId (UUID) and users.id (INTEGER) that's preventing
 * foreign key constraints from being created.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 FIXING UUID vs INTEGER TYPE MISMATCH...');
```

```javascript
// backend/migrations/DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs:1-9  (254 lines, pos 309)
'use strict';

/**
 * DIRECT UUID vs INTEGER FOREIGN KEY CONSTRAINT FIX
 * ================================================
 * This migration directly fixes the exact error:
 * "foreign key constraint "sessions_userId_fkey" cannot be implemented"
 * "Key columns "userId" and "id" are of incompatible types: uuid and integer"
```

```javascript
// backend/migrations/EMERGENCY-DATABASE-REPAIR.cjs:1-8  (350 lines, pos 310)
'use strict';

/**
 * EMERGENCY DATABASE REPAIR MIGRATION
 * ==================================
 * This migration fixes all identified database issues and prepares
 * the system for the Enhanced Social Media Platform.
```

Note the **self-contradiction inside the family**: `UUID-INTEGER-TYPE-MISMATCH-FIX.cjs` says the
mismatch is "between `sessions.userId` (UUID) and `users.id` (INTEGER)" — i.e. it asserts
`users.id` is already INTEGER. `20250528140000-fix-uuid-integer-mismatch.cjs` asserts the opposite
("If users.id is UUID ... converting to INTEGER") and is written to convert it. Both cannot describe
the same database state, and neither carries a record of what it observed.

### 5.4 The naming-convention violations

18 top-level `.cjs` migrations do **not** carry a 14-digit timestamp prefix. 15 of them still begin
with a digit (e.g. `20260308-create-gallery-tables.cjs` — 8 digits, not 14), so they sort among the
dated ones with an *ambiguous* position. The remaining 3 begin with a letter and sort last.

```console
$ ls -1 backend/migrations/*.cjs | grep -vE '^[0-9]{14}-' | tail -6
20260916-create-coach-signals.cjs
20260916-create-swan-spotlights.cjs
20260918-create-social-prompts-of-the-day.cjs
DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs
EMERGENCY-DATABASE-REPAIR.cjs
UUID-INTEGER-TYPE-MISMATCH-FIX.cjs
```

---

## 6. EVIDENCE C — THE DEPLOY PATH AND THE TEST INFRASTRUCTURE

### 6.1 What runs in production — `backend/scripts/render-start.mjs:40-101`

```javascript
async function start() {
  // Run pending migrations (safe — auto-skips already-applied)
  if (process.env.DATABASE_URL) {
    console.log('\nRunning safe database migrations...');
    // H-03 (hostile review of the review): SWAN_MIGRATE_STRICT is deliberately
    // NOT set here, and setting it would be a regression.
    //
    // safe-migrate.mjs now exits non-zero on a genuine failure and leaves that
    // migration PENDING (so it can be fixed and re-run) — which is the part of
    // the H-03 remedy that actually mattered. STRICT additionally disables the
    // "already exists" reclassification entirely, and production's populated
    // tables legitimately produce those on idempotent re-runs; switching it on
    // would leave a permanent list of migrations failing on every deploy.
    //
    // The catch block below keeps a migration failure non-fatal, so the deploy
    // still boots — it just no longer logs "Migrations completed successfully"
    // over migrations that did not run.
    try {
      await run('node', ['scripts/safe-migrate.mjs', 'production']);
      console.log('Migrations completed successfully');
      // ... achievement seeder, NASM seeder, expanded-exercise seeder (all non-fatal) ...
    } catch (err) {
      // Migration failure is non-fatal — let the server start so we can debug
      console.error('WARNING: Migration failed (non-fatal):', err.message);
      console.error('The server will start but some features may not work correctly.');
      console.error('Check the migration error above and fix manually if needed.');
    }
  }
```

**The critical property: a migration failure does NOT stop the deploy.** `render-start.mjs:95-100`
catches it and boots the server anyway. So `safe-migrate.mjs`'s non-zero exit is a *log honesty*
mechanism, not a deploy gate.

### 6.2 The two sync paths — `backend/core/startup.mjs:200-216`

Note the file is at `backend/core/startup.mjs`, not `backend/startup.mjs` (the successor's citation
of `startup.mjs:201-202` is correct in content, and the path resolves under `backend/core/`).

```javascript
    // Development database sync (NEVER in production)
    if (!isProduction && process.env.AUTO_SYNC === 'true') {
      try {
        await sequelize.sync({ alter: true }); 
        logger.info('Database synchronized in development mode');
      } catch (syncError) {
        logger.error(`Error syncing database: ${syncError.message}`);
      }
    } else if (!shouldRunProductionDatabaseSync()) {
      logger.info(
        'Database repair sync skipped outside production; set STARTUP_DATABASE_REPAIR=true to run it locally.',
      );
    } else {
      // ENHANCED: Production-safe database sync with dependency-aware table creation
      try {
      const syncResult = await syncDatabaseSafely();
      if (syncResult.success) {
      logger.info(`✅ ENHANCED: Production database sync completed successfully`);
```

**Measured fact: `sync({ alter: true })` is gated on `!isProduction && AUTO_SYNC === 'true'`, so it
never runs in production.** The successor's §0 correction of H-07/M-02 is therefore accurate.

### 6.3 The production repair path — `backend/utils/productionDatabaseSync.mjs`

```javascript
// backend/utils/productionDatabaseSync.mjs:41-53
const createMissingTables = async () => {
  try {
    logger.info('🔍 ENHANCED: Checking for missing database tables with dependency management...');
    
    // Get all models
    const models = await getModels();
    
    // Validate table creation order first
    const orderValidation = validateTableOrder(models);
    logger.info(`📋 Table validation: ${orderValidation.tableCount} tables found, ${orderValidation.missingFromOrder.length} not in dependency order`);
    
    // Create tables in proper dependency order
    const creationResults = await createTablesInOrder(models);
```

```javascript
// backend/utils/productionDatabaseSync.mjs:262-283
const syncIndexesAndConstraints = async () => {
  try {
    logger.info('🔗 ENHANCED: Syncing database indexes and constraints with enhanced error handling...');
    
    // Use safer sync options that won't drop existing constraints
    await sequelize.sync({ 
      alter: { 
        drop: false  // Never drop existing constraints
      },
      hooks: false,  // Skip hooks for performance
```

**So the production schema authority is: models → `createTablesInOrder(models)` at boot.** The
migration system is *not* the authority for tables the models create — including `"Users"`.

### 6.4 The guard test and its 23-entry debt register

**Path:** `backend/tests/unit/migrationGuardTableNames.test.mjs` · 273 lines.
**What it is:** a *source-text ratchet*. It reads migration files as text and asserts that no ALTER
precedes a CREATE for the same table, with 23 known violations pinned in an exact-match register.

```javascript
/**
 * KNOWN DEBT REGISTER — the violations that exist at the time this guard
 * landed (2026-09-18). It is asserted EXACTLY, which means:
 *
 *   - adding a new violation  -> test FAILS (the invariant is now protected)
 *   - fixing one of these     -> test FAILS until the entry is removed here
 *     (deliberate: the register must stay a true statement, not drift into
 *      a permanent excuse)
 *
 * WHY 23 AND NOT 0
 * ----------------
 * 22 of the 23 alter `"Users"`, and the 23rd alters `"SocialLikes"`. None of
 * them is created by ANY migration. They work in production only because the
 * production repair path creates missing tables from the models at boot:
 * `startup.mjs:207-214` calls `syncDatabaseSafely()`, which runs
 * `createMissingTables()` -> `createTablesInOrder(models)`
 * (`backend/utils/productionDatabaseSync.mjs:41-53`, `:313-324`) over every
 * model `getModels()` returns.
 *
 * CORRECTED 2026-09-20 (Astra RT-1). This comment previously cited
 * `backend/core/startup.mjs:202` as the mechanism. That line is the OTHER
 * branch: `sync({ alter: true })` there is gated on
 * `!isProduction && AUTO_SYNC === 'true'`, so it never runs in production.
 * The citation named a development-only call as the production schema
 * authority — which is exactly the "two schema authorities" problem M-02
 * filed, in its most literal form: models/User.mjs declares
 * `tableName: '"Users"'`, while the only migration that creates a
 * user table (20250212060728-create-user-table.cjs:337) creates lowercase
 * `users`. In PostgreSQL `"Users"` and `users` are DIFFERENT TABLES.
 *
 * Fixing this is not a 23-file guard sweep — it is the schema-authority
 * decision (M-02): either a migration creates `"Users"`, or sync stops being
 * the authority. Guarding them blind would hide the question rather than
 * answer it. See the review ledger §12 for the full write-up.
 */
const KNOWN_UNGUARDED = [
  '20250107000001-add-master-prompt-fields.cjs alters "Users", which no migration at or before it creates',
  '20250709000000-add-stripe-customer-id-to-users.cjs alters "Users", which no migration at or before it creates',
  '20251229000000-add-missing-user-columns.cjs alters "Users", which no migration at or before it creates',
  '20260117000002-add-universal-schedule-fields.cjs alters "Users", which no migration at or before it creates',
  '20260212000001-add-force-password-change.cjs alters "Users", which no migration at or before it creates',
  '20260212000002-add-banner-photo.cjs alters "Users", which no migration at or before it creates',
  '20260222000001-add-is-onboarding-complete.cjs alters "Users", which no migration at or before it creates',
  '20260228100001-add-measurement-schedule-fields.cjs alters "Users", which no migration at or before it creates',
  '20260302050000-gamification-bootstrap.cjs alters "Users", which no migration at or before it creates',
  '20260308000002-add-reaction-types.cjs alters "SocialLikes", which no migration at or before it creates',
  '20260314000001-add-client-source-to-users.cjs alters "Users", which no migration at or before it creates',
  '20260315000001-add-achievement-roles-rewards-privacy.cjs alters "Users", which no migration at or before it creates',
  '20260315000002-fix-missing-user-achievement-columns.cjs alters "Users", which no migration at or before it creates',
  '20260322000002-add-chart-visibility-to-users.cjs alters "Users", which no migration at or before it creates',
  '20260323000000-add-streak-freeze-fields.cjs alters "Gamifications", which no migration at or before it creates',
  '20260328120000-add-aegis-hud-needs.cjs alters "Gamifications", which no migration at or before it creates',
  '20260406000001-create-e2ee-tables.cjs alters "messages", which no migration at or before it creates',
  '20260502000000-add-can-generate-workout-plans-to-users.cjs alters "Users", which no migration at or before it creates',
  '20260510000001-add-banner-object-position.cjs alters "Users", which no migration at or before it creates',
  '20260524000100-expand-banner-crop-controls.cjs alters "Users", which no migration at or before it creates',
  '20260524000200-add-banner-frame-height.cjs alters "Users", which no migration at or before it creates',
  '20260525000100-add-banner-presentation-presets.cjs alters "Users", which no migration at or before it creates',
  '20260526000100-add-client-soft-delete-retention-columns.cjs alters "Users", which no migration at or before it creates',
];
```

**Register entry count verified: 23.**

### 6.5 The test files that exist today

| file | lines | what it does |
|---|---|---|
| `backend/tests/unit/safeMigrateExitCode.test.mjs` | 154 | asserts the runner's source text: the non-fatal catch range, the exit path |
| `backend/tests/unit/safeMigrateControlFlow.test.mjs` | 255 | executes the runner's real `main()` against intercepted `sequelize`/`child_process` boundaries via a Node ESM resolve hook |
| `backend/tests/unit/migrationGuardTableNames.test.mjs` | 273 | the source ratchet above |
| `backend/tests/helpers/f5-runner-harness/` | 8 files, 461 lines | `driver.mjs`, `hooks.mjs`, `mutants.mjs`, `register.mjs`, `runRunner.mjs`, `stubs/child_process.mjs`, `stubs/sequelize.mjs`, `.gitignore` |

The harness is a **Node ESM resolve-hook** design: it installs a loader that redirects the specifiers
`sequelize` and `child_process` to stub modules, then imports the runner and calls `main()`. It runs
7 scenarios plus 2 mutation self-checks (9/9 passing). It was built to satisfy a hostile-review
finding that every prior guard against this file asserted on **source text** rather than executing
the control flow.

### 6.6 The measurement discipline this repo now demands

From the successor §2, and worth restating because it constrains the acceptance criteria you write:

> **"Nothing broke" is not a claim you may make from a suite total.** (...) Record the failing set
> before and after, by name.
> **Per-change evidence, not aggregate evidence.** (...) A green test that has never been shown red
> is not evidence.

---

## 7. THE OPEN DECISIONS YOUR PACKAGE MUST RESOLVE

Each of these is currently **undecided**. Your PART C must show every one either decided or
explicitly delegated with bounds. Do not leave them to a builder.

**D1 — What IS production's `users.id` type, and how is it established?**
Not determinable from the tree. It depends on whether `20250528140000-fix-uuid-integer-mismatch.cjs`
(pos 44) or `UUID-INTEGER-TYPE-MISMATCH-FIX.cjs` (pos 311) ever ran, and on whether
`sequelize.sync()` created `"Users"` from the model (INTEGER) while migrations created `users`
(UUID). The plan must specify a **read-only, timestamped observation** that settles it, and must
treat both answers as live until then.

**D2 — Which table name wins: `"Users"` or `users`?**
The model says `"Users"`. Five migrations say `users`. The house rule says FKs reference `"Users"`.
No migration creates `"Users"`. This is a rename-or-adopt decision with a data-migration consequence
in production, and it is the operator's, not the builder's. Your package must present the options
with their consequences and mark the decision as owner-held if it cannot be made from the evidence.

**D3 — Which PK type wins: UUID or INTEGER?**
`models/User.mjs:25` = INTEGER autoIncrement. `20250212060728-create-user-table.cjs:339` = UUID.
`20240115000000-update-orientation-model.cjs:36` (the FK) = UUID. Five repair migrations exist to
move UUID→INTEGER. Which one the *rest* of the schema assumes (e.g. `sessions.userId`) must be
established, not assumed — the `DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs` header claims
`sessions.userId` is UUID while `users.id` is INTEGER, which is precisely a broken FK pair.

**D4 — What happens to the three letter-prefixed migrations that sort LAST?**
`DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs`, `EMERGENCY-DATABASE-REPAIR.cjs`,
`UUID-INTEGER-TYPE-MISMATCH-FIX.cjs`. They are already recorded in production's `SequelizeMeta`
(probably), so renaming them changes nothing for production but changes the order for every fresh
database. Decide: rename to 14-digit timestamps, fold into one, or delete. Note the constraint that
they must not be *deleted* if production has them recorded (the orientation migration's comment at
`:20-21` states the repo's precedent for exactly this).

**D5 — The 38 inert files.**
32 `.mjs` + `migrations/social/*`. They can never run under sequelize-cli 6.6.2. The runner reports
them. Decide the convergence: convert to top-level `.cjs` with unique 14-digit timestamps, or
declare them permanently model-owned and stop pretending they are migrations. The runner's own
`reportInertMigrations` text (`:263-267`) states the constraint that you may **not** solve this by
widening the runner's filter.

**D6 — Does the 23-entry debt register get closed, and how?**
The register is an exact-match ratchet: it fails if a violation is added **or** if one is fixed
without removing the entry. Closing it requires either a migration that creates `"Users"` (which
answers D2) or an explicit decision that models remain the authority for those tables. Guarding the
23 blind is forbidden by the successor §4.

**D7 — What replaces "the suite passes" as the acceptance test?**
No recorded full-suite run is green. Your `05-slices.md` and `09-tests.md` must express acceptance as
**named test files + named cases + the exact command + what each case proves**, with mutation
evidence that each guard goes red for the right reason.

**D8 — `getSequelize()` is dead code and uses `require()` in ESM.**
Delete, or wire up, or document. Small, but it is the kind of silent gap a builder would fill with
its own judgment.

---

## 8. APPENDIX — THE GOVERNING SKILL, INLINED VERBATIM

**This IS the loaded `fable-blueprint-forge` skill. Do not attempt to look it up; the sandbox will
deny the read. The text below is the complete skill.**

````markdown
---
name: fable-blueprint-forge
description: Fable-as-architect, cheaper-AI-as-builder. When Sean wants a feature planned so completely that ANY competent builder AI (Codex, ChatGPT, Claude Sonnet, a fresh session with zero repo context) can build it exactly as Fable would — architecture docs, Mermaid flowcharts, sequence diagrams, ERDs, ASCII/HTML wireframes, file-by-file build order, exact signatures/paths/copy/tokens, "do NOT" bans, and executable per-slice acceptance criteria — then Fable reviews each built slice at the boundary. Kills vibe-coding: the plan makes every decision so the builder makes none. Distinct from fable-deep-sight (reads what EXISTS), grill-me (extracts intent), chromie (pressure-tests the bet) — this FORGES the build package. Use when Sean says "blueprint this", "forge the plan", "make it so another AI can build it", or /fable-blueprint-forge.
---

# Fable Blueprint Forge

## Role

Fable (or the strongest available Claude, per the Final Decider fallback chain) is the **architect**.
A cheaper/high-token AI is the **builder**. The builder will fill every gap in the plan with its own
judgment — and a weaker model fills gaps worse. So the Forge's job is to leave **no gaps that
matter**: every place a builder *could* choose, the plan chooses for it. The output is a
self-contained build package a builder with ZERO repo access or context can execute faithfully.

Three laws (the whole skill in one breath):
1. **Decision-dense, not just long.** Exact file paths, exact function signatures, exact API
   request/response shapes, exact copy strings, exact palette tokens, explicit "do NOT" bans.
2. **Executable acceptance criteria per slice.** Not "auth works" — "these N named tests pass;
   this exact curl returns this exact JSON; this viewport renders this wireframe."
3. **Fable checkpoints, not Fable absence.** Builder types; architect reviews every slice
   boundary. Review-a-diff costs a tiny fraction of write-the-code.

## Pipeline position

`grill-me` (intent) → `chromie` (if the bet is unproven) → **`fable-blueprint-forge`** (this skill:
plan package) → builder executes slice-by-slice → **Forge checkpoint** per slice → `closeout-evidence-lock`
+ rule 48 audit record at phase close. The Forge does NOT replace recursive planning (rule 15) — it
IS the maximal form of it.

## When To Use

- Sean wants a substantial feature/system planned by the best brain and built by a cheaper one
  (Codex worktree agent, ChatGPT/GPT-5.x, a fresh Claude session, a Workflow fleet).
- The builder will NOT have repo access, or will have limited context — the package must carry
  everything.
- Sean says "planned, not vibe-coded," "blueprint everything," "wireframes and mermaids," "build it
  exactly like Fable would."

## When NOT to use

- Small slices Claude/Codex can just build under normal rules (15/17/26) — the Forge overhead isn't
  worth it below ~a multi-day feature.
- Intent is still fuzzy → run `grill-me` first. Bet is unproven → `chromie` first. The Forge
  assumes the WHAT is decided; it forges the HOW.
- Auditing existing code → `fable-deep-sight`.

## Phase 1 — Repo Truth Harvest (architect side, before writing a word of plan)

The #1 way handoff plans fail: they cite files/routes/models that don't exist or have drifted.
Before forging, gather with file:line evidence:
- Canonical surfaces the feature touches (rule 26 receipt discipline; route mounts, mounted JSX).
- Real model columns from model files + drift check (rule 58) for every table touched.
- Existing patterns to copy (rule 18): one working in-repo example per pattern the builder will
  need (a styled-component card, a route+controller pair, a Victory chart, a test file shape).
- The mount points: exactly where new routes/components/nav entries plug in.
Paste the relevant excerpts INTO the package — the builder can't grep the repo.

## Phase 2 — Forge the Build Package

Write to `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-<feature-slug>-<YYYY-MM-DD>/` as a small doc set
(one dir, numbered files, each ≤~300 lines so any builder can load them piecemeal):

1. `00-README.md` — what this is, build order, how to use the package, the Builder Contract (below).
2. `01-architecture.md` — system overview, component tree, data flow, **Mermaid**: `flowchart` for
   user/data flows, `sequenceDiagram` for every API interaction, `erDiagram` for schema (new +
   touched tables, exact column names/types), state diagrams where state machines exist.
3. `02-wireframes.md` — ASCII wireframes for every screen/state (desktop + 375px mobile), or an
   HTML mockup file per screen for visual surfaces. Every button, label, empty/loading/error state
   drawn. Exact copy strings. Exact palette tokens (`var(--token, #fallback)`).
4. `03-contracts.md` — every API endpoint: method, exact path, auth requirement, request JSON,
   response JSON (success + each error), status codes. Every exported function the builder must
   create: exact signature with types. Every model: full Sequelize definition text.
5. `04-build-order.md` — **file-by-file**: for each file — path, purpose, ≤300-line budget, what it
   imports, what it exports, which in-repo example to mimic (excerpt included), and the slice it
   belongs to. Ordered so every slice leaves the app bootable.
6. `05-slices.md` — the slice plan. Each slice: scope (files), the decisions already made,
   **executable acceptance criteria** (named test files + counts, exact curl + expected JSON,
   exact viewport checks), and STOP line: "do not proceed to slice N+1 until checkpoint passes."
7. `06-bans.md` — the "do NOT" list: house rules restated for a context-free builder (no MUI;
   styled-components only; Victory only; no hardcoded colors; 44px targets; dark-first; no
   yoga/meditation wording; zero PII to LLMs; ≤300 lines/file; `css` helper for shared style
   fragments; FKs reference `"Users"`; no `git add -A`; commit style `type(scope): desc`) PLUS
   feature-specific bans ("do NOT create a new route file for X, mount in Y", "do NOT touch Z").
8. `07-checkpoints.md` — the checkpoint protocol (Phase 3) and the review remit text to reuse.

**Decision-density self-test before calling the package done:** read each slice as a hostile
builder and list every choice you'd still have to make. Each one is either (a) decided in the
package now, or (b) explicitly delegated with bounds ("builder's choice, must satisfy X"). Zero
silent gaps. This is the Forge's rule-17 hostile pass.

**Privacy/secrets:** package is committed — IDs/roles only, no PII, no secrets, no env values
(rules 8/44). Run `bash scripts/scan-secrets.sh` over the package dir.

## Phase 3 — Builder Execution + Checkpoints

**Builder Contract (paste into 00-README.md and the builder's first prompt):**
> You are the builder, not the architect. Follow the package to the letter. Where the package
> decides, you do not re-decide — even if you'd do it differently. Where the package is silent on
> something that matters, STOP and return the question; do not improvise. Build ONE slice at a
> time; after each slice, output the diff + the acceptance-criteria evidence (test output, curl
> results, screenshots) and WAIT for the checkpoint verdict before continuing. Never claim a
> criterion passed without pasting its output.

**Checkpoint (architect side, per slice):** diff review against the package — (1) every acceptance
criterion verified with real output; (2) drift scan: anything built that the package didn't specify,
anything specified that wasn't built, any ban violated; (3) verdict `PASS / REVISE (list) / HALT`.
Checkpoints may run on paid Fable (ask Sean first, rule 16 / free-first ladder) or the free
triangle / strongest local Claude when Sean prefers $0. Log verdicts in
`07-checkpoints.md` or the rule-67 review queue.

## Output Contract (chat, when the package is forged)

```text
BLUEPRINT FORGE: <feature> — PACKAGE READY
Location: docs/ai-workflow/AI-HANDOFF/BLUEPRINT-<slug>-<date>/
Slices: N · Files planned: N · Diagrams: N mermaid + N wireframes
Decision-density self-test: PASS (0 silent gaps / N delegated-with-bounds)
Secret scan: PASS
Builder target: <Codex worktree | ChatGPT | fresh Claude | workflow fleet>
First slice + its acceptance criteria: <one line>
Checkpoint plan: <who reviews, paid or free>
```

## Hard Rules

- Architect never skips Phase 1 — a plan citing unverified repo state is vibe-planning (rules
  26/58 apply to the PLAN, not just code).
- Paid Fable authorship/checkpoints are spend-gated: ask Sean first; offer the free ladder.
- The package must work for a builder with ZERO repo access — no "see CLAUDE.md", no "grep for
  X"; everything needed is IN the package.
- Builder deviations are never merged silently — REVISE or HALT, and drift found at checkpoint
  goes back to the builder, not patched by the architect (or the token economics invert).
- Rule 48 audit record still lands at phase close; the package + checkpoint log feed it directly.
````

---

## 9. CLOSING

Two reminders, then you are done reading.

1. **There are no screens, no HTTP endpoints, no UI and no palette in this work.** Answer
   `02-wireframes.md` as `N/A — <reason naming what is absent>` rather than inventing a screen. The
   mermaid and ERD requirements in `01-architecture.md` **do** apply: this is a schema and
   control-flow subject, so a real `erDiagram` of the user/session/orientation tables and a real
   `flowchart` of the runner's control flow are both required and both derivable from the excerpts
   above.

2. **The single most valuable thing you can produce** is a resolved schema-authority decision with
   the evidence for it, and a chain remediation that does not depend on which of the five repair
   migrations happened to run. Everything else is secondary.
