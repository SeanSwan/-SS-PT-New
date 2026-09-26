/**
 * Push gate for a repo whose test suite is not green.
 * ============================================================================
 *
 * WHY THIS EXISTS. On 2026-08-12 I pushed a batch containing six failing tests. The gate
 * was there — I ran the suite — but the command was
 * `npx vitest run ... | tail -4 && git push`, and `tail` exits 0 no matter what vitest
 * reported. The failure slipped through a pipe.
 *
 * The deeper cause is structural, and it is why "just check the exit code" does not fix
 * it: **this suite has a non-green baseline.** Nine files / six tests fail for reasons
 * that predate this work, so `vitest run` exits 1 on a perfectly good tree. A literal
 * exit-code gate blocks every push forever, which is precisely the pressure that leads
 * someone to pipe the output somewhere friendlier. A gate that cries wolf gets routed
 * around, and then it is not a gate.
 *
 * So the honest question is not "did anything fail?" but **"did anything NEW fail?"**
 * This compares the set of failing test FILES against a recorded baseline:
 *
 *   node backend/scripts/test-baseline-gate.mjs --update   # record today's baseline
 *   node backend/scripts/test-baseline-gate.mjs            # gate: exit 1 on regression
 *
 * Exit 0 = no new failures (baseline may still be red).
 * Exit 1 = a file that used to pass now fails, OR the run itself did not complete,
 *          OR the output could not be read.
 * Exit 2 = usage / could not run.
 *
 * It deliberately reports files that were EXPECTED to fail and now pass, too — a
 * baseline that silently rots is the next version of this same problem.
 *
 * ----------------------------------------------------------------------------
 * 2026-09-26 — THE GATE WAS DEAD IN CI AND SAID THE WRONG THING ABOUT WHY.
 *
 * For at least three consecutive main runs (2026-09-24, 09-25, 09-26) this gate reported
 * "the suite did not produce a summary — treating as FAILURE" in coach-gate. That message
 * blames the suite. The suite was healthy; the PARSER was blind to ANSI escapes, which
 * vitest emits in CI and not on a developer's terminal. So the gate could not read its own
 * input, and its failure message pointed at the wrong component — which is why nobody
 * chased it. The backend's only regression check had been non-functional for weeks.
 *
 * The fix is in scripts/lib/baselineGateParse.mjs, together with the invariant that matters
 * more than the fix: a run whose evidence contradicts itself is reported as BLIND and fails
 * closed. The worst outcome was never "the gate is broken" — it was "the gate is broken and
 * reads as green". See that module's header for the full account, including why repairing
 * only the totals parser would have produced a gate that actively lied.
 *
 * --from-file <path> exists so this gate is verifiable without running 1327 test files: it
 * reads captured vitest output, applies the same parsers and the same baseline diff, and
 * reports. It is how the ANSI fix was proved, and it is the fastest way to triage a CI log.
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffBaseline, interpretRun, stripAnsi } from './lib/baselineGateParse.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(HERE, '..', 'tests', 'known-failing-baseline.json');
const UPDATE = process.argv.includes('--update');

/** `--from-file <path>` — parse captured vitest output instead of running the suite. */
const fromFileIndex = process.argv.indexOf('--from-file');
const FROM_FILE = fromFileIndex === -1 ? null : process.argv[fromFileIndex + 1];
/** `--exit-code N` — the exit code that produced a --from-file capture. Defaults to 0. */
const exitCodeIndex = process.argv.indexOf('--exit-code');
const FROM_FILE_EXIT = exitCodeIndex === -1 ? 0 : Number(process.argv[exitCodeIndex + 1]);

function runSuite() {
  return new Promise((resolve) => {
    // `--reporter dot` keeps output small; we parse the FAIL lines, not the summary.
    const p = spawn('npx', ['vitest', 'run', '--reporter', 'dot'], {
      cwd: join(HERE, '..'),
      shell: process.platform === 'win32',
    });
    let out = '';
    p.stdout.on('data', (c) => { out += c.toString(); });
    p.stderr.on('data', (c) => { out += c.toString(); });
    p.on('error', () => resolve({ out, code: -1 }));
    p.on('close', (code) => resolve({ out, code }));
  });
}

if (fromFileIndex !== -1 && (!FROM_FILE || FROM_FILE.startsWith('--'))) {
  process.stderr.write('\n  test-baseline-gate: --from-file needs a path.\n\n');
  process.exit(2);
}

let out;
let code;
if (FROM_FILE) {
  if (!existsSync(FROM_FILE)) {
    process.stderr.write(`\n  test-baseline-gate: --from-file target not found: ${FROM_FILE}\n\n`);
    process.exit(2);
  }
  out = readFileSync(FROM_FILE, 'utf8');
  code = FROM_FILE_EXIT;
} else {
  ({ out, code } = await runSuite());
}

const verdict = interpretRun(out, code);
const { totals, failing } = verdict;

// A run that never produced readable evidence is NOT a pass — it is an unknown, and treating an
// unknown as success is how a broken suite reads as a clean one. This covers a missing summary, a
// totals line that says tests failed while no FAIL line could be parsed, and a non-zero exit with
// no FAIL lines: all three mean the gate cannot see what happened, so it fails closed.
if (verdict.blind) {
  process.stderr.write(`\n  test-baseline-gate: cannot read this run — treating as FAILURE (${verdict.reason}).\n`);
  if (FROM_FILE) process.stderr.write(`  source: ${FROM_FILE}\n`);
  else process.stderr.write(`  vitest exit code: ${code}\n`);
  if (totals) process.stderr.write(`  totals parsed: ${totals.failed} failed, ${totals.passed} passed\n`);
  else process.stderr.write('  totals parsed: none — no "Tests ... passed" line found in the output.\n');
  process.stderr.write(`  FAIL lines parsed: ${failing.length}\n`);
  process.stderr.write('\n  The parsers are in scripts/lib/baselineGateParse.mjs. If vitest changed its\n');
  process.stderr.write('  output format, fix the parser — do not relax this check.\n\n');
  process.stderr.write(`${stripAnsi(out).split('\n').slice(-25).join('\n')}\n`);
  process.exit(1);
}

if (UPDATE) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify({
    recordedAt: new Date().toISOString(),
    note: 'Files failing for reasons that predate current work. Shrink this list; never grow it casually.',
    failingFiles: failing,
  }, null, 2)}\n`);
  process.stdout.write(`\n  baseline recorded: ${failing.length} failing file(s)\n`);
  for (const f of failing) process.stdout.write(`    ${f}\n`);
  process.stdout.write('\n');
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  process.stderr.write('\n  test-baseline-gate: no baseline recorded. Run with --update first.\n\n');
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).failingFiles || [];
const { regressions, fixed } = diffBaseline(failing, baseline);

process.stdout.write(`\n  tests: ${totals.passed} passed, ${totals.failed} failed`
  + `  |  failing files: ${failing.length} (baseline ${baseline.length})\n`);

if (fixed.length) {
  // Not a failure — but a baseline nobody prunes becomes a place to hide new breakage.
  process.stdout.write('\n  these are in the baseline but now PASS — prune them:\n');
  for (const f of fixed) process.stdout.write(`    ${f}\n`);
}

if (regressions.length) {
  process.stderr.write('\n  REGRESSION — these files were not failing before:\n');
  for (const f of regressions) process.stderr.write(`    ${f}\n`);
  process.stderr.write('\n  Do not push. Fix them, or record a new baseline deliberately.\n\n');
  process.exit(1);
}

process.stdout.write('  no new failures — safe to push.\n\n');
process.exit(0);
