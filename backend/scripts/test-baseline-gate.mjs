/**
 * Push gate for a repo whose test suite is not green.
 * ============================================================================
 *
 * WHY THIS EXISTS. On 2026-08-12 I pushed a batch containing six failing tests. The gate
 * was there — I ran the suite — but the command was
 * `npx vitest run ... | tail -4 && git push`, and `tail` exits 0 no matter what vitest
 * reported. The failure slipped through a pipe.
 *
 * The deeper cause is structural: **this suite has a non-green baseline.** Files fail for
 * reasons that predate current work, so `vitest run` exits 1 on a perfectly good tree. A
 * literal exit-code gate blocks every push forever, which is precisely the pressure that
 * leads someone to pipe the output somewhere friendlier. A gate that cries wolf gets routed
 * around, and then it is not a gate. So the honest question is not "did anything fail?" but
 * **"did anything NEW fail?"**
 *
 * WHY IT COMPARES TESTS AND REASONS, NOT FILE NAMES (2026-08-26)
 * -------------------------------------------------------------
 * It used to compare the set of failing FILE NAMES. Two handoffs flagged the hole and a
 * hostile-review panel put a number on it: a file already in the baseline could start
 * failing for an entirely NEW reason — a different test inside it, or the same test with a
 * different error — and the set stayed identical. Every verification claim in three
 * sessions of security work was routed through that comparison, so the thing certifying
 * the work could not see a whole class of regression in the work.
 *
 * It now records each failing TEST by identity and a normalised failure REASON:
 *
 *   - a test that starts failing and was not in the baseline   -> REGRESSION
 *   - a baselined test that starts failing DIFFERENTLY         -> REGRESSION (reason drift)
 *   - a file that stops COLLECTING at all (import crash)       -> REGRESSION
 *   - a baselined test that now passes                          -> reported, prune it
 *
 * Reason drift is a hard failure rather than a warning on purpose. It is the exact case
 * the old gate was blind to, and a warning in a wall of green output is a thing nobody
 * reads. Re-baseline deliberately with `--update` when the drift is understood.
 *
 * USAGE
 *   node backend/scripts/test-baseline-gate.mjs --update   # record today's baseline
 *   node backend/scripts/test-baseline-gate.mjs            # gate: exit 1 on regression
 *
 * Exit 0 = no new failures (baseline may still be red).
 * Exit 1 = something failed that did not before, OR the run did not complete.
 * Exit 2 = usage / no baseline recorded.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdtempSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, '..');
const BASELINE_PATH = join(BACKEND, 'tests', 'known-failing-baseline.json');
const UPDATE = process.argv.includes('--update');

function runSuite(outputFile) {
  return new Promise((resolve) => {
    const p = spawn('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${outputFile}`], {
      cwd: BACKEND,
      shell: process.platform === 'win32',
    });
    let out = '';
    p.stdout.on('data', (c) => { out += c.toString(); });
    p.stderr.on('data', (c) => { out += c.toString(); });
    p.on('error', () => resolve({ out, code: -1 }));
    p.on('close', (code) => resolve({ out, code }));
  });
}

const rel = (abs) => relative(BACKEND, abs).split('\\').join('/');

/**
 * Reduce a failure message to something stable enough to compare across runs but specific
 * enough that a DIFFERENT failure looks different. Absolute paths, line/column numbers,
 * durations, hex ids and quantities all churn without the failure changing; the assertion
 * itself does not.
 */
export function normalizeReason(messages) {
  const first = (Array.isArray(messages) ? messages : []).find(Boolean) || '';
  return String(first)
    .split('\n')[0]
    .replace(/[A-Za-z]:[\\/][^\s:]+/g, '<path>')
    .replace(/\/[^\s:]+\.(mjs|js|ts|tsx)/g, '<path>')
    .replace(/:\d+:\d+/g, '')
    .replace(/\b0x[0-9a-f]+\b/gi, '<hex>')
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g, '<time>')
    .replace(/\b\d+\s?ms\b/g, '<ms>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Every failing test, by identity, plus why. A file that failed to COLLECT has no
 * assertions at all — recording it under a sentinel keeps an import crash from being
 * invisible, which is the same blindness in a different coat.
 */
export function collectFailures(report) {
  const failures = new Map();
  for (const file of report.testResults || []) {
    const path = rel(file.name);
    const assertions = file.assertionResults || [];
    const failed = assertions.filter((a) => a.status === 'failed');
    for (const a of failed) {
      failures.set(`${path} :: ${a.fullName}`, normalizeReason(a.failureMessages));
    }
    // No assertions ran but the file is failed => it never collected.
    if (!assertions.length && file.status === 'failed') {
      failures.set(`${path} :: <file did not collect>`, normalizeReason([file.message]));
    }
  }
  return failures;
}

const RUN_AS_CLI = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (!RUN_AS_CLI) {
  // Imported for its pure comparison logic (see tests/unit/testBaselineGate.test.mjs).
  // Running the whole suite as a side effect of an import would be its own kind of lie.
} else {
const outputFile = join(mkdtempSync(join(tmpdir(), 'swan-gate-')), 'report.json');
const { out, code } = await runSuite(outputFile);

let report = null;
try {
  report = JSON.parse(readFileSync(outputFile, 'utf8'));
} catch {
  report = null;
}
try { unlinkSync(outputFile); } catch { /* best effort */ }

// A run that never produced a report is NOT a pass — it is an unknown, and treating an
// unknown as success is how a broken suite reads as a clean one.
if (!report || !Array.isArray(report.testResults) || report.testResults.length === 0) {
  process.stderr.write('\n  test-baseline-gate: the suite produced no machine-readable report — treating as FAILURE.\n');
  process.stderr.write(`  vitest exit code: ${code}\n\n`);
  process.stderr.write(`${out.split('\n').slice(-25).join('\n')}\n`);
  process.exit(1);
}

const failures = collectFailures(report);
const failingFiles = [...new Set([...failures.keys()].map((k) => k.split(' :: ')[0]))].sort();
const passed = report.numPassedTests ?? 0;
const failed = report.numFailedTests ?? 0;

if (UPDATE) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify({
    recordedAt: new Date().toISOString(),
    note: 'Tests failing for reasons that predate current work, with the reason each failed. '
      + 'Shrink this list; never grow it casually. Compared per TEST and per REASON — a '
      + 'baselined test that starts failing differently is a regression, not a match.',
    failingTests: [...failures.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, reason]) => ({ id, reason })),
    failingFiles,
  }, null, 2)}\n`);
  process.stdout.write(`\n  baseline recorded: ${failures.size} failing test(s) across ${failingFiles.length} file(s)\n`);
  for (const f of failingFiles) process.stdout.write(`    ${f}\n`);
  process.stdout.write('\n');
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  process.stderr.write('\n  test-baseline-gate: no baseline recorded. Run with --update first.\n\n');
  process.exit(2);
}

const baselineDoc = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
process.stdout.write(`\n  tests: ${passed} passed, ${failed} failed`
  + `  |  failing tests: ${failures.size} across ${failingFiles.length} file(s)\n`);

// ── Legacy baseline: file names only ────────────────────────────────────────
if (!Array.isArray(baselineDoc.failingTests)) {
  const knownFiles = new Set(baselineDoc.failingFiles || []);
  const newFiles = failingFiles.filter((f) => !knownFiles.has(f));
  process.stderr.write('\n  NOTE: this baseline records FILE NAMES only, so a file already in it can start\n');
  process.stderr.write('  failing for a new reason invisibly. Re-record with --update to gate per test.\n');
  if (newFiles.length) {
    process.stderr.write('\n  REGRESSION — these files were not failing before:\n');
    for (const f of newFiles) process.stderr.write(`    ${f}\n`);
    process.stderr.write('\n  Do not push.\n\n');
    process.exit(1);
  }
  process.stdout.write('\n  no new failing FILES — but this gate is running blind within them.\n\n');
  process.exit(0);
}

// ── Per-test comparison ─────────────────────────────────────────────────────
const baseline = new Map(baselineDoc.failingTests.map((t) => [t.id, t.reason]));
const brandNew = [];
const drifted = [];
for (const [id, reason] of failures) {
  if (!baseline.has(id)) brandNew.push(id);
  else if (baseline.get(id) !== reason) {
    drifted.push({ id, was: baseline.get(id), now: reason });
  }
}
const fixed = [...baseline.keys()].filter((id) => !failures.has(id));

if (fixed.length) {
  // Not a failure — but a baseline nobody prunes becomes a place to hide new breakage.
  process.stdout.write('\n  these are in the baseline but now PASS — prune them:\n');
  for (const id of fixed) process.stdout.write(`    ${id}\n`);
}

if (brandNew.length) {
  process.stderr.write('\n  REGRESSION — these tests were not failing before:\n');
  for (const id of brandNew) process.stderr.write(`    ${id}\n    ${failures.get(id)}\n`);
}

if (drifted.length) {
  process.stderr.write('\n  REASON DRIFT — these were already failing, but NOT like this:\n');
  for (const d of drifted) {
    process.stderr.write(`    ${d.id}\n      was: ${d.was}\n      now: ${d.now}\n`);
  }
  process.stderr.write('\n  A known failure that changed shape is a new failure wearing an old name.\n');
}

if (brandNew.length || drifted.length) {
  process.stderr.write('\n  Do not push. Fix them, or re-record deliberately with --update.\n\n');
  process.exit(1);
}

process.stdout.write('\n  no new failures — safe to push.\n\n');
process.exit(0);
}
