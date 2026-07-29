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
 *   node scripts/check-main-parity.mjs --help            # usage only
 *
 * PATHS ARE REPO-RELATIVE, always — git paths are resolved from the repo root regardless of your
 * cwd. Run this from `backend/` and pass `models/User.mjs` and you get ABSENT, not ON-MAIN.
 *
 * Arguments and stdin are mutually exclusive: when arguments are present stdin is not read at all.
 * Reading it unconditionally hung the process whenever stdin was inherited rather than closed,
 * which is every non-interactive parent — CI, a shell script, another tool.
 *
 * EXIT CODES: 0 = every path is ON-MAIN (all findings real) · 1 = at least one is not
 *             (some findings are branch artefacts) · 2 = the check itself could not run.
 */

import { execFileSync } from 'node:child_process';

const REF = 'origin/main';

function git(args) {
  // stderr is piped, not inherited: a handled failure here prints its own clear message, and letting
  // git's raw `fatal: ...` through first makes a gracefully-handled case read like a crash.
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/**
 * Does a FILE exist at this rev?
 *
 * Must check the object TYPE, not merely existence. `git cat-file -e <rev>:<path>` succeeds for a
 * TREE as well as a blob, so passing a directory reported "ON-MAIN — finding is REAL" with full
 * confidence. Same failure class as the backslash bug: input that is not what the tool assumes,
 * silently given an authoritative-looking verdict. Only a blob is a file.
 */
function existsAt(rev, file) {
  try {
    const type = execFileSync('git', ['cat-file', '-t', `${rev}:${file}`], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return type === 'blob';
  } catch {
    return false;
  }
}

/**
 * Read piped paths. MUST NOT be called when arguments were supplied — see the call site.
 *
 * `isTTY` is false for any non-interactive parent (CI, a shell script, another tool), so awaiting
 * this with stdin merely inherited rather than closed blocks forever. Measured before the fix:
 * `check-main-parity <path>` returned exit 124 (killed by timeout) instead of a verdict — the tool
 * hung in its own primary use case.
 */
async function readStdin() {
  if (process.stdin.isTTY) return [];
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').split('\n');
}

async function main() {
  // `--help` exits 0, matching the audit scripts. Previously it fell through to the no-paths branch
  // and exited 2, so `tool --help || echo failed` reported a failure for a successful help request.
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('usage: node scripts/check-main-parity.mjs [--quiet] <repo-relative path>...');
    console.log('       <something listing paths> | node scripts/check-main-parity.mjs [--quiet]');
    console.log('  Classifies each path against origin/main so a stale branch cannot masquerade');
    console.log('  as a dead-file finding: ON-MAIN (real) / MAIN-DELETED (already cleaned up) /');
    console.log('  BRANCH-NEW (WIP) / ABSENT. --quiet prints only the real ones.');
    console.log('  Exit 0 = every path real, 1 = some are branch artefacts, 2 = check failed.');
    process.exit(0);
  }

  const quiet = process.argv.includes('--quiet');
  const argPaths = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  // Arguments win outright — do NOT touch stdin when they are present, or the process hangs.
  const stdinPaths = argPaths.length ? [] : await readStdin();

  const paths = [...argPaths, ...stdinPaths]
    // Tolerate list output that carries leading markers or surrounding whitespace.
    .map((p) => p.trim().replace(/^[-*\s]+/, ''))
    // Git only ever speaks forward slashes. On Windows `find`, `dir`, and most tooling emit
    // backslashes, and `git cat-file -e HEAD:backend\models\User.mjs` simply misses — which lands a
    // REAL finding in ABSENT and silently drops it. Failing in that direction is worse than not
    // running the check at all, because the output still looks authoritative.
    .map((p) => p.replace(/\\/g, '/'))
    .filter(Boolean);

  if (!paths.length) {
    // Say "repo-relative" explicitly: run from backend/ and type `models/User.mjs` and you get
    // ABSENT, because git paths are always relative to the repo root regardless of your cwd.
    console.error('usage: node scripts/check-main-parity.mjs <repo-relative path>... '
      + '(or pipe paths on stdin)');
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

  // Warn when the local ref is old. MAIN-DELETED and BRANCH-NEW both DISCARD a finding, so a stale
  // ref fails in the dangerous direction: a file that exists on the real main can be reported as
  // "main already removed this" and the finding is silently dropped. The ref is a local cache; git
  // never refreshes it on its own.
  let staleNote = '';
  try {
    const refAgeSec = Math.floor(Date.now() / 1000) - Number(git(['log', '-1', '--format=%ct', REF]));
    const hours = Math.floor(refAgeSec / 3600);
    if (hours >= 24) {
      staleNote = `  ⚠ ${REF} is ${Math.floor(hours / 24)}d old — run \`git fetch origin main\`;`
        + ' MAIN-DELETED verdicts may be wrong and they DISCARD findings.\n';
    } else {
      staleNote = `  ${REF} ref age: ${hours}h\n`;
    }
  } catch { staleNote = `  (could not determine ${REF} ref age)\n`; }

  console.log(`\n=== main-parity check (${paths.length} path(s) vs ${REF}) ===`);
  console.log(`  merge-base: ${base.slice(0, 12)}`);
  console.log(staleNote);

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
