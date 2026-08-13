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
 *
 * It deliberately reports files that were EXPECTED to fail and now pass, too — a
 * baseline that silently rots is the next version of this same problem.
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(HERE, '..', 'tests', 'known-failing-baseline.json');
const UPDATE = process.argv.includes('--update');

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

/** Failing FILES, not individual test names — test names churn, files are stable. */
function parseFailingFiles(out) {
  const files = new Set();
  for (const line of out.split('\n')) {
    const m = line.match(/^\s*FAIL\s+(\S+)/);
    if (m) files.add(m[1].replace(/\\/g, '/'));
  }
  return [...files].sort();
}

function parseTotals(out) {
  const m = out.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/);
  return m ? { failed: Number(m[1] || 0), passed: Number(m[2]) } : null;
}

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

if (regressions.length) {
  process.stderr.write('\n  REGRESSION — these files were not failing before:\n');
  for (const f of regressions) process.stderr.write(`    ${f}\n`);
  process.stderr.write('\n  Do not push. Fix them, or record a new baseline deliberately.\n\n');
  process.exit(1);
}

process.stdout.write('  no new failures — safe to push.\n\n');
process.exit(0);
