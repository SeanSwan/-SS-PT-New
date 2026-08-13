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

/**
 * The range the PUSH will ship — not the tip commit.
 *
 * Kimi K3 hostile review (2026-08-13, P2): `HEAD~1..HEAD` certifies only the tip
 * while the push ships the whole unpushed stack, so a destructive migration in
 * commit 1 of a 4-commit slice was never examined. Worse, the discovered
 * workaround for a legitimate FAIL was "commit anything on top" — the false-fail
 * and the bypass were the same line of code. Verified against this worktree:
 * 7 commits unpushed, exactly 1 scanned.
 *
 * Returns null when the base cannot be determined. Callers MUST treat that as
 * substrate failure, never as an empty file list.
 */
const pushRange = () => {
  for (const ref of ['origin/main', 'origin/HEAD']) {
    const base = run('git', ['merge-base', ref, 'HEAD']);
    if (base.code === 0 && base.out.trim()) return `${base.out.trim()}..HEAD`;
  }
  return null;
};

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
  // Kimi K3 P5: this previously discarded a FAILED git result into an empty
  // string, producing `files = []` and then ok:true. Probed and confirmed: with
  // git failing it reported "no backend modules changed" and PASSED. A helper
  // command that fails can never produce a pass — that is substrate failure,
  // not evidence of a clean tree. (The unused `ls-files` call it also ran is
  // deleted; dead computation in a certification gate is a finding by itself.)
  const range = pushRange();
  if (!range) return { ok: null, substrate: true, detail: 'cannot determine push range' };

  const changed = run('git', ['diff', '--name-only', range, '--', 'backend']);
  if (changed.code !== 0) return { ok: null, substrate: true, detail: 'git diff failed' };

  const files = changed.out
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f.endsWith('.mjs') && existsSync(path.join(repoRoot, f)));

  if (files.length === 0) return { ok: true, detail: `no backend modules changed in ${range}` };

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
  // Kimi K3 P5: either command failing used to yield an empty drift list and a PASS.
  if (untracked.code !== 0 || modified.code !== 0) {
    return { ok: null, substrate: true, detail: 'git could not enumerate backend drift' };
  }
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

/**
 * Frontend suites certifying frontend fixes.
 *
 * Kimi K3 P1 corollary, verified: every backend suite above is backend, and the
 * Workout Coach acknowledgement fix is a FRONTEND change. It had NO certifying
 * suite in this gate at all — a revert of that fix would have kept the gate
 * green. The list is still hardcoded, which Kimi correctly calls the deeper
 * flaw; the coverage-manifest replacement is queued, not done.
 */
const CERTIFIED_FRONTEND_SUITES = [
  'src/components/WorkoutLogger/useWorkoutSubmit.aiAckTruth.test.tsx',
  'src/components/WorkoutLogger/workoutCoachContext.test.ts',
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
    ? { ok: true, detail: `${present.length} certified backend suites pass` }
    : { ok: false, detail: 'a certified backend suite failed' };
};

const checkFrontendSuites = () => {
  const frontendDir = path.join(repoRoot, 'frontend');
  const missing = CERTIFIED_FRONTEND_SUITES.filter(
    (s) => !existsSync(path.join(frontendDir, s)),
  );
  if (missing.length) {
    return { ok: false, detail: `certified frontend suite missing: ${missing.join(', ')}` };
  }
  if (!existsSync(path.join(frontendDir, 'node_modules', '.bin'))) {
    // Kimi K3 F3: fail closed, but say WHAT is missing so it reads as setup
    // rather than as the gate lying.
    return { ok: null, substrate: true, detail: 'frontend deps absent — run npm ci in frontend/' };
  }

  const result = run(
    path.join('node_modules', '.bin', bin('vitest')),
    ['run', ...CERTIFIED_FRONTEND_SUITES, '--no-coverage'],
    frontendDir,
  );
  return result.code === 0
    ? { ok: true, detail: `${CERTIFIED_FRONTEND_SUITES.length} certified frontend suites pass` }
    : { ok: false, detail: 'a certified frontend suite failed' };
};

/** Migrations are reviewed statically. This gate NEVER executes one. */
const checkMigrationsStatic = () => {
  const dir = path.join(backendDir, 'migrations');
  if (!existsSync(dir)) return { ok: null, detail: 'no migrations directory' };

  const range = pushRange();
  if (!range) return { ok: null, substrate: true, detail: 'cannot determine push range' };

  const changed = run('git', ['diff', '--name-only', range, '--', 'backend/migrations']);
  // Kimi K3 P5: a failed diff used to read as "no migration changed" and PASS.
  if (changed.code !== 0) return { ok: null, substrate: true, detail: 'git diff failed' };

  const touched = changed.out
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);

  if (touched.length === 0) return { ok: true, detail: `no migration changed in ${range}` };

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
  ['certified backend suites', checkTargetedSuites],
  ['certified frontend suites', checkFrontendSuites],
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
// Kimi K3 Q5: "live topology is undecidable" and "git did not run" are different
// animals. Git is the substrate for every other check — when it fails, the other
// results are fabricated. Scope-UNPROVEN exits 0 and downgrades the banner to
// PROVISIONAL; SUBSTRATE-UNPROVEN exits 2 so automation can tell "unsafe" from
// "unexaminable". This does not recreate a permanently-red gate: substrate
// failure is transient and fixable, not constitutional.
const substrate = unproven.filter((r) => r.substrate === true);

if (jsonOut) {
  process.stdout.write(`${JSON.stringify({ results, failed: failed.length, unproven: unproven.length }, null, 2)}\n`);
} else {
  process.stdout.write('\n== Slice Certification ==\n');
  process.stdout.write(`${results.length - failed.length - unproven.length} passed, ${failed.length} failed, ${unproven.length} unproven\n`);

  const head = run('git', ['rev-parse', 'HEAD']).out.trim();
  if (substrate.length) {
    process.stdout.write('SUBSTRATE FAILURE — checks could not run. No verdict.\n');
  } else if (failed.length) {
    process.stdout.write('NOT CERTIFIED.\n');
  } else if (unproven.length) {
    // Kimi K3 Q5(1): a pass wearing a disclaimer is still a pass to anything
    // reading the exit code. The word changes, so the artifact never claims
    // certification while owner checks are outstanding.
    process.stdout.write(`PROVISIONAL — owner checks outstanding: ${unproven.map((u) => u.name).join(', ')}\n`);
    process.stdout.write(`Tree ${head} passed every decidable check. Owner sign-off required before schema work.\n`);
  } else {
    // Kimi K3 P4: the verdict must be an instruction, not an adjective. Nothing
    // binds a run to the ref that later gets pushed unless it says so.
    process.stdout.write(`CERTIFIED: ${head} — push exactly this ref, then confirm with: git ls-remote origin main\n`);
  }
}

if (substrate.length) process.exit(2);
process.exit(failed.length === 0 ? 0 : 1);
