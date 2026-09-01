#!/usr/bin/env node
/**
 * deps-restore.mjs — put back the packages a shared node_modules keeps losing.
 * ============================================================================
 *
 * ── WHAT THIS IS FOR ────────────────────────────────────────────────────────
 * Worktrees here share `node_modules` but not `package.json`. A dependency declared on a
 * newer branch is invisible to an install run from the checkout that OWNS the folder, so
 * it can be absent — or present only because someone installed it by hand, and therefore
 * one `npm ci` away from vanishing. The SessionStart drift gate (check 10) DETECTS both
 * states. This RESTORES them, in one command, without a branch move.
 *
 * It is the remedy half. Detection that leaves you to work out the fix is half a tool.
 *
 * ── THE TWO RULES THAT MAKE IT SAFE, AND WHY EACH EXISTS ────────────────────
 *
 * 1. NEVER `npm ci`. It deletes `node_modules` wholesale. On 2026-04 a shared folder was
 *    emptied mid-session and every agent's tests started failing for reasons none of them
 *    could see. `npm ci` is precisely that incident on demand. Only additive installs.
 *
 * 2. ALWAYS `--no-save`. Run from a worktree whose manifest is correct, npm would still
 *    write the dependency into whichever `package.json` sits in the working directory —
 *    and when that directory is the owning checkout, that is an edit to ANOTHER AGENT'S
 *    TREE ON THEIR BRANCH. It happened on 2026-09-01: npm added two lines to a tree with
 *    45 modified files and three live agents, and it had to be reverted from a backup.
 *    `--no-save` makes the write impossible rather than merely unlikely.
 *
 * Between them: the packages land on disk, no manifest anywhere changes, and no running
 * agent can be disrupted, because nothing is removed or replaced.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────
 * It does not move a branch, and it cannot make the condition permanently go away. The
 * real fix is the owning checkout returning to a branch that declares the packages —
 * `origin/main` already does. That is an operational act with other people's uncommitted
 * work at stake, so it belongs to a human choosing a moment, not to a script.
 *
 *   node scripts/deps-restore.mjs             # restore what is missing
 *   node scripts/deps-restore.mjs --dry-run   # say what it would do, change nothing
 */

import { readFileSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { classifyDeps } from './lib/dep-drift.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');

const readJson = (f) => {
  try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : null; } catch { return null; }
};

/** Resolve the way Node does, so a hoisted package is not reinstalled for nothing. */
export function resolvesFrom(startDir, name) {
  let dir = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, 'node_modules', name, 'package.json'))) return true;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return false;
}

export function ownerOf(dir) {
  const nm = join(dir, 'node_modules');
  try {
    if (!existsSync(nm) || !lstatSync(nm).isSymbolicLink()) return null;
    const ownerDir = dirname(realpathSync(nm));
    return resolve(ownerDir) === resolve(dir) ? null : ownerDir;
  } catch { return null; }
}

/**
 * Prefer the version the lockfile pins over the range the manifest allows.
 *
 * A range would let npm resolve something newer than the tree was tested against, on a
 * folder shared with every other worktree — a silent upgrade for everybody, arriving
 * through a repair script. Exact or nothing.
 */
export function pinnedVersion(dir, name, declaredRange) {
  const lock = readJson(join(dir, 'package-lock.json'));
  const entry = lock?.packages?.[`node_modules/${name}`];
  return entry?.version ? `${name}@${entry.version}` : `${name}@${declaredRange}`;
}

/**
 * ONLY WHEN RUN DIRECTLY. The helpers above are imported by a test, and everything below
 * spawns npm. Without this guard, importing `resolvesFrom` would start installing packages
 * into a folder shared with every other worktree — the exact class of accident this file
 * exists to prevent. Third time this trap has appeared today; the push gate and the
 * node:test runner both had it, and I only caught this one because the test I was writing
 * to prove the script printed "restored 0 packages" while merely being imported.
 */
const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
let installed = 0;
let atRiskTotal = 0;

for (const rel of ['backend', 'frontend', '.']) {
  const dir = resolve(ROOT, rel);
  const pkg = readJson(join(dir, 'package.json'));
  if (!pkg) continue;

  const declared = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (!Object.keys(declared).length) continue;

  const ownerDir = ownerOf(dir);
  const ownerPkg = ownerDir ? readJson(join(ownerDir, 'package.json')) : null;
  const ownerDeclared = ownerPkg
    ? new Set([...Object.keys(ownerPkg.dependencies || {}), ...Object.keys(ownerPkg.devDependencies || {})])
    : null;

  const { missing, atRisk } = classifyDeps({
    declared, isInstalled: (n) => resolvesFrom(dir, n), ownerDeclared,
  });

  const label = rel === '.' ? 'repo root' : rel;

  if (atRisk.length) {
    atRiskTotal += atRisk.length;
    process.stdout.write(
      `\n  ${label}: ${atRisk.length} package(s) present but declared in no manifest the owning\n`
      + `  checkout reads — ${atRisk.join(', ')}\n`
      + `  Shared with: ${ownerDir}\n`
      + '  These survive until the next clean install THERE. This script can put them back\n'
      + '  afterwards; only a branch move stops them going missing in the first place.\n'
    );
  }

  if (!missing.length) {
    process.stdout.write(`  ${label}: nothing missing\n`);
    continue;
  }

  const specs = missing.map((n) => pinnedVersion(dir, n, declared[n]));
  process.stdout.write(`\n  ${label}: ${missing.length} missing — ${specs.join(', ')}\n`);

  if (DRY) {
    process.stdout.write(`  would run (in ${dir}): npm install --no-save ${specs.join(' ')}\n`);
    continue;
  }

  // --no-save is not a preference here; see rule 2 in the header. Without it this writes
  // into whichever package.json is in `dir` — which may be another agent's, on their branch.
  const r = spawnSync('npm', ['install', '--no-save', ...specs], {
    cwd: dir, stdio: 'inherit', shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    process.stderr.write(`\n  ${label}: npm exited ${r.status}. Nothing was removed; re-run to retry.\n`);
    process.exitCode = 1;
    continue;
  }

  // TRUST THE FILESYSTEM, NOT THE EXIT CODE. npm exits 0 in situations that leave a
  // package unresolvable, and this whole class of bug is "something reported success and
  // the file was not there".
  const stillMissing = missing.filter((n) => !resolvesFrom(dir, n));
  if (stillMissing.length) {
    process.stderr.write(`\n  ${label}: npm reported success but ${stillMissing.join(', ')} still do(es) not resolve.\n`);
    process.exitCode = 1;
  } else {
    installed += missing.length;
    process.stdout.write(`  ${label}: restored ${missing.length} package(s), verified on disk\n`);
  }
}

process.stdout.write(
  `\n  ${DRY ? 'dry run — nothing changed' : `restored ${installed} package(s)`}`
  + `${atRiskTotal ? `; ${atRiskTotal} still at risk until the owning checkout moves branch` : ''}\n\n`
);
}
