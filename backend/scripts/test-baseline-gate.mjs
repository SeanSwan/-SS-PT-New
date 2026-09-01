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
 * Exit 1 = a file that used to pass now fails, OR the run itself did not complete.
 * Exit 2 = usage / could not run.
 * Exit 3 = the suite is INCOMPLETE: files could not load because a declared dependency is
 *          missing. Nothing regressed; the remedy is an install, not an afternoon reading
 *          tests that never ran.
 *
 * It deliberately reports files that were EXPECTED to fail and now pass, too — a
 * baseline that silently rots is the next version of this same problem.
 *
 * ── AND FOR ITS WHOLE LIFE BEFORE 2026-08-31, IT ANSWERED WRONG ────────────────────────
 * vitest writes colour, and both parsers anchored on literal text with no escape sequences
 * in them. `parseTotals` returned null on every real run, the "did not produce a summary"
 * branch fired, and this exited 1 against every tree it was ever pointed at.
 *
 * It failed CLOSED, which is why it lasted: a gate stuck on FAIL is indistinguishable from
 * a red suite, and this suite IS red, so the wrong answer was the expected one. Nothing
 * shipped because of it. It simply stopped being a gate — the fate its own second paragraph
 * warns about. The parsers now live in ./lib/test-output-parsers.mjs with tests held
 * against real captured output, because a parser exercised only by the thing it checks
 * cannot be told from a broken one.
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFailingFiles, parseTotals, parseMissingPackages } from './lib/test-output-parsers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(HERE, '..', 'tests', 'known-failing-baseline.json');
const UPDATE = process.argv.includes('--update');

function runSuite() {
  return new Promise((resolve) => {
    // `--reporter dot` keeps output small; we parse the FAIL lines, not the summary.
    const p = spawn('npx', ['vitest', 'run', '--reporter', 'dot'], {
      cwd: join(HERE, '..'),
      shell: process.platform === 'win32',
      // Ask for plain output. Belt only: the parsers strip ANSI themselves, because an env
      // var that silently stops being honoured would return this gate to the state it spent
      // its entire life in. See the note on stripAnsi.
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    });
    let out = '';
    p.stdout.on('data', (c) => { out += c.toString(); });
    p.stderr.on('data', (c) => { out += c.toString(); });
    p.on('error', () => resolve({ out, code: -1 }));
    p.on('close', (code) => resolve({ out, code }));
  });
}

// The parsers live in ./lib/test-output-parsers.mjs. This file runs the suite at import
// time, so a test importing them from here would spawn vitest inside vitest.

const { out, code } = await runSuite();
const failing = parseFailingFiles(out);
const totals = parseTotals(out);

// A run that never produced a summary is NOT a pass — it is an unknown, and treating an
// unknown as success is how a broken suite reads as a clean one.
if (!totals) {
  process.stderr.write('\n  test-baseline-gate: the suite did not produce a summary — treating as FAILURE.\n');
  process.stderr.write(`  vitest exit code: ${code}\n\n`);
  process.stderr.write(`${out.split('\n').slice(-25).join('\n')}\n`);
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
const known = new Set(baseline);
const regressions = failing.filter((f) => !known.has(f));
const fixed = baseline.filter((f) => !failing.includes(f));

process.stdout.write(`\n  tests: ${totals.passed} passed, ${totals.failed} failed`
  + `  |  failing files: ${failing.length} (baseline ${baseline.length})\n`);

if (fixed.length) {
  // Not a failure — but a baseline nobody prunes becomes a place to hide new breakage.
  process.stdout.write('\n  these are in the baseline but now PASS — prune them:\n');
  for (const f of fixed) process.stdout.write(`    ${f}\n`);
}

// UNLOADABLE IS NOT FAILING, AND AN INSTALL IS NOT A REGRESSION. A file whose import throws
// `Cannot find package` never ran: no code changed, no test executed, and telling someone
// "do not push, fix them" sends them to read a test that is fine. It must not reach the
// baseline either — that turns a missing package into a permanent excuse the moment the
// package comes back.
const missing = parseMissingPackages(out);
const envBroken = regressions.filter((f) => missing.has(f));
const realRegressions = regressions.filter((f) => !missing.has(f));

if (envBroken.length) {
  const packages = [...new Set(envBroken.map((f) => missing.get(f)))].sort();
  process.stderr.write(`\n  ENVIRONMENT — ${envBroken.length} file(s) could not LOAD, because `
    + `${packages.length === 1 ? 'a declared dependency is' : 'declared dependencies are'} missing: ${packages.join(', ')}\n`);
  for (const f of envBroken) process.stderr.write(`    ${f}  (needs ${missing.get(f)})\n`);
  process.stderr.write('\n  These did not run, and are NOT regressions. Fix the install; do not baseline them.\n');
}

if (realRegressions.length) {
  process.stderr.write('\n  REGRESSION — these files were not failing before:\n');
  for (const f of realRegressions) process.stderr.write(`    ${f}\n`);
  process.stderr.write('\n  Do not push. Fix them, or record a new baseline deliberately.\n\n');
  process.exit(1);
}

if (envBroken.length) {
  // Still a refusal — a suite that could not load a dozen files has not been checked. But
  // the exit now says WHY, so the remedy is an install rather than an afternoon reading
  // tests that were never run.
  process.stderr.write('\n  Suite incomplete: fix the install, then re-run this gate.\n\n');
  process.exit(3);
}

process.stdout.write('  no new failures — safe to push.\n\n');
process.exit(0);
