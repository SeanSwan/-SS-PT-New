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
import fs from 'node:fs';

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

  // Warn when the local ref may be old. MAIN-DELETED and BRANCH-NEW both DISCARD a finding, so a
  // stale ref fails in the dangerous direction: a file that exists on the real main can be reported
  // as "main already removed this" and the finding is silently dropped. The ref is a local cache;
  // git never refreshes it on its own.
  //
  // "Old" is measured two ways and the fresher one wins. The tip commit's age alone claimed
  // "origin/main is 3d old — run git fetch" right after a fetch whenever main had simply been quiet
  // for 3 days — a false alarm that teaches people to ignore the one warning that matters.
  // FETCH_HEAD's mtime fixes that, but only counts when that last fetch actually included main:
  // fetching some other branch must not silence a warning about THIS ref going stale.
  let freshness = null;
  try {
    let ageSec = Math.floor(Date.now() / 1000) - Number(git(['log', '-1', '--format=%ct', REF]));
    let source = 'tip commit';
    try {
      // The main-line must belong to ORIGIN, not merely any remote: FETCH_HEAD records whatever
      // was fetched last, and a `branch 'main' of <some fork>` line would freshen this signal
      // while origin/main sits stale — the dangerous direction again. Both URL spellings are
      // normalized (https/ssh, trailing .git) and compared exactly; any mismatch just falls back
      // to tip-commit age, which only ever errs toward a louder warning.
      const norm = (u) => u.trim().replace(/\.git$/, '')
        .replace(/^[a-z+]+:\/\//, '').replace(/^git@/, '').replace(':', '/');
      const originUrl = norm(git(['config', '--get', 'remote.origin.url']));
      const fetchHead = git(['rev-parse', '--git-path', 'FETCH_HEAD']);
      const fetchedOriginMain = fs.readFileSync(fetchHead, 'utf8').split('\n').some((line) => {
        const m = line.match(/branch 'main' of (.+)$/);
        return m !== null && norm(m[1]) === originUrl;
      });
      if (fetchedOriginMain) {
        const fetchAgeSec = Math.floor((Date.now() - fs.statSync(fetchHead).mtimeMs) / 1000);
        if (fetchAgeSec < ageSec) { ageSec = fetchAgeSec; source = 'last fetch of origin/main'; }
      }
    } catch { /* no origin, never fetched, or FETCH_HEAD unreadable — tip-commit age stands */ }
    freshness = { hours: Math.floor(ageSec / 3600), source };
  } catch { /* freshness stays null and is reported as unknown below */ }

  const staleWarning = freshness && freshness.hours >= 24
    ? `⚠ ${REF} may be stale (${freshness.source} is ${Math.floor(freshness.hours / 24)}d old) — `
      + `run \`git fetch origin main\`; MAIN-DELETED verdicts may be wrong and they DISCARD findings.`
    : null;

  if (quiet) {
    // The warning matters MOST here: quiet mode is the machine-readable one feeding other tools,
    // where a wrong MAIN-DELETED verdict drops a finding with no human looking. It previously
    // exited before the staleness check ran at all. stderr keeps stdout clean for pipes.
    if (staleWarning) console.error(staleWarning);
    for (const f of buckets['ON-MAIN']) console.log(f);
    process.exit(buckets['ON-MAIN'].length === paths.length ? 0 : 1);
  }

  const staleNote = staleWarning
    ? `  ${staleWarning}\n`
    : freshness
      ? `  ${REF} freshness: ${freshness.hours}h (${freshness.source})\n`
      : `  (could not determine ${REF} freshness)\n`;

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
