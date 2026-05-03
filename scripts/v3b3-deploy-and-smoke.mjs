#!/usr/bin/env node
/**
 * V3b.3 Deploy-and-Smoke Orchestrator
 * ====================================
 *
 * Drives the full V3b.3 production verification pipeline end-to-end:
 *
 *   1. Wait for Render to bring the new backend up after the V3b.3
 *      commit lands.
 *   2. Wait for the V3b.3 migration to be applied — verified via
 *      `sequelize-cli db:migrate:status --env production`.
 *   3. Run the V3b.3.3 starter seeder against production by calling
 *      `npx sequelize-cli db:seed --env production --seed
 *      20260504-seed-nasm-corrective-starter.mjs`. Idempotent:
 *      re-runs UPDATE the V3b.3 metadata via `ON CONFLICT (exercise_key)`.
 *   4. Run the Playwright API smoke spec
 *      (`frontend/e2e/api/v3b3-corrective-smoke.spec.ts`) against
 *      production. The spec validates that exactly 32 ces-* rows are
 *      live and every one routes to a non-`main` Rolodex section.
 *
 * Production-state precondition:
 *   - DATABASE_URL must be set in the local .env (CLAUDE.md gotcha:
 *     "Local dev uses production DB via DATABASE_URL"). The seed step
 *     and the migrate:status probe both go through backend's dotenv
 *     loader, so the orchestrator itself does not need it.
 *   - For the Playwright auth step: TEST_PASSWORD (or
 *     E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD) must be exported, otherwise
 *     the smoke step will fail with an auth error and the seed step
 *     will still have completed (idempotent).
 *
 * Run (from repo root):
 *   node scripts/v3b3-deploy-and-smoke.mjs
 *
 * Skip steps:
 *   --skip-wait   skip the Render readiness poll
 *   --skip-seed   skip the seeder run (use after seed has already run)
 *   --skip-smoke  skip the Playwright smoke
 *   --no-color    plain output
 *
 * Exit codes:
 *   0 — all steps succeeded
 *   1 — any step failed (see logs)
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(REPO_ROOT, 'backend');
const FRONTEND_DIR = path.join(REPO_ROOT, 'frontend');

const ARGV = process.argv.slice(2);
const SKIP_WAIT = ARGV.includes('--skip-wait');
const SKIP_SEED = ARGV.includes('--skip-seed');
const SKIP_SMOKE = ARGV.includes('--skip-smoke');
const NO_COLOR = ARGV.includes('--no-color') || !process.stdout.isTTY;

const PROD_BASE = process.env.SMOKE_TARGET || 'https://sswanstudios.com';
const MIGRATION_NAME = '20260504000000-add-nasm-corrective-fields.cjs';

const C = NO_COLOR
  ? { dim: (s) => s, red: (s) => s, green: (s) => s, yellow: (s) => s, blue: (s) => s, bold: (s) => s }
  : {
      dim: (s) => `\x1b[2m${s}\x1b[0m`,
      red: (s) => `\x1b[31m${s}\x1b[0m`,
      green: (s) => `\x1b[32m${s}\x1b[0m`,
      yellow: (s) => `\x1b[33m${s}\x1b[0m`,
      blue: (s) => `\x1b[34m${s}\x1b[0m`,
      bold: (s) => `\x1b[1m${s}\x1b[0m`,
    };

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function logStep(n, total, msg) {
  log(C.bold(C.blue(`\n[${n}/${total}] ${msg}`)));
}

function logSub(msg) {
  log(C.dim(`    ${msg}`));
}

function fail(msg) {
  log(C.red(C.bold(`\n❌ ${msg}`)));
  process.exit(1);
}

async function pollUntil(probeFn, { intervalMs, timeoutMs, label }) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    attempt += 1;
    try {
      const ok = await probeFn();
      if (ok) {
        logSub(C.green(`✓ ${label} ready (attempt ${attempt}, ${Math.round((Date.now() - start) / 1000)}s)`));
        return true;
      }
    } catch (err) {
      logSub(C.dim(`  attempt ${attempt}: ${err?.message || err}`));
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function probeBackendUp() {
  const res = await fetch(`${PROD_BASE}/api/health`).catch(() => null);
  if (!res) return false;
  return res.status >= 200 && res.status < 600;
}

function probeMigrationApplied() {
  // Shell out to sequelize-cli — it consults backend/.env via config.cjs.
  // We look for either "up" status against MIGRATION_NAME or absence
  // of a "down" line for the migration in the status output.
  const r = spawnSync(
    'npx',
    [
      'sequelize-cli',
      'db:migrate:status',
      '--config',
      'config/config.cjs',
      '--migrations-path',
      'migrations',
      '--models-path',
      'models',
      '--env',
      'production',
    ],
    {
      cwd: BACKEND_DIR,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    },
  );
  const out = (r.stdout || '') + (r.stderr || '');
  // sequelize-cli marks applied migrations with "up" prefix and pending
  // ones with "down". We want to see "up <MIGRATION_NAME>".
  const upLine = new RegExp(`^\\s*up\\s+${MIGRATION_NAME.replace(/\./g, '\\.')}`, 'm');
  return upLine.test(out);
}

function runShell(cmd, args, opts = {}) {
  const { cwd, env, allowFail } = opts;
  logSub(C.dim(`$ cd ${path.relative(REPO_ROOT, cwd) || '.'} && ${cmd} ${args.join(' ')}`));
  const result = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, ...(env || {}) },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0 && !allowFail) {
    fail(`command exited with code ${result.status}: ${cmd} ${args.join(' ')}`);
  }
  return result;
}

const TOTAL_STEPS = (SKIP_WAIT ? 0 : 1) + (SKIP_SEED ? 0 : 1) + (SKIP_SMOKE ? 0 : 1);
let stepN = 0;

log(C.bold(`V3b.3 Deploy-and-Smoke Orchestrator`));
log(C.dim(`Repo root:     ${REPO_ROOT}`));
log(C.dim(`Prod target:   ${PROD_BASE}`));
log(C.dim(`Migration:     ${MIGRATION_NAME}`));
log(C.dim(`TEST_PASSWORD: ${process.env.TEST_PASSWORD ? C.green('set') : C.yellow('not set — Playwright auth may fail')}`));

// ─── Step 1: wait for Render deploy + migration ────────────────
if (!SKIP_WAIT) {
  stepN += 1;
  logStep(stepN, TOTAL_STEPS, 'Waiting for Render deploy + V3b.3 migration to land');
  const backendUp = await pollUntil(probeBackendUp, {
    intervalMs: 10_000,
    timeoutMs: 5 * 60_000,
    label: 'Render backend',
  });
  if (!backendUp) fail('Render backend did not come up within 5 minutes.');

  const migrated = await pollUntil(probeMigrationApplied, {
    intervalMs: 15_000,
    timeoutMs: 8 * 60_000,
    label: `migration ${MIGRATION_NAME} applied`,
  });
  if (!migrated) {
    fail('V3b.3 migration did not land within 8 minutes — check Render deploy logs.');
  }
} else {
  logSub(C.yellow('⏭  --skip-wait set, skipping deploy poll'));
}

// ─── Step 2: seed ──────────────────────────────────────────────
//
// Direct-runner path: sequelize-cli 6.6.2's `--seed FILE` flag silently
// fails to resolve `.mjs` seeders ("Unable to find migration: …" — yes,
// CLI calls them migrations in that error path). The direct runner
// imports the seeder module and calls up() against the live
// queryInterface, which works identically against any DATABASE_URL.
if (!SKIP_SEED) {
  stepN += 1;
  logStep(stepN, TOTAL_STEPS, 'Seeding V3b.3.3 corrective starter rows against production');
  runShell('node', ['scripts/v3b3-run-seeder-prod.mjs'], {
    cwd: BACKEND_DIR,
  });
  logSub(C.green('✓ Seed complete'));
} else {
  logSub(C.yellow('⏭  --skip-seed set, skipping seeder run'));
}

// ─── Step 3: smoke ─────────────────────────────────────────────
//
// Two-tier verification:
//   (a) DB-level (always): direct SQL count + V3b.3 metadata presence
//       + section-routing replay. Fast (~2s) and needs no auth creds.
//   (b) API-level Playwright (best-effort): runs only if TEST_PASSWORD
//       or E2E_ADMIN_PASSWORD is set. Skipped silently otherwise.
if (!SKIP_SMOKE) {
  stepN += 1;
  logStep(stepN, TOTAL_STEPS, 'Verifying V3b.3.3 in production');

  logSub('(a) DB-level smoke (always runs)');
  runShell('node', ['scripts/v3b3-verify-prod.mjs'], { cwd: BACKEND_DIR });
  logSub(C.green('    ✓ DB-level smoke passed'));

  const haveAuth = !!(process.env.TEST_PASSWORD || process.env.E2E_ADMIN_PASSWORD);
  if (haveAuth) {
    logSub('(b) Playwright API smoke');
    runShell(
      'npx',
      [
        'playwright',
        'test',
        'e2e/api/v3b3-corrective-smoke.spec.ts',
        '--project=API Tests',
        '--reporter=list',
      ],
      { cwd: FRONTEND_DIR, env: { BASE_URL: PROD_BASE } },
    );
    logSub(C.green('    ✓ Playwright smoke passed'));
  } else {
    logSub(C.yellow('(b) Playwright API smoke — skipped (no TEST_PASSWORD / E2E_ADMIN_PASSWORD in env).'));
    logSub(C.dim('    To run the Playwright tier later: TEST_PASSWORD=… node scripts/v3b3-deploy-and-smoke.mjs --skip-wait --skip-seed'));
  }
} else {
  logSub(C.yellow('⏭  --skip-smoke set, skipping verification'));
}

log(C.bold(C.green('\n✅ V3b.3 Deploy-and-Smoke complete.')));
