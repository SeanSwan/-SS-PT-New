#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/backup-after-work.mjs
 * PURPOSE: Stop hook — keep a fresh, restorable backup without ever nagging.
 * ADDED: 2026-07-29 (Sean: back up after major work, and daily)
 * ============================================================================
 *
 * WHY: 85 branches on this machine hold commits that exist nowhere else. The repo is one bad
 * `rm -rf` or one disk failure from losing them, and this session came close enough to that to
 * matter.
 *
 * DESIGN — DELIBERATELY UNLIKE THE OTHER STOP HOOKS. The gates in this directory BLOCK, because
 * their job is to make the agent do something. A backup is not the agent's job; it should simply
 * happen. So this hook:
 *
 *   - NEVER blocks. It exits 0 on every path, including its own failure. A backup mechanism that
 *     interrupts work will be disabled by whoever it interrupts, and then there is no backup.
 *   - SPAWNS DETACHED and does not wait. The bundle plus its restore test takes a minute or two;
 *     making every Stop wait for that would be intolerable and would get it turned off.
 *   - IS DEBOUNCED. Runs only when commits landed since the last bundle AND the last bundle is older
 *     than MIN_HOURS. Backing up on every Stop would thrash a 500MB write for no gain.
 *   - IS SELF-HEALING. Because it checks bundle AGE rather than trusting a previous run, a backup
 *     that silently failed is simply retried on the next Stop. Nothing has to notice the failure.
 *
 * The one thing it says out loud is when there is NO usable backup at all, or the newest is very
 * old — because at that point silence is the dangerous option.
 *
 * VERIFICATION lives in backup-repo.mjs (header check + a real `git clone` restore test). This hook
 * only decides WHEN; it never judges whether a bundle is good.
 *
 * ENV: SWAN_BACKUP_DIR (target), SWAN_BACKUP_MIN_HOURS (debounce, default 6),
 *      SWAN_BACKUP_DISABLE=1 (skip entirely).
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const DEST = process.env.SWAN_BACKUP_DIR || 'Z:/SwanStudios-backups';
const MIN_HOURS = Number(process.env.SWAN_BACKUP_MIN_HOURS || 6);
const STALE_WARN_HOURS = 48;

// Exit 0 no matter what. Any throw here would surface as a hook error and interrupt the session,
// which is the one outcome guaranteed to get this hook removed.
function done(msg) {
  if (msg) process.stdout.write(`${msg}\n`);
  process.exit(0);
}

try {
  if (process.env.SWAN_BACKUP_DISABLE === '1') done(null);

  // Newest bundle and its age.
  let newest = null;
  try {
    const files = fs.readdirSync(DEST)
      .filter((f) => f.startsWith('SS-PT-full-') && f.endsWith('.bundle'))
      .map((f) => ({ f, m: fs.statSync(path.join(DEST, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    newest = files[0] || null;
  } catch { /* target missing/unreachable — handled below */ }

  const ageH = newest ? (Date.now() - newest.m) / 3_600_000 : Infinity;

  // Did anything land since that bundle? No commits means nothing new to protect.
  let commitsSince = 0;
  if (newest) {
    const since = new Date(newest.m).toISOString();
    const r = spawnSync('git', ['log', '--all', '--oneline', `--since=${since}`], {
      cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    commitsSince = (r.stdout || '').split('\n').filter(Boolean).length;
  }

  const noBackup = !newest;
  const due = noBackup || (ageH >= MIN_HOURS && commitsSince > 0);

  if (!due) done(null);

  // Fire and forget. `detached` + `unref` so the session is never held open by this.
  const child = spawn(process.execPath, [path.join(REPO, 'scripts', 'backup-repo.mjs')], {
    cwd: REPO, detached: true, stdio: 'ignore',
    env: { ...process.env, SWAN_BACKUP_DIR: DEST },
  });
  child.unref();

  if (noBackup) {
    done('[backup] No repo bundle found — started one now. '
      + `Target ${DEST}. Check with: npm run backup:verify`);
  }
  if (ageH >= STALE_WARN_HOURS) {
    done(`[backup] Newest bundle is ${Math.floor(ageH / 24)}d old — started a fresh one `
      + `(${commitsSince} commits since). If this keeps repeating, the backup is failing: npm run backup`);
  }
  done(`[backup] ${commitsSince} commits since the last bundle — backup started in the background.`);
} catch {
  // Never let a backup problem become a work-stopping error.
  process.exit(0);
}
