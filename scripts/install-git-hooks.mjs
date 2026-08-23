#!/usr/bin/env node
/**
 * install-git-hooks.mjs — point git at .githooks, and say so when it was not pointed there.
 *
 * WHY (GLM 5.3, panel 2026-08-23 — CONFIRMED by reproduction)
 * -----------------------------------------------------------
 * "Nothing in this system distinguishes 'gate passed' from 'gate not installed'."
 *
 * That is exactly right, and it was verified rather than accepted: a fresh clone of main has
 * `core.hooksPath` UNSET. A commit in that clone succeeded with the secret scan, the frontend
 * guards and the constitution guard ALL silently skipped — no warning, no signal, exit 0.
 *
 * `core.hooksPath` is per-clone local config. Git deliberately does not let a repository set
 * it on clone, because a repo that could install its own hooks could run arbitrary code on
 * checkout. So the gap cannot be closed by committing a file — something has to run.
 *
 * The failure this closes is not an attacker. It is entropy: every worktree, every fresh
 * clone, every CI checkout starts ungated and looks identical to a gated one. This session
 * alone created several such checkouts and configured each by hand without recognising that
 * the manual step WAS the defect.
 *
 * Wired as npm `prepare`, which runs after `npm install` — the one command every checkout
 * already runs before it is useful.
 *
 * IDEMPOTENT and SAFE:
 *   - already correct        -> silent, exit 0
 *   - unset                  -> set it, announce loudly, exit 0
 *   - set to something ELSE  -> do NOT overwrite; warn and exit 0
 *   - not a git repo / no .githooks -> exit 0 quietly (tarball installs, CI image builds)
 *
 * Never fails the install. A hook installer that breaks `npm install` is worse than the gap
 * it closes, and would simply be removed.
 *
 *   node scripts/install-git-hooks.mjs           # install if needed
 *   node scripts/install-git-hooks.mjs --check   # report only; exit 1 if hooks are NOT active
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const CHECK = process.argv.includes('--check');
const WANT = '.githooks';

const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

/** @returns {{state:'ok'|'unset'|'other'|'n/a', current:string|null}} */
export function hookState({ inRepo, hooksDirPresent, configured }) {
  if (!inRepo || !hooksDirPresent) return { state: 'n/a', current: configured };
  if (configured === WANT) return { state: 'ok', current: configured };
  if (!configured) return { state: 'unset', current: null };
  return { state: 'other', current: configured };
}

function main() {
  const inRepo = git('rev-parse', '--is-inside-work-tree') === 'true';
  const hooksDirPresent = existsSync(WANT);
  const configured = git('config', '--get', 'core.hooksPath');
  const { state, current } = hookState({ inRepo, hooksDirPresent, configured });

  if (state === 'n/a') {
    if (CHECK) console.log('[git-hooks] not a git checkout with .githooks — nothing to install.');
    process.exit(0);
  }

  if (state === 'ok') {
    if (CHECK) console.log('[git-hooks] active — core.hooksPath = .githooks');
    process.exit(0);
  }

  if (state === 'other') {
    console.error(`[git-hooks] core.hooksPath is "${current}", not "${WANT}". Leaving it alone —`);
    console.error('            overwriting someone\'s deliberate config is worse than the gap.');
    console.error(`            If that was not deliberate: git config core.hooksPath ${WANT}`);
    process.exit(CHECK ? 1 : 0);
  }

  // state === 'unset' — the confirmed failure case.
  if (CHECK) {
    console.error('[git-hooks] NOT ACTIVE. core.hooksPath is unset, so every pre-commit gate in');
    console.error('            .githooks/ is silently skipped in this checkout — including the');
    console.error('            secret scan. A commit here passes because nothing ran, not because');
    console.error('            it was checked.');
    console.error(`            Fix: npm run hooks:install   (or: git config core.hooksPath ${WANT})`);
    process.exit(1);
  }

  const done = git('config', 'core.hooksPath', WANT) !== null;
  if (done) {
    console.log(`[git-hooks] installed — core.hooksPath set to ${WANT}.`);
    console.log('            Before this, this checkout ran NO pre-commit gates: not the secret');
    console.log('            scan, not the frontend guards, not the constitution guard.');
  } else {
    console.error('[git-hooks] could not set core.hooksPath. Gates are NOT active in this checkout.');
    console.error(`            Run manually: git config core.hooksPath ${WANT}`);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
