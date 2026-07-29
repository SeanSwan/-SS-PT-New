#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: check-main-parity.mjs
 * PURPOSE: Tell you whether a "dead file" finding is real, or an artefact of
 *          working on a branch that is behind main.
 * ADDED: 2026-07-29 (continuous-cleanup loop; SWA-97)
 * ============================================================================
 *
 * THE PROBLEM THIS SOLVES: a file-level sweep on a stale branch cannot tell the difference between
 * "nobody uses this, delete it" and "main deleted this months ago and my branch still carries it."
 * Both look identical — unreferenced, unmounted, stale git log. Nothing about the file distinguishes
 * them.
 *
 * On this tree that is not a hypothetical: 695 files exist here that do not exist on origin/main.
 * A single dead-route sweep produced four findings and THREE were files main had already removed
 * (SWA-97). Without this check they would have been reported as cleanup work already done.
 *
 * WHAT IT REPORTS, per path:
 *   ON-MAIN       present on origin/main -> a finding here is real, act on it
 *   MAIN-DELETED  existed at the merge-base but main removed it -> your branch is stale, IGNORE
 *   BRANCH-NEW    created on this branch, never on main -> WIP, not dead code
 *   ABSENT        not on this branch either -> bad path
 *
 * MAIN-DELETED and BRANCH-NEW are both "do not report", but for different reasons, and the
 * distinction matters: the first means someone already did the cleanup, the second means the work
 * is unfinished. Collapsing them into "not on main" loses that.
 *
 * SAFETY: read-only. Runs `git cat-file -e` and `git merge-base`. Touches no working tree file.
 * Requires an up-to-date `origin/main` ref — run `git fetch origin main` first if it is stale.
 *
 * USAGE:
 *   node scripts/check-main-parity.mjs backend/routes/foo.mjs backend/routes/bar.mjs
 *   <something that lists paths> | node scripts/check-main-parity.mjs
 *   node scripts/check-main-parity.mjs --quiet <paths>   # print only the ON-MAIN ones
 *
 * EXIT CODES: 0 = every path is ON-MAIN (all findings real) · 1 = at least one is not
 *             (some findings are branch artefacts) · 2 = the check itself could not run.
 */

import { execFileSync } from 'node:child_process';

const REF = 'origin/main';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

/** `git cat-file -e <rev>:<path>` exits non-zero when the blob does not exist. */
function existsAt(rev, file) {
  try {
    execFileSync('git', ['cat-file', '-e', `${rev}:${file}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function readStdin() {
  if (process.stdin.isTTY) return [];
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').split('\n');
}

async function main() {
  const quiet = process.argv.includes('--quiet');
  const argPaths = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const paths = [...argPaths, ...(await readStdin())]
    // Tolerate list output that carries leading markers or surrounding whitespace.
    .map((p) => p.trim().replace(/^[-*\s]+/, ''))
    .filter(Boolean);

  if (!paths.length) {
    console.error('usage: node scripts/check-main-parity.mjs <path>... (or pipe paths on stdin)');
    process.exit(2);
  }

  let base;
  try {
    // Fail loudly rather than guessing: without the ref there is no parity question to answer,
    // and silently treating everything as ON-MAIN would re-introduce exactly the bug this prevents.
    git(['rev-parse', '--verify', `${REF}^{commit}`]);
    base = git(['merge-base', 'HEAD', REF]);
  } catch {
    console.error(`Could not resolve ${REF}. Run: git fetch origin main`);
    process.exit(2);
  }

  const buckets = { 'ON-MAIN': [], 'MAIN-DELETED': [], 'BRANCH-NEW': [], ABSENT: [] };

  for (const file of paths) {
    const onMain = existsAt(REF, file);
    if (onMain) { buckets['ON-MAIN'].push(file); continue; }
    if (!existsAt('HEAD', file)) { buckets.ABSENT.push(file); continue; }
    buckets[existsAt(base, file) ? 'MAIN-DELETED' : 'BRANCH-NEW'].push(file);
  }

  if (quiet) {
    for (const f of buckets['ON-MAIN']) console.log(f);
    process.exit(buckets['ON-MAIN'].length === paths.length ? 0 : 1);
  }

  console.log(`\n=== main-parity check (${paths.length} path(s) vs ${REF}) ===`);
  console.log(`  merge-base: ${base.slice(0, 12)}\n`);

  const note = {
    'ON-MAIN': 'finding is REAL — main has these too',
    'MAIN-DELETED': 'main already removed these — your branch is stale, IGNORE',
    'BRANCH-NEW': 'created on this branch, never on main — WIP, not dead code',
    ABSENT: 'not on this branch either — check the path',
  };

  for (const [bucket, files] of Object.entries(buckets)) {
    if (!files.length) continue;
    console.log(`  ${bucket} (${files.length}) — ${note[bucket]}`);
    for (const f of files) console.log(`    ${f}`);
    console.log('');
  }

  const real = buckets['ON-MAIN'].length;
  console.log(real === paths.length
    ? '  every path exists on main — no staleness artefacts\n'
    : `  ${paths.length - real} of ${paths.length} path(s) are branch artefacts, not findings\n`);

  process.exit(real === paths.length ? 0 : 1);
}

main().catch((error) => {
  console.error('check-main-parity failed:', error.message);
  process.exit(2);
});
