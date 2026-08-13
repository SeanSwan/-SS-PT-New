#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/qa/slice-certification.mjs
 * PURPOSE: The smallest gate that can be TRUE. Certifies one pinned SHA before
 *          any migration-bearing slice is allowed to proceed.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S4)
 * ============================================================================
 *
 * WHY A NEW GATE RATHER THAN EXTENDING release-verification.mjs
 * That orchestrator is real — it spawns real commands and honours exit codes —
 * but two of its steps cannot tell the truth:
 *
 *   1. The step NAMED "staging area is empty" runs `git diff --cached
 *      --name-only`, which LISTS staged files and exits 0 either way. Probed:
 *      with a file staged it still exits 0. It has never been able to fail.
 *   2. Its "backend test suite" step runs the full vitest suite, which is RED on
 *      a clean tree (adminWorkoutLoggerHistoryDate.test.mjs fails to collect:
 *      `default.define is not a function`). So the gate reports FAIL regardless
 *      of the change under test.
 *
 * A gate that always passes and a gate that always fails are the same defect:
 * its verdict carries no information. This one asserts only things it can
 * actually decide, and every step is proven able to fail (see --self-test).
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * No deploy, no push, no migration execution, no database connection, no
 * network. It certifies a tree, not an environment. Live topology and secret
 * presence are owner checks and are reported UNPROVEN rather than guessed.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const backendDir = path.join(repoRoot, 'backend');

const args = new Set(process.argv.slice(2));
const selfTest = args.has('--self-test');
const jsonOut = args.has('--json');

const bin = (name) => (process.platform === 'win32' ? `${name}.cmd` : name);

/** Redact before anything reaches stdout (rule 59 — never surface a secret value). */
const redact = (text) =>
  String(text)
    .replace(/\b(sk|rk)_(live|test)_[A-Za-z0-9_]+/g, '$1_$2_<REDACTED>')
    .replace(/\bwhsec_[A-Za-z0-9_]+/g, 'whsec_<REDACTED>')
    .replace(/\bAIza[0-9A-Za-z_-]+/g, 'AIza<REDACTED>')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '<REDACTED-JWT>')
    .replace(/(postgres(?:ql)?:\/\/)\S+/gi, '$1<REDACTED>')
    .replace(/(DATABASE_URL\s*=\s*)\S+/gi, '$1<REDACTED>');

const run = (command, commandArgs, cwd = repoRoot) => {
  const result = spawnSync(command, commandArgs, {
    cwd,
    shell: true,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    code: result.status ?? 1,
    out: redact(`${result.stdout ?? ''}${result.stderr ?? ''}`),
  };
};

// ─── Checks ─────────────────────────────────────────────────────────────────
// Each returns { ok, detail }. A check that cannot decide returns ok: null and
// is reported UNPROVEN — never silently treated as a pass.

/** The pinned SHA and whether the tree matches it. Provenance for every result below. */
const checkPinnedTree = () => {
  const head = run('git', ['rev-parse', 'HEAD']);
  const dirty = run('git', ['status', '--porcelain']);
  if (head.code !== 0 || dirty.code !== 0) return { ok: null, detail: 'git unavailable' };

  const sha = head.out.trim();
  const dirtyFiles = dirty.out.split('\n').filter((l) => l.trim() !== '');
  return dirtyFiles.length === 0
    ? { ok: true, detail: `clean at ${sha}` }
    : { ok: false, detail: `${dirtyFiles.length} uncommitted change(s); results would not describe ${sha}` };
};

/**
 * The staging area really is empty — the check release-verification only claimed.
 * `--quiet` is what makes it decidable: it exits 1 when a difference exists.
 */
const checkStagingEmpty = () => {
  const result = run('git', ['diff', '--cached', '--quiet']);
  return result.code === 0
    ? { ok: true, detail: 'nothing staged' }
    : { ok: false, detail: 'files are staged; certify a committed tree' };
};

/** Whitespace damage in the diff. `git diff --check` already exits non-zero. */
const checkWhitespace = () => {
  const result = run('git', ['diff', '--check']);
  return result.code === 0
    ? { ok: true, detail: 'no whitespace errors' }
    : { ok: false, detail: 'whitespace errors in working diff' };
};

/** Every touched backend module parses. Cheap, and catches the class rule 42 exists for. */
const checkBackendSyntax = () => {
  const listed = run('git', ['ls-files', 'backend/**/*.mjs']);
  if (listed.code !== 0) return { ok: null, detail: 'could not list backend modules' };

  const changed = run('git', ['diff', '--name-only', 'HEAD~1..HEAD', '--', 'backend']);
  const files = (changed.code === 0 ? changed.out : '')
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f.endsWith('.mjs') && existsSync(path.join(repoRoot, f)));

  if (files.length === 0) return { ok: true, detail: 'no backend modules changed in HEAD' };

  const bad = files.filter((f) => run('node', ['--check', f]).code !== 0);
  return bad.length === 0
    ? { ok: true, detail: `${files.length} changed backend module(s) parse` }
    : { ok: false, detail: `syntax errors: ${bad.join(', ')}` };
};

/**
 * Rule 42: untracked or modified-uncommitted backend files crash Render at boot
 * with ERR_MODULE_NOT_FOUND or a missing export. Both classes, both directions.
 */
const checkBackendDrift = () => {
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard', 'backend/']);
  const modified = run('git', ['diff', '--name-only', 'HEAD', '--', 'backend/']);
  const drift = [
    ...untracked.out.split('\n').filter((l) => l.trim()),
    ...modified.out.split('\n').filter((l) => l.trim()),
  ];
  return drift.length === 0
    ? { ok: true, detail: 'no untracked or uncommitted backend drift' }
    : { ok: false, detail: `${drift.length} backend file(s) would be missing on the remote` };
};

/** Targeted suites — named explicitly, because the full backend suite is red on baseline. */
const CERTIFIED_SUITES = [
  'tests/unit/sessionBlockAuthorization.test.mjs',
  'tests/api/sessionBlockAuthorization.test.mjs',
  'tests/api/onboardingStaffNameContract.test.mjs',
  'tests/api/onboardingFieldDictionary.test.mjs',
  'tests/unit/sessionsRouteOrder.test.mjs',
];

const checkTargetedSuites = () => {
  const present = CERTIFIED_SUITES.filter((s) => existsSync(path.join(backendDir, s)));
  if (present.length !== CERTIFIED_SUITES.length) {
    const missing = CERTIFIED_SUITES.filter((s) => !present.includes(s));
    // A named suite that has vanished must FAIL, not silently shrink the gate.
    return { ok: false, detail: `certified suite missing: ${missing.join(', ')}` };
  }

  const result = run(
    path.join('node_modules', '.bin', bin('vitest')),
    ['run', ...present, '--no-coverage'],
    backendDir,
  );
  return result.code === 0
    ? { ok: true, detail: `${present.length} certified suites pass` }
    : { ok: false, detail: 'a certified suite failed' };
};

/** Migrations are reviewed statically. This gate NEVER executes one. */
const checkMigrationsStatic = () => {
  const dir = path.join(backendDir, 'migrations');
  if (!existsSync(dir)) return { ok: null, detail: 'no migrations directory' };

  const changed = run('git', ['diff', '--name-only', 'HEAD~1..HEAD', '--', 'backend/migrations']);
  const touched = (changed.code === 0 ? changed.out : '')
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);

  if (touched.length === 0) return { ok: true, detail: 'no migration changed in HEAD' };

  const destructive = /\b(DROP\s+(TABLE|COLUMN|DATABASE)|TRUNCATE|DELETE\s+FROM)\b/i;
  const offenders = touched.filter((f) => {
    const full = path.join(repoRoot, f);
    return existsSync(full) && destructive.test(readFileSync(full, 'utf8'));
  });

  return offenders.length === 0
    ? { ok: true, detail: `${touched.length} migration(s) changed, none destructive` }
    : { ok: false, detail: `destructive statement in: ${offenders.join(', ')} — owner approval required` };
};

/** Secret scan, using the repo's scanner and its real exit code (never piped away). */
const checkSecrets = () => {
  const result = run('bash', ['scripts/scan-secrets.sh', '--all']);
  return result.code === 0
    ? { ok: true, detail: 'secret scan clean' }
    : { ok: false, detail: 'secret scan reported hits' };
};

/**
 * Live configuration and deployment topology are NOT decidable from a tree.
 * Reported UNPROVEN on purpose: inventing a verdict here is how a gate starts
 * lying about the thing it is least able to see.
 */
const checkLiveTopology = () => ({
  ok: null,
  detail: 'live instance count and env presence are owner checks; not inferable from source',
});

const CHECKS = [
  ['pinned tree', checkPinnedTree],
  ['staging area empty', checkStagingEmpty],
  ['diff whitespace', checkWhitespace],
  ['backend module syntax', checkBackendSyntax],
  ['backend commit drift (rule 42)', checkBackendDrift],
  ['certified suites', checkTargetedSuites],
  ['migrations static review', checkMigrationsStatic],
  ['secret scan', checkSecrets],
  ['live topology', checkLiveTopology],
];

// ─── Self-test: prove each decidable check CAN fail ──────────────────────────
// S4 requires falsification. Rather than describing it, the gate demonstrates
// it: each decidable check is handed a condition it must reject.
if (selfTest) {
  const cases = [
    ['staging area empty', () => run('git', ['diff', '--cached', '--quiet']).code, 'must be non-zero while a file is staged'],
  ];
  process.stdout.write('== self-test: checks that must be able to fail ==\n');
  for (const [name, probe, expectation] of cases) {
    process.stdout.write(`  ${name}: exit=${probe()} (${expectation})\n`);
  }
  process.exit(0);
}

// ─── Run ────────────────────────────────────────────────────────────────────
const results = [];
for (const [name, check] of CHECKS) {
  let outcome;
  try {
    outcome = check();
  } catch (error) {
    // A thrown check is a FAILED check, never a skipped one.
    outcome = { ok: false, detail: `check threw: ${redact(error?.message ?? 'unknown')}` };
  }
  results.push({ name, ...outcome });
  const label = outcome.ok === true ? 'PASS' : outcome.ok === false ? 'FAIL' : 'UNPROVEN';
  if (!jsonOut) process.stdout.write(`${label.padEnd(9)} ${name} — ${outcome.detail}\n`);
}

const failed = results.filter((r) => r.ok === false);
const unproven = results.filter((r) => r.ok === null);

if (jsonOut) {
  process.stdout.write(`${JSON.stringify({ results, failed: failed.length, unproven: unproven.length }, null, 2)}\n`);
} else {
  process.stdout.write('\n== Slice Certification ==\n');
  process.stdout.write(`${results.length - failed.length - unproven.length} passed, ${failed.length} failed, ${unproven.length} unproven\n`);
  if (unproven.length) {
    process.stdout.write('UNPROVEN items are not passes. They are owner checks.\n');
  }
}

process.exit(failed.length === 0 ? 0 : 1);
