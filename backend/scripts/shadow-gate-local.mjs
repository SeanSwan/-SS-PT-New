#!/usr/bin/env node
/**
 * shadow-gate-local.mjs — run the migration shadow gate on this machine, with no GitHub.
 *
 * WHY THIS EXISTS
 * ---------------
 * The gate in .github/workflows/migration-shadow-check.yml has been through four hostile review
 * rounds and roughly twenty real defects. It has never executed once, because every GitHub
 * Actions run in this repository ends in `startup_failure` — an account-level billing block that
 * no change in this repo can clear (see AI-HANDOFF/ACTIONS-DEAD-BILLING-DIAGNOSIS-2026-08-25.md).
 *
 * Nothing about the gate actually requires GitHub. It needs a throwaway Postgres and the repo.
 * So this runs the same sequence locally: baseline migrations, seed, delta against populated
 * tables, module-graph proof. Four rounds of paper-verified work become executed work today,
 * and the billing fix stops being a prerequisite for knowing whether any of it works.
 *
 * SAFETY — read before running. This script creates and DROPS a database.
 *   - It starts its OWN disposable Docker container on port 55432, NOT the machine's Postgres on
 *     5432. Nothing it does can reach an existing local database.
 *   - It sets DATABASE_URL explicitly for every child process and NEVER inherits the ambient one.
 *     That matters here specifically: this project's own docs note that local development points
 *     DATABASE_URL at PRODUCTION. An inherited value is the one way this could go badly wrong, so
 *     it is overwritten rather than defaulted.
 *   - The container name is fixed and namespaced (`swan-shadow-gate-local`), so teardown removes
 *     exactly what it created and nothing else.
 *   - It never writes to the repository. `git checkout` is used to move `backend/migrations` and
 *     `backend/models` between BASE and HEAD, and the tree is restored on exit — including on
 *     Ctrl-C and on failure.
 *
 * USAGE
 *   node backend/scripts/shadow-gate-local.mjs                  # base = merge-base with main
 *   node backend/scripts/shadow-gate-local.mjs --base <sha>
 *   node backend/scripts/shadow-gate-local.mjs --keep           # leave the container up to poke at
 *
 * EXIT CODE mirrors the gate: 0 = the delta applied cleanly against populated tables.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (f, d = '') => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const has = (f) => argv.includes(f);

const CONTAINER = 'swan-shadow-gate-local';
const PORT = arg('--port', '55432');
// --db-url lets the operator point at a Postgres they already run, for when Docker is not
// available. The seeder's own gate still applies (loopback + "shadow" in the database name,
// no override), so this cannot become a way to aim the seeder at production.
const EXTERNAL_DB = arg('--db-url', '');
const DB_URL = EXTERNAL_DB || `postgres://shadow:shadow@localhost:${PORT}/shadow`;
const KEEP = has('--keep');

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const backend = path.join(root, 'backend');

let step = 0;
const say = (m) => console.log(`\n[${String(++step).padStart(2, '0')}] ${m}`);
const info = (m) => console.log(`     ${m}`);

/** Child env. DATABASE_URL is SET, never merged from process.env — see SAFETY above. */
const childEnv = () => ({
  ...process.env,
  DATABASE_URL: DB_URL,
  NODE_ENV: 'production',
  SWAN_MIGRATE_STRICT: '1',
});

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || backend,
    env: opts.env === null ? process.env : childEnv(),
    encoding: 'utf8',
    stdio: opts.capture ? 'pipe' : 'inherit',
    shell: process.platform === 'win32',
  });
  return r;
}

function must(label, r) {
  if (r.status !== 0) {
    console.error(`\nFAILED: ${label} (exit ${r.status})`);
    if (r.stdout) console.error(r.stdout.slice(-4000));
    if (r.stderr) console.error(r.stderr.slice(-4000));
    throw new Error(label);
  }
}

// --- tree restore, guaranteed -------------------------------------------------------------
let treeDirty = false;
function restoreTree() {
  if (!treeDirty) return;
  try {
    spawnSync('git', ['checkout', 'HEAD', '--', 'backend/migrations', 'backend/models'],
      { cwd: root, stdio: 'ignore', shell: false });
    treeDirty = false;
    info('working tree restored to HEAD');
  } catch { /* best effort */ }
}

function teardown() {
  restoreTree();
  if (EXTERNAL_DB) return;   // we did not create it; we do not remove it
  if (KEEP) { info(`container ${CONTAINER} left running on :${PORT} (--keep)`); return; }
  spawnSync('docker', ['rm', '-f', CONTAINER], { stdio: 'ignore', shell: false });
}

process.on('exit', teardown);
process.on('SIGINT', () => { teardown(); process.exit(130); });

// -------------------------------------------------------------------------------------------
async function main() {
  console.log('SHADOW GATE — LOCAL RUN');
  console.log(`repo      ${root}`);
  console.log(`database  ${DB_URL.replace(/:[^:@]*@/, ':***@')}  (disposable container, NOT :5432)`);

  // 1. resolve the base
  const base = arg('--base') || (() => {
    for (const ref of ['origin/main', 'main']) {
      const r = spawnSync('git', ['merge-base', ref, 'HEAD'], { cwd: root, encoding: 'utf8' });
      if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
    }
    const r = spawnSync('git', ['rev-parse', 'HEAD^'], { cwd: root, encoding: 'utf8' });
    return r.stdout.trim();
  })();

  say(`base commit: ${base}`);
  const cls = run('node', ['scripts/shadow-delta-audit.mjs', '--base', base, '--mode', 'classify'], { capture: true });
  must('delta classify', cls);
  process.stdout.write(cls.stdout);
  const addedCount = Number((cls.stdout.match(/^added_count=(\d+)/m) || [])[1] ?? NaN);
  if (!Number.isInteger(addedCount)) throw new Error('could not read added_count from the audit');

  // 2. DB-free contracts first — cheapest failure
  say('DB-free self-tests');
  must('seeder selftest', run('node', ['scripts/seed-shadow-db.selftest.mjs']));
  must('table-extractor selftest', run('node', ['scripts/shadow-table-extract.selftest.mjs']));

  // 3. throwaway Postgres
  if (EXTERNAL_DB) {
    say(`using the operator-supplied database at :${new URL(EXTERNAL_DB).port || 5432}`);
    info('skipping the disposable container — --db-url was given');
    info('SAFETY: seed-shadow-db refuses any URL that is not loopback with "shadow" in the');
    info('database name, so this cannot be pointed at production even by mistake.');
  } else {
    say(`starting disposable postgres:16 on :${PORT}`);
    spawnSync('docker', ['rm', '-f', CONTAINER], { stdio: 'ignore', shell: false });
    const up = spawnSync('docker', ['run', '-d', '--name', CONTAINER,
      '-e', 'POSTGRES_USER=shadow', '-e', 'POSTGRES_PASSWORD=shadow', '-e', 'POSTGRES_DB=shadow',
      '-p', `${PORT}:5432`, 'postgres:16'], { encoding: 'utf8', shell: false });
    if (up.status !== 0) {
      const err = (up.stderr || up.stdout || '');
      console.error(err.slice(0, 600));
      const daemonDown = /dockerDesktopLinuxEngine|cannot find the file specified|daemon is not running|Cannot connect to the Docker daemon/i.test(err)
        || spawnSync('docker', ['info'], { encoding: 'utf8', shell: false }).status !== 0;
      if (daemonDown) {
        throw new Error(
          'the Docker CLI is installed but its engine is not running.\n' +
          '  FIX: start Docker Desktop, wait for the whale icon to settle, then re-run this.\n' +
          '  OR:  point this at a Postgres you already have, e.g.\n' +
          '       node backend/scripts/shadow-gate-local.mjs --db-url "postgres://USER:PASS@localhost:5432/swan_shadow_gate"\n' +
          '       (create that database first; the name must contain "shadow" and the host must be loopback —\n' +
          '        the seeder refuses anything else, with no override)',
        );
      }
      throw new Error('could not start the postgres container');
    }

    info('waiting for readiness...');
    let ready = false;
    for (let i = 0; i < 60; i++) {
      const r = spawnSync('docker', ['exec', CONTAINER, 'pg_isready', '-U', 'shadow'],
        { stdio: 'ignore', shell: false });
      if (r.status === 0) { ready = true; break; }
      await new Promise((res) => setTimeout(res, 1000));
    }
    if (!ready) throw new Error('postgres did not become ready in 60s');
    info('ready');
  }

  // 4. LEG A — baseline schema
  say('LEG A — applying the BASE migration set to an empty database');
  treeDirty = true;
  must('checkout BASE migrations+models', spawnSync('git',
    ['checkout', base, '--', 'backend/migrations', 'backend/models'],
    { cwd: root, stdio: 'inherit', shell: false }));
  must('leg A migrate', run('npm', ['run', 'migrate:production']));

  const beforeR = run('node', ['scripts/shadow-meta-count.mjs'], { capture: true });
  must('meta count (before)', beforeR);
  const before = Number(beforeR.stdout.trim());
  info(`SequelizeMeta rows after leg A: ${before}`);

  // 5. seed
  say('SEEDING synthetic rows');
  const seed = run('node', ['scripts/seed-shadow-db.mjs', '--rows', '5'], { capture: true });
  process.stdout.write(seed.stdout || '');
  if (seed.stderr) process.stderr.write(seed.stderr);
  must('seeder', seed);

  const line = (seed.stdout.match(/^SHADOW-SEED \{.*$/m) || [])[0];
  if (!line) throw new Error('no SHADOW-SEED report line — silent no-op seed');
  const report = JSON.parse(line.replace(/^SHADOW-SEED /, ''));
  info(`rows inserted: ${report.rows}`);
  if (!Number.isInteger(report.rows) || report.rows <= 0) {
    throw new Error(`seeder reported ${report.rows} rows — the delta would test nothing`);
  }
  const skipped = (report.skipped || []).join('; ');
  info(skipped ? `tables NOT populated: ${skipped}` : 'tables NOT populated: none');

  // 6. LEG B — the real test
  say('LEG B — applying THIS change\'s migrations against populated tables');
  must('restore HEAD migrations+models', spawnSync('git',
    ['checkout', 'HEAD', '--', 'backend/migrations', 'backend/models'],
    { cwd: root, stdio: 'inherit', shell: false }));

  if (addedCount === 0) {
    info('this change adds no migrations — leg B is NOT APPLICABLE (not a pass)');
  } else {
    must('leg B migrate', run('npm', ['run', 'migrate:production']));
  }

  const afterR = run('node', ['scripts/shadow-meta-count.mjs'], { capture: true });
  must('meta count (after)', afterR);
  const after = Number(afterR.stdout.trim());
  const applied = after - before;
  info(`SequelizeMeta rows after leg B: ${after}  (applied ${applied})`);

  say('DELTA AUDIT');
  const verify = run('node', ['scripts/shadow-delta-audit.mjs',
    '--base', base, '--mode', 'verify',
    '--applied', String(applied), '--skipped', skipped], { capture: true });
  process.stdout.write(verify.stdout || '');
  if (verify.stderr) process.stderr.write(verify.stderr);
  must('delta audit', verify);

  // 7. module graph
  say('MODULE GRAPH — does the backend entry point resolve from this tree?');
  const entry = run('node', ['-p', "require('./package.json').main || 'server.mjs'"], { capture: true });
  const ENTRY = (entry.stdout || 'server.mjs').trim();
  info(`entry point: ${ENTRY}`);
  const graph = spawnSync('node', ['--input-type=module', '-e', `
    const t = setTimeout(() => { console.error('entry point did not resolve within 20s'); process.exit(1); }, 20000);
    try { await import('./' + process.env.ENTRY); clearTimeout(t); console.log('module graph resolved'); process.exit(0); }
    catch (e) { clearTimeout(t); console.error('ENTRY POINT FAILED TO LOAD:'); console.error((e && e.stack) || e); process.exit(1); }
  `], { cwd: backend, env: { ...childEnv(), ENTRY }, encoding: 'utf8', stdio: 'inherit', shell: false });
  must('module graph', graph);

  console.log('\n========================================');
  console.log('SHADOW GATE PASSED (locally)');
  console.log(`  base                ${base}`);
  console.log(`  migrations added    ${addedCount}`);
  console.log(`  applied vs data     ${applied}`);
  console.log(`  seeded rows         ${report.rows}`);
  console.log(`  tables not covered  ${skipped || 'none'}`);
  console.log('');
  console.log('  This is the same sequence the GitHub workflow runs. It is NOT a substitute for');
  console.log('  the CI gate — it runs on this machine, from this working tree, at the operator\'s');
  console.log('  discretion, and can be skipped. It is a way to know the gate works while Actions');
  console.log('  are billing-blocked.');
  console.log('========================================');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(`\n========================================`);
  console.error(`SHADOW GATE FAILED: ${e.message}`);
  console.error(`========================================`);
  process.exit(1);
});
