#!/usr/bin/env node
/**
 * run-disposable-security-tests.mjs — Astra blueprint S0 launcher.
 * ============================================================================
 * Runs the security suites in tests/security/ under a hard resource guard:
 * this repo's ambient DATABASE_URL points at the PRODUCTION database, so any
 * suite that could load application modules must refuse inherited DB config
 * before a single import executes (kill-list #15: no direct production
 * migration/seed/repair execution; 09-tests.md launcher requirement).
 *
 * Usage (from backend/):
 *   node ../scripts/run-disposable-security-tests.mjs --suite campaign-safety
 *   node ../scripts/run-disposable-security-tests.mjs --suite mountedWorkoutAuthorization
 *
 * Suites:
 *   campaign-safety              node:test + vm harness (no DB at all)
 *   <any tests/security/*.test.mjs>  vitest, targeted file, retry=0
 *
 * Escape hatch for FUTURE disposable-database suites (S5+): set
 * SWAN_DISPOSABLE_DB_URL to a scratch database URL AND SWAN_DISPOSABLE_DB=1.
 * Both must be present; ambient DATABASE_URL alone NEVER qualifies.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const suiteArgIdx = process.argv.indexOf('--suite');
const suite = suiteArgIdx > -1 ? process.argv[suiteArgIdx + 1] : null;

if (!suite) {
  console.error('[disposable] --suite <name> is required (e.g. campaign-safety, mountedWorkoutAuthorization)');
  process.exit(2);
}

const backendRoot = resolve(process.cwd());
const securityDir = join(backendRoot, 'tests', 'security');

// ── RESOURCE GUARD (before any application module could load) ──────────────
const ambient = process.env.DATABASE_URL || '';
const disposableUrl = process.env.SWAN_DISPOSABLE_DB_URL || '';
const disposableFlag = process.env.SWAN_DISPOSABLE_DB === '1';

if (ambient && !disposableFlag) {
  console.error(
    '[disposable] REFUSING: ambient DATABASE_URL is set and this repo points it at ' +
    'PRODUCTION. Suites here must run with no DB or an explicit disposable one.\n' +
    '  - campaign-safety: unset DATABASE_URL for this shell, or\n' +
    '  - future DB suites: set SWAN_DISPOSABLE_DB_URL=<scratch> AND SWAN_DISPOSABLE_DB=1'
  );
  process.exit(3);
}
if (disposableFlag && (!disposableUrl || disposableUrl === ambient)) {
  console.error('[disposable] REFUSING: SWAN_DISPOSABLE_DB=1 requires SWAN_DISPOSABLE_DB_URL pointing at a scratch database distinct from ambient DATABASE_URL.');
  process.exit(3);
}
const localDbShape = /(localhost|127\.0\.0\.1|::1)/.test(disposableUrl);
if (disposableFlag && !localDbShape) {
  console.error('[disposable] REFUSING: SWAN_DISPOSABLE_DB_URL must be a local/loopback scratch database.');
  process.exit(3);
}

// ── RUN ─────────────────────────────────────────────────────────────────────
// Every tests/security/*.test.mjs is a node:test file (VM harness, no DB) and
// is excluded from the default vitest run by vitest.config.mjs. Uniform runner:
// node --test with the VM-modules flag, targeted file, from backend/.
const suiteFile = join(securityDir, `${suite}.test.mjs`);
if (!existsSync(suiteFile)) {
  console.error(`[disposable] unknown suite: ${suite} (no tests/security/${suite}.test.mjs)`);
  console.error('[disposable] available suites: see backend/tests/security/');
  process.exit(2);
}

const result = spawnSync(process.execPath, [
  '--experimental-vm-modules', '--test-isolation=none', '--test', suiteFile,
], { stdio: 'inherit', cwd: backendRoot, env: process.env });
process.exit(result.status ?? 1);
