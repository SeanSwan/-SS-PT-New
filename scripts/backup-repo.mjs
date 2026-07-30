#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: backup-repo.mjs
 * PURPOSE: One verified, restorable file containing every commit in this repo.
 * ADDED: 2026-07-29 (after a near-miss that could have deleted the working tree)
 * ============================================================================
 *
 * WHY THIS EXISTS: 85 branches on this machine hold commits that exist NOWHERE else — not on
 * origin, not on any other disk. Measured 2026-07-29. A disk failure or one careless `rm -rf`
 * would end them. `git bundle --all` packs every ref and its full history into a SINGLE file that
 * `git clone` can restore from directly, so one file is a complete recovery point.
 *
 * WHY NOT DRIVE C: the C: drive was 96% full (44G of 931G) when this was written, and a backup on
 * the same disk as the original protects against exactly nothing. Default target is Z:, chosen
 * because it had 1.2T free. Override with SWAN_BACKUP_DIR.
 *
 * FAIL-CLOSED ON VERIFICATION — the load-bearing rule here. A corrupt bundle is WORSE than no
 * bundle, because it produces confidence that is not backed by a restorable artefact. So every
 * bundle must pass BOTH checks, and one that fails is DELETED rather than left on disk looking like
 * a backup. Exit 1 in that case, loudly.
 *
 *   1. `git bundle verify`  — header + prerequisite commits
 *   2. `git clone --bare`   — an ACTUAL RESTORE into a temp dir, then discarded
 *
 * Step 2 is not belt-and-braces, it is the only real check. Measured 2026-07-29: a bundle truncated
 * to 2MB of 499MB PASSES `git bundle verify` with exit 0, because verify never reads the packfile
 * body. The clone of that same file exits 128. A backup is only "verified" if something restored
 * from it.
 *
 * WHAT IT DOES NOT CAPTURE: uncommitted working-tree edits, untracked files, and anything in
 * .gitignore (.env, node_modules, the coordination/ and hermes-inbox/ local stores). This is a
 * backup of COMMITTED HISTORY. Uncommitted work is protected by committing it, not by this script.
 *
 * USAGE:
 *   node scripts/backup-repo.mjs                 # create + verify + prune
 *   node scripts/backup-repo.mjs --verify-only   # re-verify existing bundles, create nothing
 *   node scripts/backup-repo.mjs --keep 20       # retention (default 10)
 *   node scripts/backup-repo.mjs --help
 *
 * ENV: SWAN_BACKUP_DIR overrides the target directory.
 *
 * EXIT CODES: 0 = a verified bundle exists · 1 = verification FAILED (no trustworthy backup) ·
 *             2 = could not run (no git, target unwritable, out of space).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node scripts/backup-repo.mjs [--verify-only] [--keep N]');
  console.log('  Packs every ref + full history into one verified .bundle file.');
  console.log('  A bundle that fails verification is DELETED — a corrupt backup is worse than none.');
  console.log('  Target: $SWAN_BACKUP_DIR, else Z:/SwanStudios-backups (never the source disk).');
  console.log('  Exit 0 = verified backup exists, 1 = verification failed, 2 = could not run.');
  process.exit(0);
}

const verifyOnly = argv.includes('--verify-only');
const keepIdx = argv.indexOf('--keep');
const KEEP = keepIdx !== -1 && argv[keepIdx + 1] ? Math.max(1, Number(argv[keepIdx + 1])) : 10;
const DEST = process.env.SWAN_BACKUP_DIR || 'Z:/SwanStudios-backups';

function git(args, opts = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts,
  }).trim();
}

function human(bytes) {
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)}${u[i]}`;
}

/** Bundles this script produced, newest first. */
function existingBundles() {
  try {
    return fs.readdirSync(DEST)
      .filter((f) => f.startsWith('SS-PT-full-') && f.endsWith('.bundle'))
      .map((f) => ({ f, p: path.join(DEST, f), mtime: fs.statSync(path.join(DEST, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch { return []; }
}

/**
 * Verify a bundle. Trust the EXIT CODE, not the text.
 *
 * The first version of this matched /is okay/ against `execFileSync`'s return value — which is
 * stdout ONLY. `git bundle verify` prints its ref list to stdout and the "<file> is okay" line to
 * STDERR, so the pattern never matched, every bundle was judged corrupt, and the fail-closed branch
 * DELETED a perfectly valid 499MB backup. A safety mechanism that destroys the thing it protects is
 * worse than no safety mechanism.
 *
 * `git bundle verify` exits 0 for a complete, usable bundle and non-zero otherwise. That is the
 * whole signal; text parsing adds only a way to be wrong. spawnSync is used so both streams are
 * captured for the human-readable detail without either one deciding the verdict.
 */
function verify(bundlePath) {
  const r = spawnSync('git', ['bundle', 'verify', bundlePath], { encoding: 'utf8' });
  if (r.error) return { ok: false, detail: String(r.error.message).split('\n')[0] };
  const text = `${r.stdout || ''}\n${r.stderr || ''}`
    .split('\n').map((l) => l.trim()).filter(Boolean);
  // Keep the summary lines, not the ref dump, so a failure message stays readable.
  const detail = text.filter((l) => !/^[0-9a-f]{40}\s/.test(l)).slice(-2).join(' | ');
  return { ok: r.status === 0, detail };
}

/**
 * Prove the bundle can actually be RESTORED. This is the check that matters.
 *
 * `git bundle verify` is NOT an integrity check. Measured 2026-07-29: a bundle truncated to 2MB of
 * 499MB still exits 0, because verify only reads the header and confirms the prerequisite commits
 * exist in the LOCAL repo — it never touches the packfile body. A `git clone` from that same
 * truncated file exits 128.
 *
 * So the only honest way to call a backup "verified" is to restore from it. Clones bare (no working
 * tree) into a temp directory and deletes it immediately; costs roughly the bundle's size in scratch
 * space for the duration.
 */
function proveRestorable(bundlePath) {
  const scratch = path.join(DEST, `.restore-check-${process.pid}`);
  try {
    const r = spawnSync('git', ['clone', '--bare', '--quiet', bundlePath, scratch], {
      encoding: 'utf8', timeout: 15 * 60 * 1000,
    });
    if (r.status !== 0) {
      const why = `${r.stderr || r.stdout || ''}`.split('\n').filter(Boolean).slice(-1)[0] || 'clone failed';
      return { ok: false, detail: why.trim() };
    }
    // A clone that produced no refs is not a usable restore, even at exit 0.
    const heads = spawnSync('git', ['--git-dir', scratch, 'for-each-ref', '--format=%(refname)'],
      { encoding: 'utf8' });
    const n = (heads.stdout || '').split('\n').filter(Boolean).length;
    return n > 0
      ? { ok: true, detail: `restored ${n} refs from the bundle` }
      : { ok: false, detail: 'clone succeeded but produced ZERO refs' };
  } finally {
    try { fs.rmSync(scratch, { recursive: true, force: true }); } catch { /* scratch may not exist */ }
  }
}

function main() {
  console.log('\n=== repo backup (git bundle --all) ===');

  try {
    git(['rev-parse', '--git-dir']);
  } catch {
    console.error('  not a git repository — nothing to back up');
    process.exit(2);
  }

  if (verifyOnly) {
    const bundles = existingBundles();
    if (!bundles.length) {
      console.error(`  NO BUNDLES FOUND in ${DEST} — there is no backup to verify.`);
      process.exit(1);
    }
    let bad = 0;
    for (const b of bundles) {
      const v = verify(b.p);
      const rr = v.ok ? proveRestorable(b.p) : { ok: false, detail: v.detail };
      const ok = v.ok && rr.ok;
      console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${b.f}  (${human(fs.statSync(b.p).size)})`);
      if (!ok) { bad += 1; console.log(`        ${v.ok ? rr.detail : v.detail}`); }
    }
    console.log(bad ? `\n  ${bad} CORRUPT bundle(s) — do not rely on them\n` : '\n  all bundles verified\n');
    process.exit(bad ? 1 : 0);
  }

  try {
    fs.mkdirSync(DEST, { recursive: true });
    fs.accessSync(DEST, fs.constants.W_OK);
  } catch {
    console.error(`  target not writable: ${DEST}`);
    console.error('  set SWAN_BACKUP_DIR to a writable path on a DIFFERENT disk than the repo');
    process.exit(2);
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const bundlePath = path.join(DEST, `SS-PT-full-${stamp}.bundle`);

  const refCount = git(['for-each-ref', '--format=%(refname)']).split('\n').filter(Boolean).length;
  console.log(`  refs to pack : ${refCount}`);
  console.log(`  target       : ${bundlePath}`);

  try {
    execFileSync('git', ['bundle', 'create', bundlePath, '--all'], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (error) {
    console.error(`  bundle creation FAILED: ${String(error.message).split('\n')[0]}`);
    // Never leave a partial file that looks like a backup.
    try { fs.unlinkSync(bundlePath); } catch { /* nothing to clean */ }
    process.exit(2);
  }

  const size = fs.statSync(bundlePath).size;
  const v = verify(bundlePath);
  console.log(`  size         : ${human(size)}`);
  console.log(`  header check : ${v.ok ? 'OK' : 'FAILED'}`);

  // The header check alone is not integrity — see proveRestorable(). Only a real clone earns the
  // word "verified", so both must pass before this file is treated as a backup.
  const rr = v.ok ? proveRestorable(bundlePath) : { ok: false, detail: 'skipped — header check failed' };
  console.log(`  restore test : ${rr.ok ? `OK — ${rr.detail}` : 'FAILED'}`);

  if (!v.ok || !rr.ok) {
    // A corrupt bundle is worse than none: it is confidence with nothing behind it. Delete it.
    console.error(`        ${v.ok ? rr.detail : v.detail}`);
    try { fs.unlinkSync(bundlePath); console.error('  UNRESTORABLE bundle DELETED — you have no NEW backup (older ones untouched)'); } catch { /* */ }
    process.exit(1);
  }

  // Prune oldest, but only ever when a freshly VERIFIED bundle exists — so a failed run can never
  // leave the machine with fewer backups than it started with.
  const all = existingBundles();
  const stale = all.slice(KEEP);
  for (const s of stale) {
    try { fs.unlinkSync(s.p); console.log(`  pruned       : ${s.f}`); } catch { /* */ }
  }
  console.log(`  retained     : ${Math.min(all.length, KEEP)} bundle(s) (keep=${KEEP})`);
  console.log('\n  RESTORE:  git clone <bundle-file> <new-dir>');
  console.log('            (then `git remote set-url origin <real-url>`)\n');
  process.exit(0);
}

main();
