#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: backend/scripts/audit-all.mjs
 * PURPOSE: One entrypoint that runs every audit and prints a single verdict.
 * ADDED: 2026-08-04 (Kimi review: "you built four verifiers and zero runners")
 * ============================================================================
 *
 * WHY. Four audits exist in this directory and each has its own name, flags and exit convention.
 * Six months from now nobody — possibly including whoever wrote them — remembers they are there.
 * A folder of good scripts that nothing invokes is indistinguishable from no scripts at all; that
 * is the same failure this repo already had with a database backup that never ran and a test suite
 * nothing executes.
 *
 * So: `npm run audit:all`. One command, one summary, one exit code.
 *
 * WHY IT DOES NOT USE `&&`. Chaining with `&&` stops at the first non-zero exit, so a known-red
 * audit (model-health currently exits 1 on 38 missing tables) would hide every audit after it. Each
 * one runs regardless; the summary reports all of them and the exit code is derived at the end.
 *
 * EXIT SEMANTICS — deliberately distinguishes two very different reds:
 *   0  every audit either passed or reported only its accepted baseline
 *   1  at least one audit found something NEW (a regression — this is the one to act on)
 *   2  at least one audit could not RUN (no DB, missing dep, crash). An audit that could not
 *      execute must never be reported as a pass, and must not be confused with one that found a
 *      problem — the fix is completely different.
 *
 * SAFETY: read-only. Delegates entirely to the individual audits, which query and parse but never
 * write. Takes minutes when the database audits are included, so it is a pre-push / CI tool rather
 * than something to run on every save.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node backend/scripts/audit-all.mjs [--fast] [--verbose]');
  console.log('  Runs every audit and prints one verdict. Read-only.');
  console.log('  --fast   skip the audits that need a live database connection');
  console.log('  Exit 0 = clean or baseline-only, 1 = NEW findings, 2 = an audit could not run.');
  process.exit(0);
}

const fast = argv.includes('--fast');
const verbose = argv.includes('--verbose');

const AUDITS = [
  { name: 'named-exports', script: 'audit-named-exports.mjs', needsDb: false },
  { name: 'idor-surface', script: 'audit-idor-surface.mjs', needsDb: false },
  { name: 'model-health', script: 'audit-model-health.mjs', needsDb: true },
  { name: 'write-paths', script: 'audit-write-paths.mjs', needsDb: true },
];

console.log('\n=== audit:all ===');
if (fast) console.log('  --fast: skipping database-backed audits\n');

const results = [];
for (const a of AUDITS) {
  if (fast && a.needsDb) {
    results.push({ ...a, status: 'skipped', code: null });
    continue;
  }
  const started = Date.now();
  const r = spawnSync(process.execPath, [path.join(HERE, a.script)], {
    encoding: 'utf8', timeout: 15 * 60 * 1000,
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);

  // A spawn that never produced an exit code (timeout, signal) is a RUN failure, not a finding.
  const code = r.status === null ? 2 : r.status;
  const status = code === 0 ? 'clean' : code === 1 ? 'findings' : 'could-not-run';
  results.push({ ...a, status, code, secs, out: r.stdout || '', err: r.stderr || '' });

  const label = { clean: 'OK  ', findings: 'NEW ', 'could-not-run': 'FAIL' }[status];
  console.log(`  ${label} ${a.name.padEnd(16)} exit=${code}  ${secs}s`);

  if (verbose || status !== 'clean') {
    // Show the audit's own summary lines rather than its full output — the point of a runner is
    // one screen, with a pointer to the individual tool for detail.
    const lines = (r.stdout || '').split('\n')
      .filter((l) => /NEW |CANNOT|BROKEN|MISSING|no NEW|AUDIT FAILED|could not connect|Accepted backlog/i.test(l))
      .slice(0, 6);
    for (const l of lines) console.log(`         ${l.trim()}`);
  }
}

const couldNotRun = results.filter((r) => r.status === 'could-not-run');
const withFindings = results.filter((r) => r.status === 'findings');
const skipped = results.filter((r) => r.status === 'skipped');

console.log('\n  ----------------------------------------');
console.log(`  clean          : ${results.filter((r) => r.status === 'clean').length}`);
console.log(`  NEW findings   : ${withFindings.length}${withFindings.length ? ` (${withFindings.map((r) => r.name).join(', ')})` : ''}`);
console.log(`  could NOT run  : ${couldNotRun.length}${couldNotRun.length ? ` (${couldNotRun.map((r) => r.name).join(', ')})` : ''}`);
if (skipped.length) console.log(`  skipped        : ${skipped.length} (--fast)`);

if (couldNotRun.length) {
  console.log('\n  An audit that could not RUN is not a pass. Fix the harness before trusting any');
  console.log('  result above — a broken check and a clean check look identical from a distance.\n');
  process.exit(2);
}
if (withFindings.length) {
  console.log('\n  NEW findings above are regressions against a recorded baseline. Run the named');
  console.log('  audit directly for detail, then fix or accept with --update-baseline.\n');
  process.exit(1);
}
console.log('\n  no NEW findings across any audit.\n');
process.exit(0);
