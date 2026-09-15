#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/lock.mjs
 * PURPOSE: One cross-process ownership protocol for the whole store.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair, HR14)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS EXISTS (reproduced defect HR14):
 *   `writeTextAtomic` renames a temp file over the target, which makes a single
 *   write crash-safe — and does nothing at all about TWO writers. The review
 *   reproduced both halves:
 *     - two runs on one store fetched the same video twice (budget and state
 *       both read before either wrote);
 *     - a second writer's newly added video disappeared when the first run saved
 *       its stale in-memory map over it (lost update).
 *   Every write in the old engine also used the SAME `<path>.tmp` name, so two
 *   processes could interleave on one temp file.
 *
 * THE PROTOCOL:
 *   1. Exclusive create of `<store>/.lock` with `wx`. That is the atomic test —
 *      not `existsSync` then write, which is a race.
 *   2. The lock body carries an owner token, pid, host and start time.
 *   3. A held lock is NEVER stolen on age alone. Reclaim requires positive
 *      evidence the owner is gone: same host AND the pid is not alive. An
 *      ambiguous owner (different host, or a pid we cannot probe) is reported
 *      as `ambiguous` and the caller must decide — the default is to refuse.
 *   4. Unique temp names (`<path>.<pid>.<rand>.tmp`) so two writers that do
 *      somehow overlap cannot corrupt one temp file.
 *
 * @module creator-brains/lock
 */

import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { ensureDir } from './paths.mjs';

export const LOCK_NAME = '.lock';

/** Locks older than this are only reclaimed with positive liveness evidence —
 *  never by age alone. Kept as a reporting threshold, not a steal timer. */
export const STALE_REPORT_MS = 6 * 3_600_000;

export class LockError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'LockError';
    this.detail = detail;
  }
}

export const lockPath = (r) => join(r, LOCK_NAME);

function readLock(r) {
  try {
    const raw = readFileSync(lockPath(r), 'utf-8');
    const doc = JSON.parse(raw);
    // A lock file we cannot parse is NOT assumed absent — it is ambiguous, and
    // stealing it is how two writers end up on one store.
    if (!doc || typeof doc !== 'object' || !doc.token) return { ambiguous: true, raw };
    return doc;
  } catch (e) {
    if (e && e.code === 'ENOENT') return null;
    return { ambiguous: true, error: e.message };
  }
}

/** Is a pid alive on THIS host? `EPERM` means alive-but-not-ours. */
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    if (e && e.code === 'EPERM') return true;
    return false;
  }
}

/**
 * Try to take the lock.
 * Returns `{ ok: true, token, release() }` or `{ ok: false, reason, holder }`.
 * Never throws for a held lock — that is a normal outcome for a second writer.
 */
export function acquireLock(r, { runId = null, now = () => Date.now() } = {}) {
  ensureDir(r);
  const token = randomUUID();
  const body = JSON.stringify({
    token, pid: process.pid, host: hostname(), runId, startedAt: new Date(now()).toISOString(),
  });

  const attempt = () => {
    const fd = openSync(lockPath(r), 'wx'); // atomic: fails if it exists
    try {
      writeSync(fd, body);
    } finally {
      closeSync(fd);
    }
  };

  try {
    attempt();
  } catch (e) {
    if (!e || e.code !== 'EEXIST') throw new LockError(`could not create lock: ${e && e.message}`, { code: e && e.code });
    const holder = readLock(r);

    if (holder && holder.ambiguous) {
      return { ok: false, reason: 'lock_ambiguous', holder: { unreadable: true } };
    }
    if (!holder) {
      // It vanished between EEXIST and read — a completed release. One retry.
      try { attempt(); } catch { return { ok: false, reason: 'lock_raced', holder: null }; }
    } else {
      const sameHost = holder.host === hostname();
      const alive = sameHost && pidAlive(holder.pid);
      if (alive) return { ok: false, reason: 'lock_held', holder };
      if (!sameHost) {
        // We cannot probe another host's pid. Do NOT steal on age.
        return { ok: false, reason: 'lock_other_host', holder };
      }
      // Same host, pid provably gone => the owner died without releasing.
      try { unlinkSync(lockPath(r)); } catch { /* someone else got there */ }
      try { attempt(); } catch { return { ok: false, reason: 'lock_raced', holder }; }
    }
  }

  let released = false;
  return {
    ok: true,
    token,
    holder: { pid: process.pid, host: hostname(), runId },
    release() {
      if (released) return false;
      released = true;
      // Only remove OUR lock. A reclaim by another process would have written a
      // new body, and deleting that would hand the store to a third writer.
      const cur = readLock(r);
      if (cur && !cur.ambiguous && cur.token !== token) return false;
      try { unlinkSync(lockPath(r)); return true; } catch { return false; }
    },
  };
}

/**
 * Run `fn` under the lock, releasing on every exit path including a throw.
 * `onBusy` decides what a second writer does: by default it refuses rather than
 * waiting, because a scheduled run queueing behind a manual run is how a store
 * gets two writers "safely" and a stale in-memory map.
 */
export async function withLock(r, fn, { runId = null, now = () => Date.now(), onBusy = null } = {}) {
  const lock = acquireLock(r, { runId, now });
  if (!lock.ok) {
    if (onBusy) return onBusy(lock);
    throw new LockError(
      `store is locked by another run (${lock.reason}${lock.holder && lock.holder.pid ? `, pid ${lock.holder.pid}` : ''})`,
      lock,
    );
  }
  try {
    return await fn(lock);
  } finally {
    lock.release();
  }
}

/** Describe the current holder without taking the lock — for `status`. */
export function lockStatus(r) {
  const holder = readLock(r);
  if (!holder) return { held: false };
  if (holder.ambiguous) return { held: true, ambiguous: true };
  const sameHost = holder.host === hostname();
  const alive = sameHost ? pidAlive(holder.pid) : null;
  const ageMs = Date.now() - Date.parse(holder.startedAt || 0);
  return {
    held: true,
    ...holder,
    sameHost,
    alive,
    ageMs: Number.isFinite(ageMs) ? ageMs : null,
    stale: Number.isFinite(ageMs) && ageMs > STALE_REPORT_MS,
  };
}
