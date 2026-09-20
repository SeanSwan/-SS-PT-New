/**
 * ============================================================================
 * FILE: scripts/creator-brains/console/lib/instance.mjs
 * PURPOSE: The single-instance guard — one bridge per store, enforced by pid file.
 * PART OF: Creator Brains Console (blueprint 08 Operations, hostile finding H2)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS EXISTS. `registry.json` is a single file written by `setEnabled`. Two
 * bridges means two writers and no transaction, so the second write can silently
 * discard the first — a lost update that leaves no error and no log line. The
 * guard is what makes "one console at a time" a property of the system rather
 * than a convention Sean has to remember.
 *
 * WHY A STALE FILE MUST BE RECLAIMED. The opposite failure is worse than the one
 * being prevented: if a crashed bridge left a pid file behind and the guard
 * refused on any file it found, a single crash would lock Sean out of his own
 * console permanently, with the fix being "go delete this file by hand". So a
 * pid that is not alive is reclaimed silently.
 *
 * KNOWN LIMITATION, STATED RATHER THAN HIDDEN. The guard checks that the recorded
 * pid is ALIVE, not that it is the SAME process. On a long-lived machine, pid
 * reuse could in principle make the guard refuse while naming an unrelated
 * process. There is no portable way to bind a pid to an identity on Windows
 * without a heavier mechanism (job objects, a named mutex), and the practical
 * exposure is small: the window is "this exact pid was a bridge, then died, then
 * the OS recycled the pid, and Sean restarts the console". If that ever bites,
 * the fix is to record `process.startTime`-equivalent alongside the pid.
 *
 * The pid file is NOT protected by a lock. Two `startBridge` calls racing within
 * the same millisecond could both observe "absent" and both write. That race is
 * reachable only by a caller that starts two bridges concurrently in one process
 * — not by the real launch path (one `.cmd`, clicked once) — and it is recorded
 * here so the decision is visible rather than accidental.
 *
 * @module creator-brains/console/lib/instance
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, openSync, closeSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { paths } from '../../lib/paths.mjs';

/** The console's OWN state dir — NOT the engine's store. The engine is untouched. */
export function consoleDir(r) {
  return join(paths(r).base, 'console');
}

export function pidPath(r) {
  return join(consoleDir(r), 'bridge.pid');
}

/**
 * Is a pid actually alive? `process.kill(pid, 0)` sends no signal and only
 * probes. `EPERM` means the process exists but belongs to someone else — that
 * still counts as ALIVE, because from this guard's perspective the slot is taken.
 */
export function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

export class InstanceError extends Error {}

/**
 * Claim the bridge slot, or refuse naming the live holder.
 *
 * THE CLAIM ITSELF IS ATOMIC (fixed 2026-09-17 after HY4's P1). The first version
 * did `existsSync` → read → `writeFileSync`, which is a check-then-act race: two
 * bridges starting within the same millisecond both observe "absent" and both
 * write, and the loser's pid file names a process that is not the live bridge.
 * A later starter then sees a dead pid, reclaims the slot, and runs CONCURRENTLY
 * with the first bridge — two writers on one `registry.json`, which is exactly
 * the silent lost-update this guard exists to prevent.
 *
 * The fix is `openSync(file, 'wx')`: O_CREAT|O_EXCL, so the create-and-write is
 * a single atomic syscall and exactly one caller can win. `EEXIST` is the normal
 * "someone holds it" signal and is handled by the liveness check below.
 *
 * A stale file (holder is dead) is reclaimed — silently, because otherwise one
 * crash locks Sean out of his own console permanently.
 */
export function claimInstance(r, { pid = process.pid } = {}) {
  mkdirSync(consoleDir(r), { recursive: true });
  const file = pidPath(r);

  // The common path: an existing file, which we must judge as live or stale.
  if (existsSync(file)) {
    const prior = Number(String(readFileSync(file, 'utf8')).trim());
    if (isAlive(prior) && prior !== pid) {
      throw new InstanceError(
        `already running (pid ${prior}) — close that console window first`,
      );
    }
    // Stale (or ours already): remove it so the atomic create below can succeed.
    // A concurrent racer that beats us to this create still wins legitimately —
    // their pid file will be the one we then read and honour on our retry.
    try { rmSync(file, { force: true }); } catch { /* fall through to the create */ }
  }

  let fd;
  try {
    fd = openSync(file, 'wx');
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    // Lost the race between the stale-check and the create: the winner is
    // whoever's pid is now in the file. Honour it — do not clobber.
    const winner = Number(String(readFileSync(file, 'utf8')).trim());
    if (isAlive(winner) && winner !== pid) {
      throw new InstanceError(
        `already running (pid ${winner}) — close that console window first`,
      );
    }
    // The winner wrote a pid that is already dead — a genuinely stale race.
    // Retry once; a third party creating again here is pathological, and the
    // first bridge's own listen would fail loudly anyway.
    writeFileSync(file, String(pid), 'utf8');
    return pid;
  }
  try {
    writeFileSync(fd, String(pid), 'utf8');
  } finally {
    closeSync(fd);
  }
  return pid;
}

/**
 * Release only if we STILL OWN the slot. The ownership check is what stops a
 * shutting-down bridge from deleting a successor's pid file — without it, a slow
 * shutdown racing a fresh start would leave the new bridge unguarded.
 */
export function releaseInstance(r, { pid = process.pid } = {}) {
  try {
    const file = pidPath(r);
    if (!existsSync(file)) return;
    if (Number(String(readFileSync(file, 'utf8')).trim()) !== pid) return;
    unlinkSync(file);
  } catch {
    // Releasing is best-effort. A file left behind is reclaimed by the next
    // claim as long as its pid is dead, which is the same path a crash takes.
  }
}

/* ── the IN-PROCESS guard ────────────────────────────────────────────────────
 *
 * WHY A SECOND GUARD EXISTS WHEN THE PID FILE ALREADY DOES (hostile round 3,
 * 2026-09-18). `claimInstance` deliberately lets the same pid re-claim — it must,
 * or a restart inside one process would be impossible, and that behaviour is
 * pinned by a test. But that means the pid file CANNOT enforce "one bridge per
 * store" within a process: calling `startBridge` twice in one process produced
 * TWO live bridges on ONE store — precisely the silent lost-update on
 * `registry.json` this module exists to prevent. The pid file stops a second
 * PROCESS; nothing stopped a second CALL.
 *
 * The gap is not hypothetical: slice S7 embeds the bridge in SwanGuard, and an
 * in-process host is exactly the caller that can invoke `startBridge` twice (a
 * retry, a hot reload, a module initialised twice).
 *
 * The two guards are complementary, and both are required:
 *   pid file   → across processes (a second `.cmd` click)
 *   this map   → within a process (a second call)
 *
 * This also resolves the "same process, same millisecond" caveat noted in the
 * header: two concurrent `startBridge` calls in one process now collide on this
 * map instead of both writing the pid file.
 */
const liveBridges = new Map();

/** The bridge currently serving `key` in this process, or null. */
export function liveBridgeFor(key) {
  return liveBridges.get(key) ?? null;
}

/** Register a live bridge. Throws if this process already serves `key`. */
export function registerBridge(key, handle) {
  const existing = liveBridges.get(key);
  if (existing) {
    throw new InstanceError(
      `already running in this process on ${existing.url} — stop it before starting another`,
    );
  }
  liveBridges.set(key, handle);
  return handle;
}

/** Deregister on shutdown, but only if we still own the entry. */
export function unregisterBridge(key, handle) {
  if (liveBridges.get(key) === handle) liveBridges.delete(key);
}

/** Test seam: forget every in-process registration. */
export function resetBridgeRegistry() {
  liveBridges.clear();
}
